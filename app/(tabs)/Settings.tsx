import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const [token, setToken] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    getToken();
  }, []);

  const getToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("authToken");
      setToken(storedToken);
      if (storedToken) {
        console.log("Token retrieved:", storedToken);
      } else {
        console.log("No token found");
      }
    } catch (e) {
      console.error("Failed to retrieve token:", e);
    }
  };

  const redirectToAuth = () => {
    router.push("/auth");
  };

  const clearToken = async () => {
    try {
      await AsyncStorage.removeItem("authToken");
      redirectToAuth();
      setToken(null);
      console.log("Token cleared");
    } catch (e) {
      console.error("Failed to clear token:", e);
    }
  };

  return (
    <View style={styles.view}>
      <Text style={styles.title}>Welcome to SwingSync!</Text>
      <Text style={styles.tokenLabel}>Auth Token:</Text>
      <Text style={styles.tokenValue}>{token ? token : "No token stored"}</Text>
      <View style={styles.buttonRow}>
        <Button title="Refresh Token" onPress={getToken} />
        <Button title="Clear Token" onPress={clearToken} color="#d9534f" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  view: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 24,
  },
  tokenLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  tokenValue: {
    fontSize: 14,
    marginBottom: 24,
    color: "#555",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
});