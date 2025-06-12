import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { createContext, useContext, useEffect, useState } from 'react';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const signUp = async (firstName, lastName, age, location, email, username, password, confirmPassword) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/user/signup/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          first_name: firstName,
          last_name: lastName,
          email: email,
          password: password,
        })
      });

      if (response.ok) {
        setLoading(false);
        console.log("Sign up successful!");
        setNeedsVerification(true);
        router.replace("/verify");
        return null;
      }
      else {
        setLoading(false);
        setNeedsVerification(false);
        
        const errorData = await response.json();
        console.log("Backend error response:", errorData);
        
        let errorMessage = "An unknown error occurred during sign up.";
        
        if (typeof errorData === 'object' && errorData !== null) {
          if (errorData.username && errorData.username.length > 0) {
            errorMessage = errorData.username[0];
          } else if (errorData.email && errorData.email.length > 0) {
            errorMessage = errorData.email[0];
          } else if (errorData.password && errorData.password.length > 0) {
            errorMessage = errorData.password[0];
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        }
        
        return errorMessage;
      }

    } catch (error) {
      setLoading(false);
      setNeedsVerification(false);
      if (error instanceof Error) {
        console.error("Network or unexpected sign up error:", error.message);
        return "Network error: " + error.message;
      }
      console.error("An unexpected error occurred during sign up:", error);
      return "An unexpected error occurred during sign up.";
    }
  };

  const signIn = async (username, password) => {
    const credentials = {
      username: username,
      password: password
    };

    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/user/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (response.status === 200) {
        setLoading(false);
        console.log("Sign in successful");
        const data = await response.json();
        await AsyncStorage.setItem("authToken", data.access);
        setIsAuthenticated(true);
        setNeedsVerification(false);
        return null;
      } else if (response.status === 401) {
        setLoading(false);
        setNeedsVerification(true); 
        return "UNVERIFIED_ACCOUNT";
      } else {
        setLoading(false);
        setNeedsVerification(false);
        
        const errorData = await response.json();
        console.log("Backend error response:", errorData);
        
        let errorMessage = "An unknown error occurred during sign in.";
        
        if (typeof errorData === 'object' && errorData !== null) {
          if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.non_field_errors && errorData.non_field_errors.length > 0) {
            errorMessage = errorData.non_field_errors[0];
          }
        }
        
        return errorMessage;
      }

    } catch (error) {
      setLoading(false);
      setNeedsVerification(false);
      if (error instanceof Error) {
        return "Network error: " + error.message;
      }
      console.error("An unexpected error occurred during sign in:", error);
      return "An unexpected error occurred during sign in.";
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        setIsAuthenticated(!!token);
        setNeedsVerification(false); 
      } catch (e) {
        console.error("Failed to load auth token from AsyncStorage", e);
        setIsAuthenticated(false);
        setNeedsVerification(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, needsVerification, signUp, signIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}