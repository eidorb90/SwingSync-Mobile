import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;


export type AuthContextType = {
  isAuthenticated: boolean;
  loading: boolean;
  needsVerification: boolean;
  signIn: (username: string, password: string) => Promise<string | null>;
  signUp: (firstName: string, lastName: string, age: string, location: string, email: string, username: string, password: string, confirmPassword: string) => Promise<string | null>;
  signOut: () => Promise<void>; 
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [needsVerification, setNeedsVerification] = useState(false);
    const [loading, setLoading] = useState(true);
    const [shouldAutoNavigate, setShouldAutoNavigate] = useState(true);
    const router = useRouter();

    const signUp = async (firstName: string, lastName: string, age: string, location: string, email: string, username: string, password: string, confirmPassword: string) => {
        try {
            setLoading(true);
            setShouldAutoNavigate(false); 
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
                setShouldAutoNavigate(true); 
                return null; 
            }
            else {
                setLoading(false);
                setNeedsVerification(false);
                setShouldAutoNavigate(true); 

                const errorData = await response.json();
                console.log("Backend error response:", errorData);

                let errorMessage = "An unknown error occurred during sign up.";

                if (typeof errorData === 'object' && errorData !== null) {
                    if (errorData.username && errorData.username.length > 0) {
                        if (errorData.username[0].includes("already exists")) {
                            errorMessage = "This username is already taken. Please choose another.";
                        } else {
                            errorMessage = errorData.username[0];
                        }
                    } else if (errorData.email && errorData.email.length > 0) {
                        if (errorData.email[0].includes("already exists")) {
                            errorMessage = "This email is already registered. Please login or use a different email.";
                        } else {
                            errorMessage = errorData.email[0];
                        }
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
            setShouldAutoNavigate(true);
            if (error instanceof Error) {
                console.error("Network or unexpected sign up error:", error.message);
                return "Network error: " + error.message;
            }
            console.error("An unexpected error occurred during sign up:", error);
            return "An unexpected error occurred during sign up.";
        }
    };

    const signIn = async (username: string, password: string) => {
        const credentials = {
            username: username,
            password: password
        };

        try {
            setLoading(true);
            setShouldAutoNavigate(false); 
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
                setShouldAutoNavigate(true);
                return null; 
            } else if (response.status === 401) {
                setLoading(false);
                const errorData = await response.json();
                if (errorData.detail === "Account is not verified.") {
                    setNeedsVerification(true);
                    setShouldAutoNavigate(true); 
                    return "UNVERIFIED_ACCOUNT"; 
                } else {
                    setNeedsVerification(false);
                    setShouldAutoNavigate(true); 
                    return errorData.detail || "Invalid credentials.";
                }
            } else if (response.status === 403) {
                setLoading(false);
                setNeedsVerification(false);
                setShouldAutoNavigate(false); 
                await AsyncStorage.removeItem("authToken"); 
                setIsAuthenticated(false);
                return "Invalid credentials.";
            } else {
                setLoading(false);
                setNeedsVerification(false);
                setShouldAutoNavigate(true);

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
            setShouldAutoNavigate(true);
            if (error instanceof Error) {
                return "Network error: " + error.message;
            }
            console.error("An unexpected error occurred during sign in:", error);
            return "An unexpected error occurred during sign in.";
        }
    };

    const signOut = async () => {
        try {
            await AsyncStorage.removeItem("authToken");
            setIsAuthenticated(false);
            setNeedsVerification(false);
            router.replace("/auth");
        } catch (error) {
            console.error("Error signing out:", error);
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

    useEffect(() => {
        if (!loading && shouldAutoNavigate) {
            if (isAuthenticated) {
                router.replace("/Home"); 
            } else if (needsVerification) {
                router.replace("/verify"); 
            }
      
        }
    }, [isAuthenticated, needsVerification, loading, shouldAutoNavigate, router]);

    return (
        <AuthContext.Provider value={{ isAuthenticated, loading, needsVerification, signUp, signIn, signOut }}>
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