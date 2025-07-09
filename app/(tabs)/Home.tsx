import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from 'expo-status-bar';
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useState } from "react";
import { Animated, Image, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Divider, Modal, Portal, Text } from "react-native-paper";
import GolfScoreChart from "../components/GolfScoreChart";
import HandicapChart from "../components/HandicapChart";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

export default function HomeScreen() {
  const [userID, setUserID] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const fetchUserData = useCallback(async () => {
    if (userID === null) {
      setError("User ID is null");
      setLoading(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${BACKEND_URL}/api/player/${userID}/stats/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setUserData(data);
      setUsername(data.username || username);
      setError(null);
      setSuccess("Data updated");
      
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
    } catch (err) {
      console.error("Error fetching user data:", err);
      setError("Failed to fetch user data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userID, username]);

  const fetchUserProfilePicture = useCallback(async () => {
    if (userID === null) {
      setError("User ID is null");
      return;
    }
    const token = await AsyncStorage.getItem("authToken");
    try {
      const cacheBust = Date.now();
      const response = await fetch(`${BACKEND_URL}/api/user/${userID}/profile_picture/?cache=${cacheBust}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.profile_picture) {
        const imageUri = data.profile_picture.includes('?') 
          ? `${data.profile_picture}&_cache=${cacheBust}` 
          : `${data.profile_picture}?_cache=${cacheBust}`;
        
        setProfilePicture(imageUri);
        setForceRefresh(prev => prev + 1);
      }
    } catch (err) {
      console.error("Error fetching user profile picture:", err);
      setError("Failed to fetch profile picture");
    }
  }, [userID]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData();
  }, [fetchUserData]);

  useEffect(() => {
    async function getToken() {
      try {
        const token = await AsyncStorage.getItem("authToken");
        if (token) {
          const decodedToken: any = jwtDecode(token);
          setUserID(decodedToken.user_id);
          setUsername(decodedToken.username || "User");
        } else {
          setUserID(null);
          setError("No token found");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error decoding token:", err);
        setError("Failed to decode token");
        setLoading(false);
      }
    }
    
    getToken();
  }, []); 

  useEffect(() => {
    if (userID) {
      fetchUserData();
      fetchUserProfilePicture();
    }
  }, [userID, fetchUserData]);

  useEffect(() => {
    // Check if user has seen the latest "What's New"
    async function checkWhatsNew() {
      const currentVersion = Constants.expoConfig?.extra?.ver;
      const seenVersion = await AsyncStorage.getItem("lastSeenWhatsNewVersion") || "1.0.0";
      if (currentVersion && seenVersion !== currentVersion) {
        setShowWhatsNew(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    }
    checkWhatsNew();
  }, []);

  const handleCloseWhatsNew = async () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowWhatsNew(false);
    });
    
    const currentVersion = Constants.expoConfig?.extra?.ver;
    if (currentVersion) {
      await AsyncStorage.setItem("lastSeenWhatsNewVersion", currentVersion);
    }
  };

  return (
    <>
      {/* What's New Modal */}
      <Portal>
        <Modal 
          visible={showWhatsNew} 
          onDismiss={handleCloseWhatsNew} 
          contentContainerStyle={styles.whatsNewModalContainer}
        >
          <Animated.View style={{ opacity: fadeAnim, width: '100%', height: '100%' }}>
            <LinearGradient
              colors={['#000033', '#000080', '#000033']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.whatsNewGradient}
            >
              <ScrollView 
                style={styles.whatsNewScrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.whatsNewScrollContent}
                bounces={true}
              >
                <View style={styles.whatsNewHeader}>
                  <View style={styles.whatsNewIconContainer}>
                    <MaterialCommunityIcons name="rocket-launch" size={24} color="#FFD700" />
                  </View>
                  <Text style={styles.whatsNewTitle}>What's New in v1.0.2</Text>
                </View>
                
                <View style={styles.whatsNewContent}>
                  <Text style={styles.whatsNewHeadline}>
                    Major Updates & New Features
                  </Text>
                  
                  <Text style={styles.whatsNewDescription}>
                    We've been working hard to bring you the best golf tracking experience. Check out these exciting new features!
                  </Text>
                  
                  <View style={styles.featureList}>
                    <View style={styles.featureItem}>
                      <MaterialCommunityIcons name="account-circle" size={20} color="#4CAF50" style={styles.featureIcon} />
                      <View style={styles.featureTextContainer}>
                        <Text style={styles.featureTitle}>Enhanced Profile Pages</Text>
                        <Text style={styles.featureDescription}>View detailed stats, follow friends, and see activity feeds</Text>
                      </View>
                    </View>
                    
                    <View style={styles.featureItem}>
                      <MaterialCommunityIcons name="golf" size={20} color="#2196F3" style={styles.featureIcon} />
                      <View style={styles.featureTextContainer}>
                        <Text style={styles.featureTitle}>Smart Round Input</Text>
                        <Text style={styles.featureDescription}>GPS tracking, weather data, and auto-calculated GIR</Text>
                      </View>
                    </View>
                    
                    <View style={styles.featureItem}>
                      <MaterialCommunityIcons name="account-group" size={20} color="#FF9800" style={styles.featureIcon} />
                      <View style={styles.featureTextContainer}>
                        <Text style={styles.featureTitle}>Community Hub</Text>
                        <Text style={styles.featureDescription}>Share posts, photos, videos and connect with golfers</Text>
                      </View>
                    </View>
                    
                    <View style={styles.featureItem}>
                      <MaterialCommunityIcons name="brain" size={20} color="#9C27B0" style={styles.featureIcon} />
                      <View style={styles.featureTextContainer}>
                        <Text style={styles.featureTitle}>AI Golf Coach "Woody"</Text>
                        <Text style={styles.featureDescription}>Get personalized tips and swing analysis</Text>
                      </View>
                    </View>

                    <View style={styles.featureItem}>
                      <MaterialCommunityIcons name="weather-windy" size={20} color="#00BCD4" style={styles.featureIcon} />
                      <View style={styles.featureTextContainer}>
                        <Text style={styles.featureTitle}>Live Weather & Wind</Text>
                        <Text style={styles.featureDescription}>Real-time conditions and shot distance adjustments</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.whatsNewFooter}>
                    <Text style={styles.whatsNewFooterText}>
                      Explore the <Text style={styles.highlightText}>Community</Text> tab and updated <Text style={styles.highlightText}>Profile</Text> to see everything new!
                    </Text>
                  </View>
                  
                  <Button 
                    mode="contained" 
                    onPress={handleCloseWhatsNew}
                    style={styles.whatsNewButton}
                    labelStyle={styles.whatsNewButtonLabel}
                  >
                    Let's Go!
                  </Button>
                </View>
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        </Modal>
      </Portal>
      <StatusBar style="light" backgroundColor="#000026" />
      <View style={{flex: 1, backgroundColor: '#000026'}}>
        <LinearGradient 
          style={{flex: 1, width: '100%', height: '100%'}} 
          colors={['#000026', "#000080", '#000026']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }}
        >
          <ScrollView 
            style={{flex: 1}}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#ffffff"
                colors={["#ffffff"]}
              />
            }
          >
            <View style={styles.contentContainer}>
              <View style={styles.welcomeCard}>
                <View style={styles.welcomeContent}>
                  <View style={styles.profileSection}>
                    <View style={styles.profileImageWrapper}>
                      {profilePicture ? (
                        <Image 
                          key={`profile-${forceRefresh}`}  
                          source={{ 
                            uri: profilePicture,
                            cache: 'reload' 
                          }}
                          style={styles.profileImage}
                          resizeMode="cover"
                          onError={() => setProfilePicture(null)}
                        />
                      ) : (
                        <Image 
                          source={require("../../assets/default-profile.png")}
                          style={styles.profileImage}
                          resizeMode="cover"
                        />
                      )}
                    </View>
                    <View style={styles.welcomeTextContainer}>
                      <Text style={styles.welcomeText}>Welcome back,</Text>
                      <Text style={styles.usernameText}>{username} 👋</Text>
                    </View>
                  </View>
                </View>
              </View>
              
              {error && (
                <View style={styles.messageContainer}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#ff6b6b" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              
              {success && (
                <View style={styles.messageContainer}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#51cf66" />
                  <Text style={styles.successText}>{success}</Text>
                </View>
              )}
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#00BFFF" size="large" />
                  <Text style={styles.loadingText}>Loading your golf data...</Text>
                </View>
              ) : userData ? (
                <View style={styles.chartContainer}>
                  <HandicapChart/>
                  <Divider style={styles.chartDivider} />
                  <GolfScoreChart userData={userData} />
                </View>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <MaterialCommunityIcons name="golf" size={40} color="rgba(255,255,255,0.3)" />
                  <Text style={styles.emptyStateText}>
                    No golf data available yet
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Play a round and check back to see your statistics!
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 100, // Increased from 20 to 40 to bring content down
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  welcomeCard: {
    backgroundColor: 'rgba(0,0,60,0.7)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  welcomeContent: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  profileImageWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    borderRadius: 40,
    backgroundColor: '#000026',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#00BFFF',
  },
  welcomeTextContainer: {
    marginLeft: 18,
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  usernameText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  errorText: {
    color: "#ff6b6b",
    marginLeft: 8,
    fontSize: 15,
    flex: 1,
  },
  successText: {
    color: "#51cf66",
    marginLeft: 8,
    fontSize: 15,
    flex: 1,
  },
  chartContainer: {
    backgroundColor: 'rgba(0,0,60,0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chartDivider: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: 1,
    marginVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 15,
    opacity: 0.8,
  },
  emptyStateContainer: {
    backgroundColor: 'rgba(0,0,60,0.7)',
    borderRadius: 16,
    padding: 30,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // What's New Modal Styles
  whatsNewModalContainer: {
    backgroundColor: 'transparent',
    margin: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 191, 255, 0.5)',
    height: '85%',
  },
  whatsNewGradient: {
    borderRadius: 18,
    width: '100%',
    height: '100%',
  },
  whatsNewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,70,0.7)',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  whatsNewIconContainer: {
    marginRight: 12,
  },
  whatsNewTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  whatsNewScrollView: {
    height: '100%',
  },
  whatsNewScrollContent: {
    paddingBottom: 40,
  },
  whatsNewContent: {
    padding: 24,
    paddingTop: 0,
  },
  whatsNewHeadline: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00BFFF',
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  whatsNewDescription: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  featureList: {
    width: '100%',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIcon: {
    marginRight: 14,
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  featureDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 18,
  },
  featureText: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  whatsNewFooter: {
    backgroundColor: 'rgba(0, 191, 255, 0.15)',
    padding: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  whatsNewFooterText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  highlightText: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  whatsNewButton: {
    backgroundColor: "#00BFFF",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 20,
    elevation: 3,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  whatsNewButtonLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
    textTransform: 'none',
  },
});