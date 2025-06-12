import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { jwtDecode } from "jwt-decode";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    setError(null);
    const userMessage = { text: input, sender: 'user', timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage.text }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const text = await response.text();

      let accumulatedText = "";

      setMessages(prev => [
        ...prev,
        { text: "", sender: "bot", timestamp: new Date().toISOString() }
      ]);

      const lines = text.split("\n").filter(Boolean);
      lines.forEach((line) => {
        try {
          const parsed = JSON.parse(line);
          if (parsed.chunk) {
            accumulatedText += parsed.chunk;
            setMessages(prev => {
              const updated = [...prev];
              const lastMessage = updated[updated.length - 1];
              if (lastMessage?.sender === "bot") {
                updated[updated.length - 1] = {
                  ...lastMessage,
                  text: accumulatedText,
                };
              }
              return updated;
            });
          }
        } catch (err) {
          console.error("Failed to parse chunk:", err);
        }
      });

    } catch (error: any) {
      console.error("Message error:", error);
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
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
                  <Text style={styles.botText}>{msg.text}</Text>
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
        maxWidth: '85%',
        borderRadius: 16,
        padding: 12,
        alignSelf: 'flex-start',
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
        flexDirection: 'row',
    },
    botBubble: {
        backgroundColor: '#1E90FF',
        alignSelf: 'flex-start',
        borderTopLeftRadius: 4,
        flexDirection: 'row',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userText: {
        color: '#fff',
        fontSize: 16,
        marginRight: 8,
        flexShrink: 1,
    },
    botText: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 8,
        flexShrink: 1,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginLeft: 4,
        borderWidth: 1,
        borderColor: '#fff',
    },
    woodyIcon: {
        backgroundColor: '#000080',
        borderRadius: 16,
        padding: 2,
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
});
