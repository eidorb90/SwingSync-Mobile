import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { jwtDecode } from 'jwt-decode';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text, TextInput } from 'react-native-paper';

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
                        keyboardShouldPersistTaps="handled"
                    >
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <Text style={styles.loadingText}>Loading...</Text>
                            </View>
                        ) : (
                            <View style={styles.outerContainer}>
                                <Text style={styles.pageTitle}> </Text>
                                <View style={styles.card}>
                                    <Text style={styles.sectionTitle}>Username</Text>
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
                                    <Text style={styles.helperText}>
                                        Your username is unique and visible to others.
                                    </Text>
                                </View>
                                
                                <View style={styles.card}>
                                    <Text style={styles.sectionTitle}>Email</Text>
                                    <Text style={styles.current}>{email}</Text>
                                    <Text style={styles.helperText}>Email cannot be changed. Contact support if needed.</Text>
                                </View>
                                
                                <View style={styles.card}>
                                    <Text style={styles.sectionTitle}>Password</Text>
                                    <Button 
                                        mode="outlined"
                                        style={styles.resetButton}
                                        labelStyle={styles.resetButtonText} 
                                        onPress={confirmPasswordReset}
                                        icon="lock-reset"
                                    >
                                        Reset Password
                                    </Button>
                                    <Text style={styles.helperText}>
                                        You will receive a password reset link at your email.
                                    </Text>
                                </View>
                                
                                {isChanged && (
                                    <Button 
                                        mode="contained"
                                        style={styles.saveButton}
                                        loading={saveLoading}
                                        disabled={saveLoading}
                                        onPress={saveChanges}
                                        icon="content-save"
                                        labelStyle={styles.saveButtonLabel}
                                    >
                                        Save Changes
                                    </Button>
                                )}
                                {error ? (
                                    <Text style={styles.errorText}>{error}</Text>
                                ) : null}
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
                style={styles.snackbar}
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
    outerContainer: {
        padding: 18,
        paddingTop: 8,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 18,
        textAlign: 'center',
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.25)',
        textShadowOffset: { width: 1, height: 2 },
        textShadowRadius: 4,
    },
    card: {
        backgroundColor: 'rgba(0,0,60,0.85)',
        borderRadius: 16,
        marginBottom: 22,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#00BFFF',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    current: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 10,
        fontWeight: '600',
    },
    input: {
        marginBottom: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 8,
    },
    helperText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontStyle: 'italic',
        fontSize: 14,
        marginTop: 2,
        marginBottom: 2,
    },
    resetButtonText: {
        fontSize: 16,
        color: "#FF6B6B",
        fontWeight: 'bold',
    },
    resetButton: {
        borderColor: "#FF6B6B",
        marginTop: 4,
        marginBottom: 6,
        borderRadius: 8,
    },
    saveButton: {
        marginTop: 10,
        backgroundColor: '#00BFFF',
        paddingVertical: 10,
        borderRadius: 10,
        elevation: 3,
        alignSelf: 'center',
        minWidth: 180,
    },
    saveButtonLabel: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 17,
        letterSpacing: 0.5,
    },
    errorText: {
        color: '#ff6b6b',
        textAlign: 'center',
        marginTop: 10,
        fontWeight: '600',
        fontSize: 15,
    },
    snackbar: {
        backgroundColor: '#232366',
        borderRadius: 8,
    },
});