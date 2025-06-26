import { useAuth } from "@/context/AuthContext";
import Constants from "expo-constants";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text, TextInput, useTheme } from "react-native-paper";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

export default function AuthScreen() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [age, setAge] = useState("");  
    const [location, setLocation] = useState(""); 
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const theme = useTheme();
    const router = useRouter();
    const { loading, signIn, signUp } = useAuth();

    const resetSign = () => {
        setFirstName("");
        setLastName("");
        setAge("");
        setLocation("");
        setEmail("");
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setError(null);
        setIsSignUp((prev) => !prev);
    };

    const handleAuth = async () => {
        if (!username || username.length < 3) {
            setError("Username must be at least 3 characters long");
            return;
        }
        if (!password || password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        if (isSignUp) {
            if (!firstName || !lastName || !email || !confirmPassword) {
                setError("All fields are required for sign up");
                return;
            }

            if (password !== confirmPassword) {
                setError("Passwords do not match");
                return;
            }

            if (!email.includes("@")) {
                setError("Invalid email address");
                return;
            }
        }

        setError(null);
        if (isSignUp) {
            const errorMsg = await signUp(firstName, lastName, age, location, email, username, password, confirmPassword);
            if (errorMsg) {
                setError(errorMsg);
            }
        } else {
            const errorMsg = await signIn(username, password);
            if (errorMsg) {
                if (errorMsg === "UNVERIFIED_ACCOUNT") {
                    setError("Account not verified. Please check your email for verification.");
                } else {
                    setError(errorMsg);
                }
            }
        }
    };

    if (loading) {
        return (
            <LinearGradient style={styles.background} colors={['#000026', "#000080", '#000026']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator animating={true} color={"#FF00FF"} size="large" />
                    <Text style={{ color: '#fff', marginTop: 10 }}>Loading...</Text>
                </View>
            </LinearGradient>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <LinearGradient style={styles.background} colors={['#000026', "#000080", '#000026']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.content}>
                    <Text style={styles.title} variant="headlineMedium">
                        {isSignUp ? "Create Account" : "Welcome back"}
                    </Text>

                    {isSignUp && (
                        <>
                            <TextInput
                                label="First Name"
                                value={firstName}
                                autoCapitalize="none"
                                placeholder="Brodie"
                                mode="outlined"
                                onChangeText={setFirstName}
                                style={styles.input}
                                outlineColor="rgba(255, 255, 255, 0.3)"
                                activeOutlineColor="#00BFFF"
                                textColor="#FFFFFF"
                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                            />
                            <TextInput
                                label="Last Name"
                                value={lastName}
                                autoCapitalize="none"
                                placeholder="Rogers"
                                mode="outlined"
                                onChangeText={setLastName}
                                style={styles.input}
                                outlineColor="rgba(255, 255, 255, 0.3)"
                                activeOutlineColor="#00BFFF"
                                textColor="#FFFFFF"
                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                            />
                            <TextInput
                                label="Email"
                                value={email}
                                autoCapitalize="none"
                                placeholder="Brodie@swing-sync.com"
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                mode="outlined"
                                style={styles.input}
                                outlineColor="rgba(255, 255, 255, 0.3)"
                                activeOutlineColor="#00BFFF"
                                textColor="#FFFFFF"
                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                            />
                        </>
                    )}

                    <TextInput
                        label="Username"
                        value={username}
                        autoCapitalize="none"
                        placeholder="brodi"
                        mode="outlined"
                        onChangeText={setUsername}
                        style={styles.input}
                        outlineColor="rgba(255, 255, 255, 0.3)"
                        activeOutlineColor="#00BFFF"
                        textColor="#FFFFFF"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                    />
                    <TextInput
                        label="Password"
                        value={password}
                        secureTextEntry={true}
                        autoCapitalize="none"
                        mode="outlined"
                        onChangeText={setPassword}
                        style={styles.input}
                        outlineColor="rgba(255, 255, 255, 0.3)"
                        activeOutlineColor="#00BFFF"
                        textColor="#FFFFFF"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                    />

                    {isSignUp && (
                        <TextInput
                            label="Confirm Password"
                            value={confirmPassword}
                            secureTextEntry={true}
                            autoCapitalize="none"
                            mode="outlined"
                            onChangeText={setConfirmPassword}
                            style={styles.input}
                            outlineColor="rgba(255, 255, 255, 0.3)"
                            activeOutlineColor="#00BFFF"
                            textColor="#FFFFFF"
                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                            theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                        />
                    )}

                    {error && <Text style={{ color: theme.colors.error, marginBottom: 10 }}>{error}</Text>}

                    <Button mode="contained" style={styles.button} onPress={handleAuth}>
                        {isSignUp ? "Sign Up" : "Sign In"}
                    </Button>

                    <Button mode="text" labelStyle={{ color: '#fff' }} onPress={resetSign}>
                        {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
                    </Button>

                    {!isSignUp && (
                        <Button mode="text" labelStyle={{ color: '#fff' }} onPress={() => router.replace("/verify")} style={styles.switchModeButton}>
                            Verify Account
                        </Button>
                    )}
                </View>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: "center",
    },
    title: {
        textAlign: "center",
        marginBottom: 24,
        color: "#fff",
        fontWeight: "bold",
        fontSize: 26,
    },
    input: {
        marginBottom: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 8,
    },
    button: {
        marginTop: 16,
        backgroundColor: "#0000FF",
        borderRadius: 8,
        paddingVertical: 6,
    },
    switchModeButton: {
        marginTop: 16,
    },
    loadingContainer: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    }
});