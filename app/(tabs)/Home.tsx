import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from 'expo-status-bar';
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useState } from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
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
          <ScrollView 
            style={{flex: 1}}
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 80,
              justifyContent: 'center', 
            }}
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
              <View style={styles.headerContainer}>
                <Text style={styles.title}>
                  Welcome Back {username} 👋
                </Text>
                {profilePicture ? (
                  <Image 
                    key={`profile-${forceRefresh}`}  
                    source={{ 
                      uri: profilePicture,
                      cache: 'reload' 
                    }}
                    style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 10 }}
                    resizeMode="cover"
                    onError={() => setProfilePicture(null)}
                  />
                ) : (
                  <Image 
                    source={require("../../assets/default-profile.png")}
                    style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 10 }}
                    resizeMode="cover"
                  />
                )}
                
                {error && <Text style={styles.error}>{error}</Text>}
                {success && <Text style={styles.success}>{success}</Text>}
              </View>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#00BFFF" size="large" />
                  <Text style={styles.loadingText}>Loading your golf data...</Text>
                </View>
              ) : userData ? (
                <View style={styles.chartContainer}>
                  <HandicapChart/>
                  <GolfScoreChart userData={userData} />
                </View>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <Text style={styles.emptyStateText}>
                    No golf data available. Play a round and check back!
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
  contentContainer: {
    flex: 1,
    justifyContent: 'center', 
    paddingVertical: 10,
  },
  headerContainer: {
    padding: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  error: {
    color: "#ff6b6b",
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    textAlign: 'center',
    marginTop: 10,
    overflow: 'hidden',
  },
  success: {
    color: "#51cf66",
    backgroundColor: 'rgba(81, 207, 102, 0.15)',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    textAlign: 'center',
    marginTop: 10,
    overflow: 'hidden',
  },
  chartContainer: {
    width: '100%',
    paddingHorizontal: 5,
    paddingVertical: 0,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 15,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  emptyStateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 8,
    margin: 20,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  }
});