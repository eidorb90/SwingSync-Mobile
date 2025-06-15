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

  useEffect(() => {
    fetchTokenAndSetUserID();
  }, []);

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
      
      // Request permissions
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
        
        // Convert video to base64
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

    setError(null);
    const userMessage = { text: input, sender: 'user', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

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
        <Text style={styles.title}>Woody Chat</Text>
        <Text style={styles.subtitle}>Ask Woody anything about your golf game!</Text>
      </View>
      <View style={styles.chatContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesScroll}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <Text style={styles.emptyText}>Say hi to Woody and ask your golf questions!</Text>
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
                  <Ionicons name="golf" size={24} color="#fff" style={styles.woodyIcon} />
                  <Markdown style={markdownStyles}>{msg.text}</Markdown>
                </View>
              )}
            </View>
          ))}
          {loading && (
            <View style={[styles.messageBubble, styles.botBubble]}>
              <View style={styles.row}>
                <Ionicons name="golf" size={24} color="#fff" style={styles.woodyIcon} />
                <ActivityIndicator color="#00BFFF" size="small" style={{ marginLeft: 8 }} />
              </View>
            </View>
          )}
        </ScrollView>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {addVideo && videoName && (
        <View style={styles.videoPreview}>
          <Text style={styles.videoPreviewText}>Video ready: {videoName}</Text>
          <TouchableOpacity onPress={() => { setAddVideo(false); setVideoData(null); setVideoName(null); }}>
            <Ionicons name="close-circle" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.inputBar}>
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
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendMessage}
          disabled={loading || !input.trim()}
        >
          <Ionicons name="send" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sendButton, { marginLeft: 8, backgroundColor: addVideo ? "#FF0000" : (addRounds ? "#00FF00" : "#0000FF") }]}
          disabled={addVideo}
          onPress={() => setAddRounds(!addRounds)}
        >
          <Text style={{ color: '#fff', fontSize: 12 }}>Rounds</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sendButton, {marginLeft: 8, backgroundColor: uploadingVideo ? "#FFA500" : (addVideo ? "#00FF00" : "#0000FF")}]} 
          onPress={pickVideo}
          disabled={uploadingVideo}
        >
          {uploadingVideo ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Entypo name="attachment" size={24} color="white" />
          )}
        </TouchableOpacity>
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
        paddingTop: 40,
        paddingBottom: 10,
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 4,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 6,
        textAlign: 'center',
    },
    chatContainer: {
        flex: 1,
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
    messagesScroll: {
        flex: 1,
    },
    emptyText: {
        color: 'rgba(255,255,255,0.5)',
        textAlign: 'center',
        marginTop: 30,
        fontSize: 16,
    },
    messageBubble: {
        marginVertical: 6,
        maxWidth: '95%',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    userBubble: {
        backgroundColor: '#00BFFF',
        alignSelf: 'flex-end',
        borderTopRightRadius: 4,
    },
    botBubble: {
        backgroundColor: '#1E90FF',
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
    },
    botText: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 8,
        flexShrink: 1,
        flex: 1,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        marginLeft: 4,
        borderWidth: 1,
        borderColor: '#fff',
        alignSelf: 'flex-end',
    },
    woodyIcon: {
        backgroundColor: '#000080',
        borderRadius: 16,
        padding: 2,
        marginRight: 8,
        alignSelf: 'flex-start',
    },
    inputBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingBottom: Platform.OS === "ios" ? 24 : 10,
        backgroundColor: 'rgba(0,0,0,0.15)',
        marginBottom: 56,
    },
    input: {
        flex: 1,
        marginRight: 8,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 8,
        fontSize: 16,
    },
    sendButton: {
        backgroundColor: "#0000FF",
        borderRadius: 8,
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 1,
    },
    error: {
        color: "#ff6b6b",
        backgroundColor: 'rgba(255, 107, 107, 0.15)',
        padding: 8,
        borderRadius: 8,
        marginHorizontal: 16,
        marginBottom: 8,
        textAlign: 'center',
        fontSize: 15,
    },
    videoPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(0, 191, 255, 0.2)',
        padding: 10,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#00BFFF',
    },
    videoPreviewText: {
        color: '#fff',
        fontSize: 14,
        flex: 1,
    },
});

const markdownStyles = StyleSheet.create({
    // General body text for Markdown content inside a bubble
    body: {
        color: '#fff', // White text for bot messages
        fontSize: 16,
        lineHeight: 22,
        flexShrink: 1,
        flexWrap: 'wrap', // Explicitly enables text wrapping within Text components
    },
    // Headings
    heading1: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 10,
        marginBottom: 5,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    heading2: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
        marginBottom: 4,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    heading3: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 6,
        marginBottom: 3,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    strong: {
        fontWeight: 'bold',
    },
    em: {
        fontStyle: 'italic',
    },
    link: {
        color: '#ADD8E6',
        textDecorationLine: 'underline',
    },
    listUnorderedItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    listOrderedItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    listItem: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 22,
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    code: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 6,
        padding: 8,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#ADFF2F',
        marginTop: 5,
        marginBottom: 5,
        flexShrink: 1,
        flexWrap: 'wrap', // Important for code blocks
        overflow: 'hidden', // Helps if code is extremely long
    },
    inlineCode: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 4,
        paddingHorizontal: 4,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        color: '#ADFF2F',
    },
    blockquote: {
        borderLeftColor: '#7B68EE',
        borderLeftWidth: 4,
        paddingLeft: 10,
        opacity: 0.9,
        marginTop: 5,
        marginBottom: 5,
        flexShrink: 1,
        flexWrap: 'wrap',
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
