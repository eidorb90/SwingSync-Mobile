import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient'; 
import { router, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { jwtDecode } from 'jwt-decode';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { ActivityIndicator, Avatar, Button, Card, Divider, IconButton, Text } from "react-native-paper";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

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

// Helper function to fetch user profile pictures
const fetchUserProfilePicture = async (userId: number | string) => {
  if (!userId) return null;
  
  const token = await AsyncStorage.getItem("authToken");
  try {
    const cacheBust = Date.now();
    const response = await fetch(`${BACKEND_URL}/api/user/${userId}/profile_picture/?cache=${cacheBust}`, {
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
      
      return imageUri;
    }
  } catch (err) {
    console.error("Error fetching user profile picture:", err);
  }
  return null;
};

// Reply component to display individual replies
const Reply = ({ reply, token, currentUserId, onReplyDeleted }: { 
  reply: ReplyData; 
  token: string | null;
  currentUserId: string | null;
  onReplyDeleted?: () => void;
}) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(reply.liked_by?.length || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if current user has already liked this reply
    if (reply.liked_by && Array.isArray(reply.liked_by)) {
      setLiked(reply.liked_by.some(user => user === Number(currentUserId)));
    }
  }, [reply.liked_by, currentUserId]);
  
  useEffect(() => {
    // Fetch profile picture for the reply's user
    const getProfilePicture = async () => {
      const imageUri = await fetchUserProfilePicture(reply.user_id);
      setProfilePicture(imageUri);
    };
    
    getProfilePicture();
  }, [reply.user]);
  
  const toggleLike = async () => {
    if (!token) return;
    
    setIsSubmitting(true);
    try {
      
      const response = await fetch(`${BACKEND_URL}/api/chip/reply/like/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reply_id: reply.id,
        }),
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        // Just log the error but still update the UI
        console.warn(`Server returned error: ${responseText}`);
      }
      
      // Update the UI optimistically regardless of server response
      const newLiked = !liked;
      setLiked(newLiked);
      setLikeCount(prevCount => newLiked ? prevCount + 1 : Math.max(0, prevCount - 1));
      
    } catch (error) {
      console.error('Error toggling like on reply:', error);
      // Don't show an alert to avoid interrupting the user experience
      // Still update the UI optimistically
      const newLiked = !liked;
      setLiked(newLiked);
      setLikeCount(prevCount => newLiked ? prevCount + 1 : Math.max(0, prevCount - 1));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteReply = async () => {
    if (!token) return;
    
    Alert.alert(
      "Delete Reply",
      "Are you sure you want to delete this reply?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/chip/reply/`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  reply_id: reply.id,
                }),
              });
              
              if (!response.ok) {
                throw new Error('Failed to delete reply');
              }
              
              if (onReplyDeleted) {
                onReplyDeleted();
              }
            } catch (error) {
              console.error('Error deleting reply:', error);
              Alert.alert("Error", "Failed to delete reply.");
            }
          }
        }
      ]
    );
  };

  // Format the timestamp to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Card style={styles.replyCard}>
      <Card.Content>
        <View style={styles.replyHeader} accessible={true} accessibilityLabel={`Reply from user @${reply.user}`}>
          {profilePicture ? (
            <Avatar.Image 
              size={30} 
              source={{ uri: profilePicture }} 
              style={styles.replyAvatar} 
            />
          ) : (
            <Avatar.Text 
              size={30} 
              label={`U${reply.user}`} 
              style={styles.replyAvatar} 
            />
          )}
          <View style={styles.replyHeaderText}>
            <Text style={styles.replyAuthor}               
            onPress={() => {
                router.push({
                  pathname: '/components/ProfilePage',
                  params: { target_user_id: reply.user_id.toString() }
                })
              }}>@{reply.user}</Text>
            <Text style={styles.replyTime}>{formatDate(reply.created_at)}</Text>
          </View>
          
          {/* Show delete option for user's own replies */}
          {(reply.user === Number(currentUserId) || reply.user_id === Number(currentUserId)) && (
            <IconButton 
              icon="delete" 
              size={20} 
              style={styles.deleteButton} 
              onPress={deleteReply}
              accessibilityLabel="Delete reply"
              accessibilityHint="Deletes this reply permanently"
              accessibilityRole="button"
            />
          )}
        </View>
        <Text style={styles.replyContent} accessibilityLabel={`Reply content: ${reply.content}`}>{reply.content}</Text>
      </Card.Content>
      <Card.Actions>
        <IconButton 
          icon={liked ? "heart" : "heart-outline"} 
          size={20}
          onPress={toggleLike}
          disabled={isSubmitting}
          iconColor={liked ? "#FF4F4F" : "#888"}
          accessibilityLabel={liked ? "Unlike this reply" : "Like this reply"}
          accessibilityRole="button"
        />
        <Text style={styles.replyActionText}>{likeCount}</Text>
      </Card.Actions>
    </Card>
  );
};

