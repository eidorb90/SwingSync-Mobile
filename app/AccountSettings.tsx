import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, TextInput, Snackbar } from 'react-native-paper';
import { Stack } from 'expo-router';
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

export default function AccountSettingsScreen() {
    const [username, setUsername] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [userID, setUserID] = useState<string>('');
    const [token, setToken] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);
    const [saveLoading, setSaveLoading] = useState<boolean>(false);
    const [userData, setUserData] = useState<any>(null);
    const [error, setError] = useState<string>('');
    const [isChanged, setIsChanged] = useState<boolean>(false);
    const [possibleUsername, setPossibleUsername] = useState<string>("");
    const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
    const [snackbarMessage, setSnackbarMessage] = useState<string>("");

    const router = useRouter();

    useEffect(() => {
        fetchTokenAndSetUserID();
    }, []);

    useEffect(() => {
        if (userID && token) {
            fetchUserData();
        }
    }, [userID, token]);

    
    
    useEffect(() => {
        if (possibleUsername && possibleUsername !== username) {
            setIsChanged(true);
        } else {
            setIsChanged(false);
        }
    }, [possibleUsername, username]);

    const saveChanges = useCallback(async () => {
        if (possibleUsername && possibleUsername !== username) {
            setSaveLoading(true);
            try {
                const response = await fetch(`${BACKEND_URL}/api/user/${userID}/settings/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ username: possibleUsername }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Error saving changes");
                }

                const data = await response.json();
                setUserData(data);
                setUsername(data.username);
                setIsChanged(false);
                showSnackbar("Username updated successfully");
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Error saving changes");
                showSnackbar("Failed to update username");
            } finally {
                setSaveLoading(false);
            }
        }
    }, [possibleUsername, username, userID, token]);

    const resetPassword = useCallback(async () => {
        if (email) {
            try {
                setLoading(true);
                const response = await fetch(`${BACKEND_URL}/api/user/reset_password/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || "Error resetting password");
                }
                
                showSnackbar("Password reset email sent! Check your inbox.");
            } catch (err: any) {
                console.error(err);
                setError(err.message || "Error resetting password");
                showSnackbar("Failed to send reset email");
            } finally {
                setLoading(false);
            }
        }
    }, [email]);

    const showSnackbar = (message: any) => {
        setSnackbarMessage(message);
        setSnackbarVisible(true);
    };

    const redirectToAuth = () => {
        router.push('/auth');
    }

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

    const fetchUserData = useCallback(async () => {
        if (!userID || !token) {
            setError("User ID or token is missing");
            return;
        }

        try {
            setLoading(true);
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
            if (data.email) {
                setEmail(data.email)
            }
        } catch (err) {
            console.error("Error fetching user data:", err);
            setError("Failed to fetch user data");
        } finally {
            setLoading(false);
        }
    }, [userID, token]);

    const confirmPasswordReset = () => {
        Alert.alert(
            "Reset Password",
            `We'll send a password reset link to ${email}. Continue?`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Send", onPress: resetPassword }
            ]
        );
    };

    return (
        <>
            <StatusBar style="light" backgroundColor="#000026" />
            <Stack.Screen 
                options={{
                    title: "Account Settings",
                    headerStyle: {
                        backgroundColor: '#000080',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerBackTitle: 'Settings',
                }}
            />
            <View style={{flex: 1, backgroundColor: '#000026'}}>
                <LinearGradient 
                    style={{flex: 1, width: '100%', height: '100%'}} 
                    colors={['#000026', "#000080", '#000026']} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }}
                >
                    <ScrollView 
                        style={{flex: 1}}
                        contentContainerStyle={{paddingBottom: 40}}
                    >
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.loadingText}>Loading...</Text>
                            </View>
                        ) : (
                            <View style={styles.contentContainer}>
                                <View style={styles.section}>
                                    <Text style={styles.title}>Username</Text>
                                    <Text style={styles.current}>@{username}</Text>
                                    <TextInput 
                                        label="Change Username" 
                                        mode="outlined" 
                                        style={styles.input} 
                                        autoCapitalize="none" 
                                        placeholder="New Username" 
                                        value={possibleUsername}
                                        onChangeText={setPossibleUsername}
                                        outlineColor="rgba(255, 255, 255, 0.3)"
                                        activeOutlineColor="#00BFFF"
                                        textColor="#FFFFFF"
                                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                        theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                                    />
                                </View>
                                
                                <View style={styles.section}>
                                    <Text style={styles.title}>Email</Text>
                                    <Text style={styles.current}>{email}</Text>
                                    <Text style={styles.helperText}>Email cannot be changed. Contact support if needed.</Text>
                                </View>
                                
                                <View style={styles.section}>
                                    <Text style={styles.title}>Password</Text>
                                    <Button 
                                        mode="outlined"
                                        style={styles.resetButton}
                                        labelStyle={styles.resetButtonText} 
                                        onPress={confirmPasswordReset}
                                    >
                                        Reset Password
                                    </Button>
                                </View>
                                
                                {isChanged && (
                                    <Button 
                                        mode="contained"
                                        style={styles.saveButton}
                                        loading={saveLoading}
                                        disabled={saveLoading}
                                        onPress={saveChanges}
                                    >
                                        Save Changes
                                    </Button>
                                )}
                            </View>
                        )}
                    </ScrollView>
                </LinearGradient>
            </View>
            
            <Snackbar
                visible={snackbarVisible}
                onDismiss={() => setSnackbarVisible(false)}
                duration={3000}
                action={{
                    label: 'Close',
                    onPress: () => setSnackbarVisible(false),
                }}
            >
                {snackbarMessage}
            </Snackbar>
        </>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        minHeight: 300,
    },
    loadingText: {
        color: '#fff',
        fontSize: 18,
    },
    contentContainer: {
        padding: 20,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 30,
        textAlign: 'center',
    },
    section: {
        marginBottom: 30,
        backgroundColor: 'rgba(0, 0, 38, 0.3)',
        padding: 16,
        borderRadius: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        textAlign: 'left',
    },
    current: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 15,
    },
    resetButtonText: {
        fontSize: 16,
        color: "#FF6B6B"
    },
    resetButton: {
        borderColor: "#FF6B6B",
    },
    input: {
        marginBottom: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 8,
    },
    helperText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontStyle: 'italic',
        fontSize: 14,
    },
    saveButton: {
        marginTop: 20,
        backgroundColor: '#00BFFF',
        padding: 5,
    }
});