import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import {
    ActivityIndicator,
    Avatar,
    Button,
    Card,
    Chip,
    Divider,
    List,
    Text
} from 'react-native-paper';
import SettingsScreen from './Settings';


// Get BACKEND_URL from Constants
const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

// Types for user data
interface UserAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_date: string;
}

interface UserActivityItem {
  id: string;
  author: {
    username: string;
    profile_picture?: string;
    user_id: string;
  };
  content: string;
  created_at: string;
  post_id?: string;
}

// Define the type for chip objects based on the actual API response
interface ChipData {
  picture: string | null; 
  video: string | null; 
  chip_id: string;
  title: string;
  user_id: number;
  description: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  liked_by: any[];
  replies: any[];
  tags: any[];
  user: number;
  like_count?: number;
}

// Define the type for reply objects
interface ReplyData {
  id: number;
  user_id: number;
  chip: string;
  user: number;
  content: string;
  created_at: string;
  updated_at: string;
  liked_by: any[];
  like_count?: number;
}

type ProfilePageProps = {
  target_user_id?: string | null;
};

export default function ProfilePage(props: ProfilePageProps) {
  const params = useLocalSearchParams();
  // Use params.target_user_id if available, otherwise fall back to props
  const target_user_id = params.target_user_id as string || props.target_user_id;
  
  const [token, setToken] = useState<string | null>(null);
  const [userID, setUserID] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("UserName");
  const [loading, setLoading] = useState<boolean>(true);
  const [isSettingsOn, setIsSettingsOn] = useState<boolean>(false);
  const [userData, setUserData] = useState<any>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isOwnProfile, setIsOwnProfile] = useState<boolean>(false);
  
  // Golf stats
  const [handicapIndex, setHandicapIndex] = useState<number | null>(null);
  const [roundsPlayed, setRoundsPlayed] = useState<number>(0);
  const [averageScore, setAverageScore] = useState<number | null>(null);
  
  // Achievement chips & social interactions
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [userReplies, setUserReplies] = useState<UserActivityItem[]>([]);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [isExternalNavigation, setIsExternalNavigation] = useState<boolean>(false);


  const router = useRouter();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchUserData(),
      fetchUserProfilePicture(),
      fetchUserAchievements(),
      fetchUserReplies(),
      fetchFollowStats()
    ]).finally(() => {
      setRefreshing(false);
    });
  }, [userID, token, target_user_id]);

  const fetchTokenAndSetUserID = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("authToken");
      if (storedToken) {
        setToken(storedToken);
        const decoded: any = jwtDecode(storedToken);
        setUserID(decoded.user_id);
        // Determine if viewing own profile
        setIsOwnProfile(!target_user_id || target_user_id === decoded.user_id);
        // If we have a target_user_id param, we're likely coming from external navigation
        setIsExternalNavigation(!!target_user_id);
      } else {
        router.replace("/auth");
      }
    } catch (e) {
      console.error("Failed to fetch token:", e);
      router.replace("/auth");
    }
  };

  // Fetch username and user data
  const fetchUserData = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const profileUserId = target_user_id || userID;
      
      let response = await fetch(`${BACKEND_URL}/api/player/${profileUserId}/stats/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user stats: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setUserData(data);
      setUsername(data.username || "UserName");
      setHandicapIndex(data.handicap_index || null);
      setRoundsPlayed(data.rounds_played || 0);
      setAverageScore(data.average_score || null);
      
      // If there's a separate endpoint for profile data
      response = await fetch(`${BACKEND_URL}/api/user/${profileUserId}/profile/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        const profileData = await response.json();
        setFirstName(profileData.first_name || '');
        setLastName(profileData.last_name || '');
        setBio(profileData.bio || 'No bio available');
      }
      
    } catch (e) {
      console.error("Failed to fetch user data:", e);
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch profile picture
  const fetchUserProfilePicture = async () => {
    if (!token) return;
    
    try {
      const profileUserId = target_user_id || userID;
      const cacheBust = new Date().getTime();
      const response = await fetch(`${BACKEND_URL}/api/user/${profileUserId}/profile_picture/?cache=${cacheBust}`, {
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
      }
    } catch (error) {
      console.error("Error fetching profile picture:", error);
      setProfilePicture(null);
    }
  };

  // Fetch user achievements
  const fetchUserAchievements = async () => {
    if (!token) return;
    
    try {
      const profileUserId = target_user_id || userID;
      const response = await fetch(`${BACKEND_URL}/api/user/${profileUserId}/achievements/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error("Error fetching user achievements:", error);
    }
  };

  // Fetch user's social interactions (replies)
  const fetchUserReplies = async () => {
    if (!token) return;
    
    try {
      const profileUserId = target_user_id || userID;
      const response = await fetch(`${BACKEND_URL}/api/user/${profileUserId}/activity/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserReplies(data.replies || []);
      }
    } catch (error) {
      console.error("Error fetching user replies:", error);
    }
  };

  // Fetch follow stats
  const fetchFollowStats = async () => {
    if (!token) return;
    
    try {
      const profileUserId = target_user_id || userID;
      const response = await fetch(`${BACKEND_URL}/api/user/${profileUserId}/follow-stats/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFollowerCount(data.followers || 0);
        setFollowingCount(data.following || 0);
        setIsFollowing(data.is_following || false);
      }
    } catch (error) {
      console.error("Error fetching follow stats:", error);
    }
  };

  // Toggle follow status
  const toggleFollow = async () => {
    if (!token || !target_user_id) return;
    
    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`${BACKEND_URL}/api/user/${target_user_id}/follow/`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      
      if (response.ok) {
        setIsFollowing(!isFollowing);
        setFollowerCount(prev => isFollowing ? prev - 1 : prev + 1);
      } else {
        Alert.alert('Error', 'Failed to update follow status');
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  useEffect(() => {
    fetchTokenAndSetUserID();
  }, [target_user_id]);

  useEffect(() => {
    // Only fetch if token is available
    if (token && userID) {
      fetchUserData();
      fetchUserProfilePicture();
      fetchUserAchievements();
      fetchUserReplies();
      fetchFollowStats();
    }
  }, [token, userID, target_user_id]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <>
        <Stack.Screen 
          options={{
            headerShown: false,
          }} 
        />
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#00BFFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
      </>
    );
  }

  if (isSettingsOn && isOwnProfile) {
    return (
      <>
        <Stack.Screen 
          options={{
            headerShown: false,
          }} 
        />
        <View style={styles.container}>
          <StatusBar style="light"  />
          <Button
            mode="outlined"
            icon={({ color }) => <Ionicons name="arrow-back" size={18} color={color} />}
            onPress={() => setIsSettingsOn(false)}
            style={styles.backButton}
            textColor="#00BFFF"
          >
            Back to Profile
          </Button>
          <SettingsScreen />
        </View>
      </>
    );
  }

  return (
    <View style={styles.container}>
      {/* Add background gradient only when accessed from external navigation */}
      {isExternalNavigation && (
        <LinearGradient
          colors={['#000026', '#000038', '#000042']}
          style={styles.backgroundGradient}
        />
      )}
      
      {/* Add Stack configuration to hide the default header */}
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      <StatusBar style="light" />
      
      {/* Add back button if navigated from external page */}
      {isExternalNavigation && (
        <View style={styles.backButtonContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#00BFFF" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00BFFF"]} tintColor="#00BFFF" />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {profilePicture ? (
              <Image
                key={`profile-${forceRefresh}`}
                source={{ uri: profilePicture }}
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <MaterialCommunityIcons name="account" size={60} color="#FFFFFF" />
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.usernameText}>@{username}</Text>
            {firstName && lastName && (
              <Text style={styles.nameText}>{firstName} {lastName}</Text>
            )}
            <Text style={styles.bioText} numberOfLines={3}>{bio || 'No bio available'}</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{roundsPlayed}</Text>
                <Text style={styles.statLabel}>Rounds</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{followerCount}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{followingCount}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Action buttons */}
        <View style={styles.actionButtonsContainer}>
          {isOwnProfile ? (
            <>
              <Button
                mode="contained"
                icon={({ color }) => <MaterialCommunityIcons name="account-edit" size={20} color={color} />}
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => router.push('/ChangeProfilePicture')}
              >
                Edit Profile
              </Button>
              <Button
                mode="outlined"
                icon={({ color }) => <Ionicons name="settings" size={18} color={color} />}
                style={styles.actionButton}
                textColor="#00BFFF"
                onPress={() => setIsSettingsOn(true)}
              >
                Settings
              </Button>
            </>
          ) : (
            <>
              <Button
                mode={isFollowing ? "outlined" : "contained"}
                icon={({ color }) => <MaterialCommunityIcons name={isFollowing ? "account-check" : "account-plus"} size={20} color={color} />}
                style={[styles.actionButton, isFollowing ? styles.followingButton : styles.primaryButton]}
                textColor={isFollowing ? "#00BFFF" : "#FFFFFF"}
                onPress={toggleFollow}
              >
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <Button
                mode="outlined"
                icon={({ color }) => <MaterialCommunityIcons name="message-outline" size={18} color={color} />}
                style={styles.actionButton}
                textColor="#00BFFF"
                onPress={() => Alert.alert("Coming Soon", "Direct messaging will be available in a future update.")}
              >
                Message
              </Button>
            </>
          )}
        </View>
        
        <Divider style={styles.sectionDivider} />
        
        {/* Golf Stats Section */}
        <Card style={styles.statsCard}>
          <Card.Title title="Golf Stats" titleStyle={styles.cardTitle} />
          <Card.Content>
            <View style={styles.golfStatsContainer}>
              <View style={styles.golfStatItem}>
                <MaterialCommunityIcons name="golf" size={24} color="#00BFFF" style={styles.statIcon} />
                <View>
                  <Text style={styles.golfStatLabel}>Handicap Index</Text>
                  <Text style={styles.golfStatValue}>
                    {handicapIndex !== null && handicapIndex !== undefined ? handicapIndex.toFixed(1) : 'N/A'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.golfStatItem}>
                <MaterialCommunityIcons name="flag" size={24} color="#4CAF50" style={styles.statIcon} />
                <View>
                  <Text style={styles.golfStatLabel}>Rounds Played</Text>
                  <Text style={styles.golfStatValue}>{roundsPlayed}</Text>
                </View>
              </View>
              
              <View style={styles.golfStatItem}>
                <MaterialCommunityIcons name="scoreboard" size={24} color="#FFC107" style={styles.statIcon} />
                <View>
                  <Text style={styles.golfStatLabel}>Average Score</Text>
                  <Text style={styles.golfStatValue}>
                    {averageScore !== null && averageScore !== undefined ? averageScore.toFixed(1) : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
            
            <Button
              mode="text"
              onPress={() => router.push('/ViewRounds')}
              style={styles.viewMoreButton}
              textColor="#00BFFF"
              icon={({ color }) => <MaterialCommunityIcons name="chevron-right" size={20} color={color} />}
              contentStyle={{ flexDirection: 'row-reverse' }}
            >
              View All Rounds
            </Button>
          </Card.Content>
        </Card>
        
        {/* Achievements Section */}
        <Card style={styles.achievementsCard}>
          <Card.Title 
            title="Achievements" 
            titleStyle={styles.cardTitle}
            right={(props) => userAchievements.length > 0 && (
              <Text style={styles.chipCount}>{userAchievements.length}</Text>
            )}
          />
          <Card.Content>
            {userAchievements.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScrollView}>
                {userAchievements.map((achievement) => (
                  <Chip
                    key={achievement.id}
                    icon={() => {
                      const iconName = achievement.icon || "trophy";
                      return <MaterialCommunityIcons name={iconName as any} size={16} color="#FFD700" />;
                    }}
                    style={styles.achievementChip}
                    textStyle={styles.achievementChipText}
                    onPress={() => Alert.alert(achievement.name, achievement.description)}
                  >
                    {achievement.name}
                  </Chip>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyStateContainer}>
                <MaterialCommunityIcons name="trophy-outline" size={36} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyStateText}>Achievements Comming soon...</Text>
              </View>
            )}
          </Card.Content>
        </Card>
        
        {/* Recent Activity Section */}
        <Card style={styles.activityCard}>
          <Card.Title 
            title="Recent Activity" 
            titleStyle={styles.cardTitle} 
          />
          <Card.Content>
            {userReplies.length > 0 ? (
              userReplies.slice(0, 3).map((reply) => (
                <List.Item
                  key={reply.id}
                  title={reply.author.username}
                  description={reply.content}
                  descriptionNumberOfLines={2}
                  descriptionStyle={styles.replyContent}
                  titleStyle={styles.replyAuthor}
                  left={() => (
                    <Avatar.Image
                      size={40}
                      source={
                        reply.author.profile_picture
                          ? { uri: reply.author.profile_picture }
                          : require('../../assets/default-profile.png')
                      }
                      style={styles.replyAvatar}
                    />
                  )}
                  right={() => (
                    <Text style={styles.replyDate}>{formatDate(reply.created_at)}</Text>
                  )}
                  style={styles.replyItem}
                />
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <MaterialCommunityIcons name="forum-outline" size={36} color="rgba(255,255,255,0.3)" />
                <Text style={styles.emptyStateText}>No activity yet</Text>
              </View>
            )}
            
            {userReplies.length > 0 && (
              <Button
                mode="text"
                onPress={() => Alert.alert("Coming Soon", "Full activity feed will be available in a future update.")}
                style={styles.viewMoreButton}
                textColor="#00BFFF"
                icon={({ color }) => <MaterialCommunityIcons name="chevron-right" size={20} color={color} />}
                contentStyle={{ flexDirection: 'row-reverse' }}
              >
                View All Activity
              </Button>
            )}
          </Card.Content>
        </Card>
        
        {/* Error display */}
        {error && (
          <View style={styles.errorContainer}>
            <MaterialCommunityIcons name="alert-circle" size={20} color="#ff6b6b" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>SwingSync User Profile</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: 10, // Add some padding to account for status bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000026',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'rgba(0,0,60,0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#00BFFF',
    backgroundColor: '#000038',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000038',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
    justifyContent: 'center',
  },
  usernameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00BFFF',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 4,
  },
  bioText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
  },
  primaryButton: {
    backgroundColor: '#00BFFF',
  },
  followingButton: {
    borderColor: '#00BFFF',
  },
  sectionDivider: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: 1,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  statsCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: 'rgba(0,0,60,0.7)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  golfStatsContainer: {
    marginVertical: 8,
  },
  golfStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 8,
  },
  statIcon: {
    marginRight: 12,
  },
  golfStatLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  golfStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  achievementsCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: 'rgba(0,0,60,0.7)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipCount: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginRight: 16,
    fontSize: 16,
  },
  chipsScrollView: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  achievementChip: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  achievementChipText: {
    color: '#FFD700',
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  activityCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: 'rgba(0,0,60,0.7)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  replyItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  replyAvatar: {
    backgroundColor: '#000038',
  },
  replyAuthor: {
    color: '#fff',
    fontWeight: 'bold',
  },
  replyContent: {
    color: 'rgba(255,255,255,0.7)',
  },
  replyDate: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginRight: 8,
  },
  viewMoreButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  backButton: {
    margin: 16,
    borderColor: '#00BFFF',
  },
  backButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#000026',
    zIndex: 10,
  },
  backButtonText: {
    color: '#00BFFF',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,107,0.1)',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)',
  },
  errorText: {
    color: '#ff6b6b',
    marginLeft: 8,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    opacity: 0.5,
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  }
});