// Chip component to display individual posts
const Chip = ({ chip, token, currentUserId, onChipDeleted }: { 
  chip: ChipData; 
  token: string | null;
  currentUserId: string | null;
  onChipDeleted?: () => void;
}) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(chip.liked_by?.length || 0);
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<ReplyData[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [isSubmittingLike, setIsSubmittingLike] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if current user has already liked this chip
    if (chip.liked_by && Array.isArray(chip.liked_by)) {
      setLiked(chip.liked_by.some(user => user === Number(currentUserId)));
    }
  }, [chip.liked_by, currentUserId]);

  useEffect(() => {
    // Fetch profile picture for the chip's user
    const getProfilePicture = async () => {
      const imageUri = await fetchUserProfilePicture(chip.user_id);
      setProfilePicture(imageUri);
    };
    
    getProfilePicture();
  }, [chip.user]);
  
  // Helper to get absolute media URL
  const getMediaUrl = (mediaPath?: string) => {
    if (!mediaPath) return null;
    if (mediaPath.startsWith('http')) return mediaPath;
    if (mediaPath.startsWith('/')) return `${BACKEND_URL}${mediaPath}`;
    return `${BACKEND_URL}/${mediaPath}`;
  };

  // Adjust this function to handle API response format for chips
  const toggleLike = async () => {
    if (!token || isSubmittingLike) return;
    
    setIsSubmittingLike(true);
    try {
      
      const response = await fetch(`${BACKEND_URL}/api/chip/like/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chip_id: chip.chip_id,
        }),
      });
      
      const responseText = await response.text();
      
      if (!response.ok) {
        console.warn(`Server returned error: ${responseText}`);
        // Continue with optimistic update despite error
      }
      
      // Parse JSON only if there's content to parse
      let data = {};
      let serverLikeCount = null;
      
      if (responseText) {
        try {
          data = JSON.parse(responseText);
          if ('like_count' in data && typeof (data as any).like_count === 'number') {
            serverLikeCount = (data as any).like_count;
          }
        } catch (e) {
          console.error('Error parsing response:', e);
        }
      }
      
      setLiked(!liked);
      
      // Use the returned like_count if available, otherwise toggle
      if (serverLikeCount !== null) {
        setLikeCount(serverLikeCount);
      } else {
        setLikeCount(prevCount => liked ? Math.max(0, prevCount - 1) : prevCount + 1);
      }
    } catch (error) {
      console.error('Error toggling like on chip:', error);
      // Still update the UI optimistically
      setLiked(!liked);
      setLikeCount(prevCount => liked ? Math.max(0, prevCount - 1) : prevCount + 1);
    } finally {
      setIsSubmittingLike(false);
    }
  };

  const deleteChip = async () => {
    if (!token) return;
    
    Alert.alert(
      "Delete Chip",
      "Are you sure you want to delete this chip?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/chip/`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  chip_id: chip.chip_id,
                }),
              });
              
              if (!response.ok) {
                throw new Error('Failed to delete chip');
              }
              
              if (onChipDeleted) {
                onChipDeleted();
              }
            } catch (error) {
              console.error('Error deleting chip:', error);
              Alert.alert("Error", "Failed to delete chip.");
            }
          }
        }
      ]
    );
  };

  // Format the timestamp to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Fetch replies for this chip
  const fetchReplies = async () => {
    if (!token) return;
    
    setLoadingReplies(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/chip/reply/?chip_id=${chip.chip_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch replies');
      }
      
      const data = await response.json();
      setReplies(data);
    } catch (error) {
      console.error('Error fetching replies:', error);
    } finally {
      setLoadingReplies(false);
    }
  };

  // Toggle showing replies
  const handleToggleReplies = async () => {
    const newShowReplies = !showReplies;
    setShowReplies(newShowReplies);
    
    if (newShowReplies && replies.length === 0) {
      await fetchReplies();
    }
  };

  // Submit a new reply
  const handleSubmitReply = async () => {
    if (!newReply.trim() || !token) return;
    
    Keyboard.dismiss(); // Dismiss keyboard when submitting
    setSubmittingReply(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/chip/reply/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chip: chip.chip_id,
          content: newReply,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit reply');
      }
      
      // Refresh replies after posting
      await fetchReplies();
      setNewReply('');
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <Card style={styles.chipCard}>
      <Card.Content>
        <View style={styles.chipHeader} accessible={true} accessibilityLabel={`Post from user ${chip.user}`}>
          {profilePicture ? (
            <Avatar.Image 
              size={40} 
              source={{ uri: profilePicture }} 
              style={styles.chipAvatar}
            />
          ) : (
            <Avatar.Text size={40} label={`U${chip.user}`} />
          )}
          <View style={styles.chipHeaderText}>
            <Text 
              style={styles.chipAuthor} 
              onPress={() => {
                router.push({
                  pathname: '/components/ProfilePage',
                  params: { target_user_id: chip.user_id.toString() }
                })
              }}
            >
              @{chip.user}
            </Text>
            <Text style={styles.chipTime}>{formatDate(chip.created_at)}</Text>
          </View>
          
          {/* Show delete option for user's own chips */}
          {(chip.user === Number(currentUserId) || chip.user_id === Number(currentUserId)) && (
            <IconButton 
              icon="delete" 
              style={styles.deleteButton}
              size={24}
              onPress={deleteChip}
              accessibilityLabel="Delete post"
              accessibilityHint="Deletes this post permanently"
              accessibilityRole="button" 
            />
          )}
        </View>
        <Text style={styles.chipTitle} accessibilityRole="header">{chip.title}</Text>
        <Text style={styles.chipContent}>{chip.description}</Text>
        {/* Render uploaded photo if present */}
        {chip.picture && getMediaUrl(chip.picture) && (
          <Image
            source={{ uri: getMediaUrl(chip.picture) as string }}
            style={{ width: '100%', height: 200, borderRadius: 12, marginTop: 8, marginBottom: 8, backgroundColor: '#222' }}
            resizeMode="cover"
          />
        )}
        {/* Render uploaded video if present */}
        {chip.video && getMediaUrl(chip.video) && (
          <View style={{ width: '100%', height: 220, marginTop: 8, marginBottom: 8, borderRadius: 12, overflow: 'hidden', backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' }}>
            {/* Debug: Log the video URI - removed console.log from JSX */}
            {Platform.OS === 'web' ? (
              <video
                src={getMediaUrl(chip.video) as string}
                controls
                style={{ width: '100%', height: '100%', borderRadius: 12, background: '#111' }}
              />
            ) : (
              getMediaUrl(chip.video) ? (
                <ExpoVideoPlayer uri={getMediaUrl(chip.video) as string} />
              ) : (
                <Text style={{ color: 'red' }}>Invalid video URI</Text>
              )
            )}
          </View>
        )}
      </Card.Content>
      <Card.Actions>
        <IconButton 
          icon={liked ? "heart" : "heart-outline"} 
          onPress={toggleLike}
          size={24}
          disabled={isSubmittingLike}
          iconColor={liked ? "#FF4F4F" : "#888"}
          accessibilityLabel={liked ? "Unlike this post" : "Like this post"}
          accessibilityRole="button"
        />
        <Text style={styles.countText}>{likeCount}</Text>
        <IconButton 
          icon={showReplies ? "comment" : "comment-outline"} 
          onPress={handleToggleReplies}
          size={24}
          accessibilityLabel={showReplies ? "Hide replies" : "Show replies"}
          accessibilityRole="button"
        />
        <Text style={styles.countText}>{chip.replies.length}</Text>

      </Card.Actions>
      
      {showReplies && (
        <View style={styles.repliesSection}>
          <Divider />
          {loadingReplies ? (
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          ) : (
            <>
              <View style={styles.repliesList}>
                {replies.length > 0 ? (
                  replies.map(reply => (
                    <Reply 
                      key={reply.id} 
                      reply={reply} 
                      token={token} 
                      currentUserId={currentUserId} 
                      onReplyDeleted={fetchReplies}
                    />
                  ))
                ) : (
                  <Text style={styles.noRepliesText}>No replies yet. Be the first!</Text>
                )}
              </View>
              
              <View style={styles.replyInputContainer}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Write a reply..."
                  placeholderTextColor="#999999"
                  value={newReply}
                  onChangeText={setNewReply}
                  multiline
                  accessible={true}
                  accessibilityLabel="Reply input"
                  accessibilityHint="Enter your reply here"
                />
                <Button 
                  mode="contained" 
                  onPress={() => {
                    Keyboard.dismiss();
                    handleSubmitReply();
                  }}
                  loading={submittingReply}
                  disabled={submittingReply || !newReply.trim()}
                  style={styles.replyButton}
                  labelStyle={styles.buttonLabel}
                  accessibilityLabel="Post reply"
                  accessibilityRole="button"
                >
                  Reply
                </Button>
              </View>
            </>
          )}
        </View>
      )}
      
      <Divider />
    </Card>
  );
};

// Replace ExpoVideoPlayer with a hook-based component using expo-video
const ExpoVideoPlayer = ({ uri }: { uri: string }) => {
  // Log the URI for debugging
  console.log('ExpoVideoPlayer URI:', uri);

  // Fetch and log Content-Type header for debugging
  useEffect(() => {
    fetch(uri, { method: 'HEAD' })
      .then(res => {
        console.log('Video Content-Type:', res.headers.get('Content-Type'));
      })
      .catch(err => {
        console.log('Error fetching video headers:', err);
      });
  }, [uri]);

  const player = useVideoPlayer(uri, player => {
    player.loop = false;
  });

  return (
    <VideoView
      style={{ width: '100%', height: 220, borderRadius: 12, backgroundColor: '#111' }}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
    />
  );
};

export default function CommunityHomePage() {
    const [chips, setChips] = useState<ChipData[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newChipModalVisible, setNewChipModalVisible] = useState(false);
    const [newChipTitle, setNewChipTitle] = useState('');
    const [newChipDescription, setNewChipDescription] = useState('');
    const [submittingChip, setSubmittingChip] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

    const [token, setToken] = useState<string | null>(null);
    const [userID, setUserID] = useState<string | null>(null);
    const [username, setUsername] = useState<string>("User");
    const [userProfilePicture, setUserProfilePicture] = useState<string | null>(null);
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);

    const fetchTokenAndSetUserID = async () => {
    try {
        const storedToken = await AsyncStorage.getItem("authToken");
        if (storedToken) {
        setToken(storedToken);
        const decoded: any = jwtDecode(storedToken);
        setUserID(decoded.user_id);
        } else {
        router.replace("/auth");
        }
    } catch (e) {
        console.error("Failed to fetch token:", e);
        router.replace("/auth");
    }
      console.log(userID)  
    };

    const fetchAndSetUsername = async () => {
        try {
            let response = await fetch(`${BACKEND_URL}/api/player/${userID}/stats/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            })
            if (!response.ok) {
                throw new Error('Failed to fetch user stats');
            }
            const data = await response.json();
            setUsername(data.username || "UserName");
        } catch (e) {
            console.error("Failed to fetch username:", e);
            setUsername("UserName");
            Alert.alert("Error", "Failed to fetch user information. Please try again later.");  
        }
        console.log("Username set to :", username);
    }

    // Fetch current user's profile picture
    const fetchCurrentUserProfilePic = useCallback(async () => {
      if (userID) {
        const imageUri = await fetchUserProfilePicture(userID);
        setUserProfilePicture(imageUri);
      }
    }, [userID]);

    const fetchChips = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/chip/`, {
            headers: {
                Authorization: `Bearer ${token}`,
            }
            });
            if (!response.ok) {
            throw new Error('Network response was not ok');
            }
            const fetchedChips = await response.json();
            setChips([...fetchedChips]); // Always set a new array reference
        } catch (error) {
            console.error("Error fetching chips:", error);
            setChips([]); // Ensure state is updated even on error
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchChips();
    };

    useEffect(() => {
        fetchTokenAndSetUserID();
    }, []);
    
    useEffect(() => {
        if (token && userID) {
          fetchChips();
          fetchCurrentUserProfilePic();
          fetchAndSetUsername();
        }
    }, [token, userID]);

    // Pick image from library
    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Permission required", "Please allow access to your photos.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    // Pick video from library
    const pickVideo = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            Alert.alert("Permission required", "Please allow access to your videos.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: false,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setSelectedVideo(result.assets[0].uri);
        }
    };

    const createNewChip = async () => {
        if (!newChipTitle.trim() || !newChipDescription.trim() || !token) return;
        setSubmittingChip(true);
        try {
            let formData = new FormData();
            formData.append('title', newChipTitle);
            formData.append('description', newChipDescription);
            formData.append('is_public', 'true');
            // Do NOT append 'replies' field here
            if (selectedImage) {
                const filename = selectedImage.split('/').pop() || 'photo.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;
                formData.append('picture', {
                    uri: selectedImage,
                    name: filename,
                    type,
                } as any);
            }
            if (selectedVideo) {
                const filename = selectedVideo.split('/').pop() || 'video.mp4';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `video/${match[1]}` : `video`;
                formData.append('video', {
                    uri: selectedVideo,
                    name: filename,
                    type,
                } as any);
            }
            const response = await fetch(`${BACKEND_URL}/api/chip/`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });
            const responseText = await response.text();
            if (!response.ok) {
                let errorMessage = 'Failed to create chip';
                try {
                    const errorData = JSON.parse(responseText);
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    } else {
                        const errors = Object.entries(errorData)
                            .map(([field, msgs]) => `${field}: ${msgs}`)
                            .join('\n');
                        if (errors) {
                            errorMessage = `Validation errors:\n${errors}`;
                        }
                    }
                } catch (e) {}
                throw new Error(errorMessage);
            }
            setChips([]); // Clear chips before fetching new ones to force re-render
            await fetchChips();
            setNewChipModalVisible(false);
            setNewChipTitle('');
            setNewChipDescription('');
            setSelectedImage(null);
            setSelectedVideo(null);
            // Optionally scroll to top after posting
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }, 300);
        } catch (error) {
            console.error('Error creating chip:', error);
            Alert.alert(
                "Error Creating Post", 
                error instanceof Error ? error.message : "An unknown error occurred. Please try again."
            );
        } finally {
            setSubmittingChip(false);
        }
    };

    return (
        <LinearGradient
            style={{ flex: 1 }}
            colors={['#000026', "#000080", '#000026']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.container} accessible={true} accessibilityLabel="Community Home Page">
                <View style={styles.headerContainer}>
                    <Text style={styles.title} accessibilityRole="header">Swing Sync</Text>
                    <Text style={styles.communitySubtitle}>Community</Text>
                </View>
                
                <TouchableOpacity 
                    style={styles.composeChip}
                    onPress={() => setNewChipModalVisible(true)}
                    accessible={true}
                    accessibilityLabel="Create new post"
                    accessibilityHint="Opens dialog to create a new community post"
                    accessibilityRole="button"
                >
                    {userProfilePicture ? (
                      <Avatar.Image 
                        size={48} 
                        source={{ uri: userProfilePicture }} 
                        style={styles.composeAvatar} 
                      />
                    ) : (
                      <Avatar.Text 
                        size={48} 
                        label={username.charAt(0).toUpperCase()} 
                        style={styles.composeAvatar} 
                      />
                    )}
                    <View style={styles.composeInputWrapper}>
                        <View style={styles.composeInput}>
                            <Text style={styles.composeText}>Share your golf journey...</Text>
                        </View>
                        <View style={styles.composeActions}>
                            <View style={styles.composeAction}>
                                <IconButton icon="image" size={20} iconColor="#00BFFF" />
                                <Text style={styles.composeActionText}>Photo</Text>
                            </View>
                            <View style={styles.composeAction}>
                                <IconButton icon="video" size={20} iconColor="#FF9500" />
                                <Text style={styles.composeActionText}>Video</Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
                
                <View style={styles.divider} />
                
                <ScrollView 
                    ref={scrollViewRef}
                    key={chips.length} // force re-render on chips change
                    style={styles.chipsList}
                    refreshControl={
                        <RefreshControl 
                            refreshing={refreshing} 
                            onRefresh={handleRefresh}
                            tintColor="#00BFFF"
                            colors={["#00BFFF"]}
                            progressBackgroundColor="rgba(0, 0, 25, 0.8)"
                            accessibilityLabel="Pull to refresh content"
                        />
                    }
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={styles.scrollContent}
                    accessible={true}
                    accessibilityLabel="Community posts"
                >
                    {loading && chips.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#00BFFF" />
                            <Text style={styles.loadingText}>Loading posts...</Text>
                        </View>
                    ) : chips.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <IconButton icon="golf" size={60} iconColor="#00BFFF" />
                            <Text style={styles.emptyTitle}>No Posts Yet</Text>
                            <Text style={styles.emptyText}>Be the first to share your golf journey with the community!</Text>
                            <Button 
                                mode="contained" 
                                onPress={() => setNewChipModalVisible(true)}
                                style={styles.emptyButton}
                                labelStyle={styles.emptyButtonText}
                            >
                                Create Post
                            </Button>
                        </View>
                    ) : (
                        chips.map((chip) => (
                            <Chip 
                                key={chip.chip_id} 
                                chip={chip} 
                                token={token} 
                                currentUserId={userID} 
                                onChipDeleted={fetchChips}
                            />
                        ))
                    )}
                </ScrollView>

                {/* Modal for creating a new chip */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={newChipModalVisible}
                    onRequestClose={() => {
                        Keyboard.dismiss();
                        setNewChipModalVisible(false);
                    }}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalOuterContainer}>
                            <KeyboardAvoidingView
                                behavior={Platform.OS === "ios" ? "padding" : "height"}
                                style={{ width: '100%', alignItems: 'center', justifyContent: 'center', flex: 1 }}
                            >
                                <View style={styles.modalContent}>
                                    <View style={styles.modalHeader}>
                                        <Text style={styles.modalTitle} accessibilityRole="header">Create New Post</Text>
                                        <IconButton 
                                            icon="close" 
                                            size={24} 
                                            iconColor="#FFFFFF" 
                                            onPress={() => setNewChipModalVisible(false)}
                                            style={styles.closeButton}
                                        />
                                    </View>
                                    
                                    <View style={styles.modalUserInfo}>
                                        {userProfilePicture ? (
                                            <Avatar.Image 
                                                size={40} 
                                                source={{ uri: userProfilePicture }} 
                                                style={styles.modalAvatar} 
                                            />
                                        ) : (
                                            <Avatar.Text 
                                                size={40} 
                                                label={username.charAt(0).toUpperCase()} 
                                                style={styles.modalAvatar} 
                                            />
                                        )}
                                        <Text style={styles.modalUsername} onPress={() => {router.push('/components/ProfilePage')}}>
                                            @{username}
                                        </Text>
                                    </View>
                                    
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Title"
                                        value={newChipTitle}
                                        onChangeText={setNewChipTitle}
                                        placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                        accessible={true}
                                        accessibilityLabel="Post title"
                                        accessibilityHint="Enter the title for your post"
                                    />
                                    
                                    <TextInput
                                        style={[styles.modalInput, styles.descriptionInput]}
                                        placeholder="What's on your mind about golf today?"
                                        value={newChipDescription}
                                        onChangeText={setNewChipDescription}
                                        placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                        multiline
                                        numberOfLines={4}
                                        accessible={true}
                                        accessibilityLabel="Post content"
                                        accessibilityHint="Enter the content for your post"
                                    />
                                    
                                    {/* Preview selected image/video */}
                                    {(selectedImage || selectedVideo) && (
                                        <View style={{ marginBottom: 12 }}>
                                            {selectedImage && (
                                                <View style={{ alignItems: 'center', marginBottom: 8 }}>
                                                    <Text style={{ color: '#fff', marginBottom: 4 }}>Photo Preview:</Text>
                                                    <Image source={{ uri: selectedImage }} style={{ width: 180, height: 120, borderRadius: 8 }} />
                                                    <Button onPress={() => setSelectedImage(null)} textColor="#FF4F4F" style={{ marginTop: 4 }}>Remove Photo</Button>
                                                </View>
                                            )}
                                            {selectedVideo && (
                                                <View style={{ alignItems: 'center', marginBottom: 8 }}>
                                                    <Text style={{ color: '#fff', marginBottom: 4 }}>Video Selected</Text>
                                                    <Text style={{ color: '#aaa', fontSize: 13 }}>{selectedVideo.split('/').pop()}</Text>
                                                    <Button onPress={() => setSelectedVideo(null)} textColor="#FF9500" style={{ marginTop: 4 }}>Remove Video</Button>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                    
                                    <View style={styles.modalAttachments}>
                                        <TouchableOpacity style={styles.attachmentButton} onPress={pickImage}>
                                            <IconButton icon="image" size={24} iconColor="#00BFFF" />
                                            <Text style={styles.attachmentText}>Add Photo</Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity style={styles.attachmentButton} onPress={pickVideo}>
                                            <IconButton icon="video" size={24} iconColor="#FF9500" />
                                            <Text style={styles.attachmentText}>Add Video</Text>
                                        </TouchableOpacity>
                                    </View>
                                    
                                    <View style={styles.modalActions}>
                                        <Button 
                                            mode="outlined" 
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                setNewChipModalVisible(false);
                                            }}
                                            style={styles.cancelButton}
                                            textColor="#00BFFF"
                                            labelStyle={styles.buttonLabel}
                                            accessibilityLabel="Cancel creating post"
                                            accessibilityRole="button"
                                        >
                                            Cancel
                                        </Button>
                                        <Button 
                                            mode="contained" 
                                            onPress={() => {
                                                Keyboard.dismiss();
                                                createNewChip();
                                            }}
                                            loading={submittingChip}
                                            disabled={submittingChip || !newChipTitle.trim() || !newChipDescription.trim()}
                                            style={styles.postButton}
                                            labelStyle={styles.buttonLabel}
                                            accessibilityLabel="Create post"
                                            accessibilityRole="button"
                                        >
                                            Post
                                        </Button>
                                    </View>
                                </View>
                            </KeyboardAvoidingView>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    container: {
        flex: 1,
        padding: 16,
        paddingTop: 60,
        backgroundColor: 'rgba(0, 0, 38, 0.97)',
    },
    headerContainer: {
        marginBottom: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff",
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        letterSpacing: 0.5,
    },
    communitySubtitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#00BFFF",
        marginTop: -5,
        letterSpacing: 1.5,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        marginVertical: 16,
    },
    chipsList: {
        flex: 1,
    },
    chipCard: {
        marginBottom: 18,
        elevation: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 60, 0.92)',
        borderWidth: 1,
        borderColor: 'rgba(0,191,255,0.18)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    chipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingVertical: 2,
    },
    chipHeaderText: {
        marginLeft: 12,
        flex: 1,
    },
    chipAuthor: {
        fontWeight: 'bold',
        fontSize: 17, 
        color: '#00BFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0.5, height: 0.5 },
        textShadowRadius: 1,
    },
    chipTime: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
    },
    chipTitle: {
        fontSize: 19,
        fontWeight: 'bold',
        marginBottom: 7,
        color: '#fff',
        letterSpacing: 0.3,
        lineHeight: 24,
    },
    chipContent: {
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 10,
        color: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        textAlign: 'center',
        padding: 20,
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    composeChip: {
        flexDirection: 'row',
        padding: 14,
        backgroundColor: 'rgba(0, 0, 60, 0.85)',
        borderRadius: 16,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(0,191,255,0.13)',
        minHeight: 90,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.13,
        shadowRadius: 3,
        elevation: 3,
    },
    composeAvatar: {
        marginRight: 14,
        backgroundColor: '#06418E',
        borderWidth: 2,
        borderColor: 'rgba(0,191,255,0.25)',
    },
    composeInputWrapper: {
        flex: 1,
        justifyContent: 'center',
    },
    composeInput: {
        backgroundColor: 'rgba(255,255,255,0.09)',
        padding: 12,
        borderRadius: 20,
        minHeight: 40,
        justifyContent: 'center',
    },
    composeActions: {
        flexDirection: 'row',
        marginTop: 10,
        paddingHorizontal: 4,
    },
    composeAction: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    composeActionText: {
        color: '#BBBBBB',
        marginLeft: -6,
        fontSize: 13,
    },
    composeText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 15,
        fontWeight: '500',
    },
    subtitle: {
        fontSize: 18,
        color: '#CCCCCC',
        textAlign: 'center',
    },
    repliesSection: {
        padding: 14,
        backgroundColor: 'rgba(0,0,38,0.92)',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
    },
    repliesList: {
        marginTop: 6,
    },
    loadingIndicator: {
        margin: 16,
    },
    replyCard: {
        marginVertical: 7,
        backgroundColor: 'rgba(0, 0, 60, 0.85)',
        elevation: 1,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,191,255,0.10)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
    },
    replyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
        paddingVertical: 2,
    },
    replyAvatar: {
        backgroundColor: '#06418E',
        borderWidth: 1,
        borderColor: 'rgba(0,191,255,0.18)',
    },
    replyHeaderText: {
        marginLeft: 8,
        flex: 1,
    },
    replyAuthor: {
        fontWeight: 'bold',
        fontSize: 15,
        color: '#00BFFF',
    },
    replyTime: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
    },
    replyContent: {
        fontSize: 15,
        lineHeight: 20,
        color: '#fff',
        paddingHorizontal: 2,
    },
    replyActionText: {
        fontSize: 13,
        color: '#fff',
        fontWeight: '500',
    },
    replyInputContainer: {
        flexDirection: 'row',
        marginTop: 12,
        alignItems: 'center',
    },
    replyInput: {
        flex: 1,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.09)',
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,191,255,0.13)',
        marginRight: 8,
        color: '#fff',
        fontSize: 15,
        minHeight: 40,
    },
    replyButton: {
        borderRadius: 20,
        paddingVertical: 7,
        paddingHorizontal: 16,
        backgroundColor: '#00BFFF',
        minWidth: 80,
        minHeight: 40,
        elevation: 2,
    },
    buttonLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
    noRepliesText: {
        textAlign: 'center',
        padding: 12,
        fontStyle: 'italic',
        color: 'rgba(255,255,255,0.7)',
        fontSize: 15,
    },
    deleteButton: {
        marginLeft: 'auto',
        padding: 6,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,38,0.92)',
    },
    modalOuterContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,38,0.92)',
    },
    modalContent: {
        backgroundColor: 'rgba(0,0,38,0.99)',
        borderRadius: 18,
        padding: 20,
        width: '92%',
        maxHeight: '85%',
        borderWidth: 1,
        borderColor: 'rgba(0,191,255,0.18)',
        shadowColor: "#00BFFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.13,
        shadowRadius: 12,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        flex: 1,
        letterSpacing: 0.3,
        textShadowColor: 'rgba(0,191,255,0.3)',
        textShadowOffset: { width: 0.5, height: 0.5 },
        textShadowRadius: 1,
    },
    closeButton: {
        margin: 0,
        padding: 0,
    },
    modalUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        justifyContent: 'center',
    },
    modalAvatar: {
        backgroundColor: '#06418E',
        borderWidth: 1,
        borderColor: 'rgba(0,191,255,0.25)',
    },
    modalUsername: {
        marginLeft: 12,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#00BFFF',
        // Ensure username is always shown as @username
    },
    modalInput: {
        borderWidth: 1,
        borderColor: 'rgba(0,191,255,0.18)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        color: '#fff',
        backgroundColor: 'rgba(255,255,255,0.09)',
        fontSize: 15,
        minHeight: 40,
    },
    descriptionInput: {
        height: 90,
        textAlignVertical: 'top',
    },
    modalAttachments: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 14,
    },
    attachmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    attachmentText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 15,
        marginLeft: -8,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    cancelButton: {
        width: '45%',
        minHeight: 40,
        borderColor: '#00BFFF',
        borderWidth: 2,
        borderRadius: 10,
    },
    postButton: {
        width: '45%',
        minHeight: 40,
        backgroundColor: '#00BFFF',
        borderRadius: 10,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    countText: {
        color: '#00BFFF',
        fontSize: 15,
        marginRight: 8,
        marginHorizontal: 8,
        fontWeight: '600',
    },
    chipAvatar: {
        backgroundColor: '#06418E',
        borderWidth: 1,
        borderColor: 'rgba(0,191,255,0.25)',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        marginVertical: 40,
        backgroundColor: 'rgba(0,0,38,0.7)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,191,255,0.10)',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 10,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        marginBottom: 18,
        lineHeight: 20,
    },
    emptyButton: {
        marginTop: 10,
        backgroundColor: '#00BFFF',
        paddingHorizontal: 22,
        borderRadius: 20,
    },
    emptyButtonText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
});
