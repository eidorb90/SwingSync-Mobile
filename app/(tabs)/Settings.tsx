import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { linkTo } from "expo-router/build/global-state/routing";
import { StatusBar } from 'expo-status-bar';
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useState } from "react";
import { Image, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Divider, Text } from "react-native-paper";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

export default function SettingsScreen() {
  const [userID, setUserID] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null); 
  const [username, setUsername] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [userData, setUserData] = useState<any>(null);
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [changePFP, setChangePFP] = useState<boolean>(false);
  const [imageTimestamp, setImageTimestamp] = useState<string>(Date.now().toString());
  const [forceRefresh, setForceRefresh] = useState(0);

  const router = useRouter();

  const redirectToAuth = () => {
    router.push("/auth");
  };

  useEffect(() => {
    fetchTokenAndSetUserID();
  }, []);
  
  useEffect(() => {
    if (userID && token) {
      fetchUserData();
      fetchUserProfilePicture();
    }
  }, [userID, token]);
  
  useFocusEffect(
    useCallback(() => {
      const refreshProfilePicture = async () => {
        const latestTimestamp = await AsyncStorage.getItem('profileImageTimestamp');
        const ts = latestTimestamp || Date.now().toString();
        setImageTimestamp(ts);
        fetchUserProfilePicture();
      };
      refreshProfilePicture();
    }, [userID, token])
  );

  const fetchTokenAndSetUserID = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("authToken");
      if (storedToken) {
        setToken(storedToken);
        const decoded: any = jwtDecode(storedToken);
        setUserID(decoded.user_id);
        setUsername(decoded.username || "User");
      } else {
        redirectToAuth();
      }
    } catch (e) {
      console.error("Failed to fetch token:", e);
      redirectToAuth();
    } finally {
      setLoading(false);
    }
  }
  
  const clearToken = async () => {
    try {
      await AsyncStorage.removeItem("authToken");
      setToken(null);
      setUserID(null);
      console.log("Token cleared");
      redirectToAuth();
    } catch (e) {
      console.error("Failed to clear token:", e);
    }
  };

  const fetchUserData = useCallback(async () => {
    if (userID === null || token === null) {
      setError("User ID or token is null");
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/user/${userID}/settings/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.username) {
        setUsername(data.username);
        setUserData(data);
        console.log("User data fetched successfully:", data);
      }
      if (data.first_name) {
        setFirstName(data.first_name)
      }
      if (data.last_name) {
        setLastName(data.last_name)
      }

    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to fetch user data");
    }
  }, [userID, token]);

  const fetchUserProfilePicture = async () => {
    if (!userID || !token) return;
    
    try {
      const cacheBust = new Date().getTime();
      const response = await fetch(`${BACKEND_URL}/api/user/${userID}/profile_picture/?cache=${cacheBust}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.profile_picture) {
          const imageUri = data.profile_picture.includes('?') 
            ? `${data.profile_picture}&_cache=${cacheBust}` 
            : `${data.profile_picture}?_cache=${cacheBust}`;
          
          console.log("Setting profile picture with cache busting:", imageUri);
          setProfilePicture(imageUri);
          
          setForceRefresh(prev => prev + 1);
        } else {
          setProfilePicture(null);
        }
      } else {
        console.error("Error response from profile picture API:", response.status);
        setProfilePicture(null);
      }
    } catch (error) {
      console.error("Error fetching profile picture:", error);
      setProfilePicture(null);
    }
  };

  const redirectToAccountSettings = () => {
    router.push("/AccountSettings")
  }

  return (
    <>
      <StatusBar style="light" backgroundColor="#000026" />
      <View style={{flex: 1, backgroundColor: '#000026'}}>
        <LinearGradient 
          style={{flex: 1, width: '100%', height: '100%'}} 
          colors={['#000026', "#000080", '#000026']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }}
        >
          <ScrollView style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Settings</Text>
            </View>
            
            <View style={styles.profileSection}>
                <View style={styles.profilePictureContainer}>
                  {profilePicture ? (
                    <Image
                      key={`profile-${forceRefresh}`}
                      source={{ 
                        uri: profilePicture,
                        cache: 'reload'
                      }}
                      style={styles.profilePicture}
                      resizeMode="cover"
                      onError={(e) => {
                        console.error("Image loading error:", e.nativeEvent.error);
                        setProfilePicture(null);
                      }}
                    />
                  ) : (
                    <Image
                      source={require("../../assets/default-profile.png")}
                      style={styles.profilePicture}
                      resizeMode="cover"
                    />
                  )}
                  
                  {/* Edit icon button */}
                  <TouchableOpacity 
                    style={styles.editButton} 
                    onPress={() => router.push("/ChangeProfilePicture")}
                  >
                    <MaterialCommunityIcons name="pencil" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>

              <Text style={styles.title}>{firstName} {lastName}</Text>
              <Text style={styles.username}>@{username}</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.settingsSection}>

              <TouchableOpacity style={styles.settingsItem}>
                <Text style={styles.settingsItemText} onPress={redirectToAccountSettings}>
                  Account Settings
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingsItem}>
                <Text onPress={ () => {linkTo('https://swing-sync.com/PrivacyPolicy')} } style={styles.settingsItemText}>Privacy Policy</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingsItem}>
                <Text onPress={ () => {linkTo('https://swing-sync.com/TOS')} } style={styles.settingsItemText}>Terms of Service</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingsItem}>
                <Text
                  onPress={() => {
                  Linking.openURL('mailto:support@swing-sync.com');
                  }}
                  style={styles.settingsItemText}
                >
                  Help & Support
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.buttonContainer}>
              <Button 
                mode="contained" 
                buttonColor="#d9534f"
                textColor="#ffffff"
                onPress={clearToken} 
                style={styles.logoutButton}
              >
                Logout
              </Button>
            </View>
            
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            
            <Text style={styles.versionText}>SwingSync v1.0.0</Text>
          </ScrollView>
        </LinearGradient>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 40,
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#fff',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1a1aff',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 15,
  },
  divider: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    height: 1,
    marginVertical: 20,
  },
  settingsSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 30,
  },
  settingsItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsItemText: {
    color: '#fff',
    fontSize: 16,
  },
  buttonContainer: {
    marginVertical: 20,
  },
  logoutButton: {
    padding: 5,
    borderRadius: 8,
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    marginVertical: 10,
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
});