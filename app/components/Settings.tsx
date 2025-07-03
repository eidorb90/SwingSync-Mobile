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
import { Button, Modal, Provider as PaperProvider, Portal, Text, TextInput } from "react-native-paper";

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
  const [bio, setBio] = useState<string>("");
  const [bioModalVisible, setBioModalVisible] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [bioSaving, setBioSaving] = useState(false);

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
      }
      if (data.first_name) {
        setFirstName(data.first_name)
      }
      if (data.last_name) {
        setLastName(data.last_name)
      }
      if (data.bio) {
        setBio(data.bio);
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

  // Save bio to backend
  const saveBio = async () => {
    if (!userID || !token) return;
    setBioSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/${userID}/settings/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bio: bioInput }),
      });
      if (!response.ok) throw new Error("Failed to update bio");
      setBio(bioInput);
      setBioModalVisible(false);
    } catch (e) {
      console.error("Error updating bio:", e);
      setError("Failed to update bio");
    } finally {
      setBioSaving(false);
    }
  };

  return (
    <PaperProvider>
      <Portal>
        {/* Bio Edit Modal */}
        <Modal
          visible={bioModalVisible}
          onDismiss={() => setBioModalVisible(false)}
          contentContainerStyle={{
            backgroundColor: "#181848",
            padding: 28,
            margin: 24,
            borderRadius: 18,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 12,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 20, marginBottom: 16, fontWeight: "bold" }}>Edit Bio</Text>
          <TextInput
            mode="outlined"
            value={bioInput}
            onChangeText={setBioInput}
            placeholder="Enter your bio"
            multiline
            style={{ width: "100%", backgroundColor: "#232366", color: "#fff", marginBottom: 16 }}
            outlineColor="#1a1aff"
            activeOutlineColor="#00BFFF"
            theme={{ colors: { text: "#fff", placeholder: "#aaa" } }}
          />
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
            <Button
              mode="contained"
              onPress={saveBio}
              loading={bioSaving}
              disabled={bioSaving}
              buttonColor="#00BFFF"
              style={{ flex: 1, marginRight: 8, borderRadius: 8 }}
            >
              Save
            </Button>
            <Button
              mode="outlined"
              onPress={() => setBioModalVisible(false)}
              textColor="#fff"
              style={{ flex: 1, borderColor: "#fff", marginLeft: 8, borderRadius: 8 }}
            >
              Cancel
            </Button>
          </View>
        </Modal>
      </Portal>
      <>
        <StatusBar style="light" backgroundColor="#000026" />
        <View style={{flex: 1, backgroundColor: '#000026'}}>
          <LinearGradient 
            style={{flex: 1, width: '100%', height: '100%'}} 
            colors={['#000026', "#000080", '#000026']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
          >
            <ScrollView 
              style={styles.container} 
              contentContainerStyle={{paddingBottom: 40, flexGrow: 1, justifyContent: 'flex-start'}}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Settings</Text>
              </View>
              
              {/* Profile Card */}
              <View style={styles.card}>
                <View style={styles.profileRow}>
                  <View style={styles.profilePictureContainer}>
                    {profilePicture ? (
                      <Image
                        key={`profile-${forceRefresh}`}
                        source={{ uri: profilePicture, cache: 'reload' }}
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
                    <TouchableOpacity 
                      style={styles.editButton} 
                      onPress={() => router.push("/ChangeProfilePicture")}
                      accessibilityLabel="Edit Profile Picture"
                    >
                      <MaterialCommunityIcons name="pencil" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.nameText}>{firstName} {lastName}</Text>
                    <Text style={styles.usernameText}>@{username}</Text>
                    <View style={styles.bioRow}>
                      <Text style={styles.bioText} numberOfLines={2}>
                        {bio || "No bio available"}
                      </Text>
                      <TouchableOpacity
                        style={styles.bioEditButton}
                        onPress={() => {
                          setBioInput(bio);
                          setBioModalVisible(true);
                        }}
                        accessibilityLabel="Edit Bio"
                      >
                        <MaterialCommunityIcons name="pencil" size={15} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* Section: Account */}
              <Text style={styles.sectionHeader}>Account</Text>
              <View style={styles.card}>
                <TouchableOpacity style={styles.settingsItem} onPress={redirectToAccountSettings}>
                  <MaterialCommunityIcons name="account-cog-outline" size={20} color="#00BFFF" style={{marginRight: 12}} />
                  <Text style={styles.settingsItemText}>Account Settings</Text>
                </TouchableOpacity>
                <View style={styles.dividerLine} />
                <TouchableOpacity style={styles.settingsItem} onPress={() => router.push("/ChangeProfilePicture")}>
                  <MaterialCommunityIcons name="image-edit-outline" size={20} color="#00BFFF" style={{marginRight: 12}} />
                  <Text style={styles.settingsItemText}>Change Profile Picture</Text>
                </TouchableOpacity>
              </View>

              {/* Section: Legal */}
              <Text style={styles.sectionHeader}>Legal & Support</Text>
              <View style={styles.card}>
                <TouchableOpacity style={styles.settingsItem} onPress={() => {linkTo('https://swing-sync.com/PrivacyPolicy')}}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#00BFFF" style={{marginRight: 12}} />
                  <Text style={styles.settingsItemText}>Privacy Policy</Text>
                </TouchableOpacity>
                <View style={styles.dividerLine} />
                <TouchableOpacity style={styles.settingsItem} onPress={() => {linkTo('https://swing-sync.com/TOS')}}>
                  <MaterialCommunityIcons name="file-document-outline" size={20} color="#00BFFF" style={{marginRight: 12}} />
                  <Text style={styles.settingsItemText}>Terms of Service</Text>
                </TouchableOpacity>
                <View style={styles.dividerLine} />
                <TouchableOpacity style={styles.settingsItem} onPress={() => {Linking.openURL('mailto:support@swing-sync.com')}}>
                  <MaterialCommunityIcons name="help-circle-outline" size={20} color="#00BFFF" style={{marginRight: 12}} />
                  <Text style={styles.settingsItemText}>Help & Support</Text>
                </TouchableOpacity>
              </View>

              {/* Logout */}
              <View style={styles.logoutSection}>
                <Button 
                  mode="contained" 
                  buttonColor="#d9534f"
                  textColor="#ffffff"
                  onPress={clearToken} 
                  style={styles.logoutButton}
                  icon="logout"
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
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  header: {
    marginTop: 40,
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: 'rgba(0,0,60,0.85)',
    borderRadius: 16,
    marginHorizontal: 18,
    marginBottom: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePictureContainer: {
    position: 'relative',
    marginRight: 18,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#00BFFF',
    backgroundColor: '#181848',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00BFFF',
    width: 28,
    height: 28,
    borderRadius: 14,
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
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  usernameText: {
    fontSize: 15,
    color: '#00BFFF',
    fontWeight: '600',
    marginBottom: 6,
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bioText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    flex: 1,
    fontStyle: 'italic',
  },
  bioEditButton: {
    marginLeft: 8,
    backgroundColor: "#232366",
    borderRadius: 10,
    padding: 4,
  },
  sectionHeader: {
    color: '#00BFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 28,
    marginBottom: 4,
    marginTop: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 2,
  },
  settingsItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 2,
    marginLeft: 32,
  },
  logoutSection: {
    marginTop: 18,
    marginBottom: 10,
    alignItems: 'center',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 10,
    minWidth: 180,
    elevation: 2,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: '600',
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 30,
    fontSize: 13,
    letterSpacing: 0.5,
  },
});