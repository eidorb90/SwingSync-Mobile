import { Ionicons } from '@expo/vector-icons';
import Entypo from '@expo/vector-icons/Entypo';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { fetch } from 'expo/fetch';
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Markdown from 'react-native-markdown-display';
import { ActivityIndicator, Text, TextInput } from "react-native-paper";

const router = useRouter();
const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

export default function WoodyChatComponent() {
  const [token, setToken] = useState<string | null>(null);
  const [userID, setUserID] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("User");
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState<string>("");
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [addRounds, setAddRounds] = useState(false);
  const [addVideo, setAddVideo] = useState(false);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [videoData, setVideoData] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [usesBeforeAd, setUsesBeforeAd] = useState(3);

  useEffect(() => {
    fetchTokenAndSetUserID();
    loadUsageCount();
  }, []);

  const loadUsageCount = async () => {
    try {
      const count = await AsyncStorage.getItem('chatUsageCount');
      if (count) {
        setUsesBeforeAd(parseInt(count));
      }
    } catch (error) {
      console.error('Error loading usage count:', error);
    }
  };

  const saveUsageCount = async (count: number) => {
    try {
      await AsyncStorage.setItem('chatUsageCount', count.toString());
    } catch (error) {
      console.error('Error saving usage count:', error);
    }
  };

  const showAdPrompt = () => {
    Alert.alert(
      'Continue Chatting?',
      'You\'ve used your free messages! Watch a short ad to continue chatting with Woody.',
      [
        {
          text: 'Maybe Later',
          style: 'cancel',
        },
        {
          text: 'Continue',
          onPress: () => {
            Alert.alert(
              'Ad Watched!',
              'Thanks for watching! You can now continue chatting with Woody.',
              [
                {
                  text: 'Continue',
                  onPress: () => {
                    setUsesBeforeAd(3);
                    saveUsageCount(3);
                  }
                }
              ]
            );
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const fetchUserProfilePicture = useCallback(async () => {
    if (!userID) return;
    const token = await AsyncStorage.getItem("authToken");
    try {
      const cacheBust = Date.now();
      const response = await fetch(`${BACKEND_URL}/api/user/${userID}/profile_picture/?cache=${cacheBust}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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

  const pickVideo = async () => {
    try {
      setUploadingVideo(true);
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        setVideoData(base64);
        setVideoName(asset.fileName || `video_${Date.now()}.mp4`);
        setAddVideo(true);
        setAddRounds(false);
        
        Alert.alert("Video Selected", `${asset.fileName || 'Video'} is ready to send with your message.`);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert("Error", "Failed to select video. Please try again.");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    if (usesBeforeAd === 0) {
      showAdPrompt();
      return;
    }

    setError(null);
    const userMessage = { text: input, sender: 'user', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const newCount = usesBeforeAd - 1;
    setUsesBeforeAd(newCount);
    saveUsageCount(newCount);

    try {
        const payload: any = { 
          message: userMessage.text, 
          add_rounds: addRounds, 
          add_video: addVideo 
        };

        if (addVideo && videoData) {
          payload.video_data = videoData;
          payload.video_name = videoName;
        }

        if (videoURL) {
          payload.video_url = videoURL;
        }

        const response = await fetch(`${BACKEND_URL}/api/chat/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error("Failed to send message");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let botMessageIndex = -1;
        
        setMessages(prev => {
            const newMessages = [...prev, { text: "", sender: 'bot', timestamp: new Date().toISOString() }];
            botMessageIndex = newMessages.length - 1;
            return newMessages;
        });

        while (true) {
            const { done, value } = await reader?.read() || {};
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            setMessages(prev => {
                const newMessages = [...prev];
                if (botMessageIndex !== -1) {
                    newMessages[botMessageIndex] = {
                        ...newMessages[botMessageIndex],
                        text: newMessages[botMessageIndex].text + chunk
                    };
                }
                return newMessages;
            });
        }

    } catch (error: any) {
      console.error("Message error:", error);
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
      setAddRounds(false);
      setAddVideo(false);
      setVideoData(null);
      setVideoName(null);
    }
  };

  const fetchTokenAndSetUserID = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("authToken");
      if (storedToken) {
        setToken(storedToken);
        const decoded: any = jwtDecode(storedToken);
        setUserID(decoded.user_id);
        setUsername(decoded.username || "User");
        if (decoded.user_id) fetchUserProfilePicture();
      } else {
        router.replace("/auth");
      }
    } catch (e) {
      console.error("Failed to fetch token:", e);
      router.replace("/auth");
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }} keyboardVerticalOffset={80}>
      <StatusBar style="light" backgroundColor="#000026" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Woody Chat</Text>
          <Text style={styles.subtitle}>Professional golf insights at your fingertips</Text>
          {usesBeforeAd <= 1 && (
            <View style={styles.usageWarningContainer}>
              <Ionicons name="information-circle" size={14} color="#FFD700" style={{marginRight: 4}} />
              <Text style={styles.usageWarning}>
                {usesBeforeAd === 0 ? 'Watch ad to continue' : `${usesBeforeAd} message${usesBeforeAd === 1 ? '' : 's'} remaining`}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.chatContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="golf-outline" size={50} color="rgba(255,255,255,0.4)" />
              <Text style={styles.emptyText}>Ask Woody about your golf game, techniques, or equipment</Text>
            </View>
          )}
          {messages.map((msg, idx) => (
            <View
              key={idx}
              style={[
                styles.messageBubble,
                msg.sender === "user" ? styles.userBubble : styles.botBubble
              ]}
            >
              {msg.sender === "user" ? (
                <View style={styles.row}>
                  <Text style={styles.userText}>{msg.text}</Text>
                  {profilePicture ? (
                    <Image key={`profile-${forceRefresh}`} source={{ uri: profilePicture }} style={styles.avatar} />
                  ) : (
                    <Image source={require("../../assets/default-profile.png")} style={styles.avatar} />
                  )}
                </View>
              ) : (
                <View style={styles.row}>
                  <View style={styles.woodyIconContainer}>
                    <Ionicons name="flag" size={18} color="#fff" style={styles.woodyIcon} />
                  </View>
                  <Markdown style={markdownStyles}>{msg.text}</Markdown>
                </View>
              )}
            </View>
          ))}
          {loading && (
            <View style={[styles.messageBubble, styles.botBubble]}>
              <View style={styles.row}>
                <View style={styles.woodyIconContainer}>
                  <Ionicons name="flag" size={18} color="#fff" style={styles.woodyIcon} />
                </View>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#00BFFF" size="small" />
                  <Text style={styles.loadingText}>Analyzing...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#ff6b6b" style={{marginRight: 6}} />
          <Text style={styles.error}>{error}</Text>
        </View>
      )}
      {addVideo && videoName && (
        <View style={styles.videoPreview}>
          <View style={styles.videoPreviewContent}>
            <Ionicons name="videocam" size={16} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.videoPreviewText}>{videoName}</Text>
          </View>
          <TouchableOpacity 
            style={styles.videoPreviewClose} 
            onPress={() => { setAddVideo(false); setVideoData(null); setVideoName(null); }}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      
      <View style={styles.inputContainer}>
        <View style={styles.featureButtonsRow}>
          <TouchableOpacity 
            style={[
              styles.featureButton, 
              addRounds && styles.featureButtonActive,
              addVideo && styles.featureButtonDisabled
            ]}
            disabled={addVideo}
            onPress={() => setAddRounds(!addRounds)}
          >
            <Ionicons name="golf" size={18} color="#fff" />
            <Text style={styles.featureButtonText}>Include Rounds</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.featureButton, 
              uploadingVideo && styles.featureButtonUploading,
              addVideo && styles.featureButtonActive
            ]} 
            onPress={pickVideo}
            disabled={uploadingVideo}
          >
            {uploadingVideo ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Entypo name="attachment" size={18} color="white" />
                <Text style={styles.featureButtonText}>Attach Video</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={styles.input}
            mode="outlined"
            outlineColor="rgba(255,255,255,0.3)"
            activeOutlineColor="#00BFFF"
            textColor="#FFFFFF"
            theme={{ colors: { onSurfaceVariant: 'rgba(255,255,255,0.7)' } }}
            onSubmitEditing={handleSendMessage}
            editable={!loading}
            returnKeyType="send"
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton, 
              { opacity: (loading || !input.trim()) ? 0.5 : 1 }
            ]}
            onPress={handleSendMessage}
            disabled={loading || !input.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    header: {
        paddingTop: Platform.OS === "ios" ? 44 : 40,
        paddingBottom: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerContent: {
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: "#fff",
        marginBottom: 6,
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
        fontWeight: '400',
        letterSpacing: 0.2,
        textAlign: 'center',
    },
    usageWarningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    chatContainer: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    messagesScroll: {
        flex: 1,
    },
    messagesContent: {
        paddingBottom: 20,
        flexGrow: 1,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 60,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginTop: 16,
        fontSize: 16,
        lineHeight: 24,
    },
    messageBubble: {
        marginVertical: 8,
        maxWidth: '90%',
        borderRadius: 18,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
        elevation: 2,
    },
    userBubble: {
        backgroundColor: '#1E88E5',
        alignSelf: 'flex-end',
        borderTopRightRadius: 4,
    },
    botBubble: {
        backgroundColor: '#1A237E',
        alignSelf: 'flex-start',
        borderTopLeftRadius: 4,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        flex: 1,
        flexWrap: 'wrap',
    },
    userText: {
        color: '#fff',
        fontSize: 16,
        marginRight: 8,
        flexShrink: 1,
        flex: 1,
        lineHeight: 22,
    },
    botText: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 8,
        flexShrink: 1,
        flex: 1,
        lineHeight: 22,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        marginRight: 4,
        marginLeft: 8,
        borderWidth: 1,
        borderColor: '#fff',
        alignSelf: 'flex-end',
    },
    woodyIconContainer: {
        backgroundColor: '#000080',
        borderRadius: 14,
        padding: 4,
        marginRight: 10,
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    woodyIcon: {
        alignSelf: 'center',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    loadingText: {
        color: 'rgba(255,255,255,0.7)',
        marginLeft: 8,
        fontSize: 14,
    },
    inputContainer: {
        backgroundColor: 'rgba(0,0,0,0.25)',
        paddingTop: 14,
        paddingBottom: Platform.OS === "ios" ? 34 : 16,
        paddingHorizontal: 16,
        marginBottom: 56,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    featureButtonsRow: {
        flexDirection: 'row',
        marginBottom: 14,
        gap: 12,
    },
    featureButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 20,
        gap: 8,
        minWidth: 80,
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    featureButtonActive: {
        backgroundColor: "#1E88E5",
    },
    featureButtonDisabled: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        opacity: 0.5,
    },
    featureButtonUploading: {
        backgroundColor: "#FFA500",
    },
    featureButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 24,
        fontSize: 16,
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: "#1E88E5",
        borderRadius: 24,
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        width: 48,
        height: 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 107, 107, 0.15)',
        padding: 10,
        borderRadius: 8,
        marginHorizontal: 16,
        marginBottom: 12,
        justifyContent: 'center',
    },
    error: {
        color: "#ff6b6b",
        textAlign: 'center',
        fontSize: 14,
        flex: 1,
    },
    videoPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(30, 136, 229, 0.2)',
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#1E88E5',
    },
    videoPreviewContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    videoPreviewText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    videoPreviewClose: {
        padding: 4,
    },
    usageWarning: {
        color: '#FFD700',
        fontSize: 12,
        fontWeight: '500',
    },
});

const markdownStyles = StyleSheet.create({
    body: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 24,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    heading1: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 14,
        marginBottom: 8,
        flexShrink: 1,
        flexWrap: 'wrap',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
        paddingBottom: 6,
    },
    heading2: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 12,
        marginBottom: 6,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    heading3: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    strong: {
        fontWeight: 'bold',
        color: '#90CAF9',
    },
    em: {
        fontStyle: 'italic',
        color: '#E1F5FE',
    },
    link: {
        color: '#82B1FF',
        textDecorationLine: 'underline',
    },
    listUnorderedItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    listOrderedItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    listItem: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 24,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    code: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 6,
        padding: 10,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#ADFF2F',
        marginTop: 8,
        marginBottom: 8,
        flexShrink: 1,
        flexWrap: 'wrap',
        overflow: 'hidden',
    },
    inlineCode: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#ADFF2F',
    },
    blockquote: {
        borderLeftColor: '#7B68EE',
        borderLeftWidth: 4,
        paddingLeft: 12,
        opacity: 0.9,
        marginTop: 8,
        marginBottom: 8,
        flexShrink: 1,
        flexWrap: 'wrap',
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingTop: 8,
        paddingBottom: 8,
        paddingRight: 8,
        borderRadius: 4,
    },
    table: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 4,
        marginTop: 10,
        marginBottom: 10,
        flexShrink: 1,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
    },
    tableHeader: {
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    tableCell: {
        padding: 8,
        color: '#fff',
        fontSize: 14,
        flex: 1,
        flexWrap: 'wrap',
    },
});