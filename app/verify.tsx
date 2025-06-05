import { Text, TextInput, Button } from 'react-native-paper';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

export default function VerifyScreen() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null); 
    const [verificationCode, setVerificationCode] = useState("");
    const [email, setEmail] = useState("");

    const router = useRouter();

    const handleVerify = async () => {
        if (!email || !verificationCode) {
            setError("Please enter both email and verification code");
            setSuccess(null);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`${BACKEND_URL}/api/user/verify/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, code: verificationCode }),
            });

            const result = await response.json();

            if (response.ok) {
                setLoading(false);
                router.push('/auth');
            } else {
                setLoading(false);
                setError(result.detail || "Verification failed. Please try again.");
            }
        } catch (err) {
            setLoading(false);
            setError("Network error. Please check your connection.");
            console.error("Verification error:", err);
        }
    }

    const handleResendCode = async () => {
        if (!email) {
            setError("Please enter your email address");
            setSuccess(null);
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch(`${BACKEND_URL}/api/user/verify/resend/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });
            
            setLoading(false);
            if (response.ok) {
                setSuccess("Verification code sent! Please check your email.");
            } else {
                const result = await response.json();
                setError(result.detail || "Failed to resend code. Please try again.");
            }
        } catch (err) {
            setLoading(false);
            setError("Network error. Please check your connection.");
            console.error("Resend code error:", err);
        }
    }

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
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
            <LinearGradient style={styles.background} colors={['#000026', "#000080", '#000026']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.content}>
                    <Text style={styles.title} variant="headlineMedium">Verify Account</Text>
                    
                    <TextInput 
                        label="Account Email" 
                        value={email}
                        mode="outlined" 
                        style={styles.input} 
                        autoCapitalize="none" 
                        keyboardType="email-address"
                        placeholder="user@example.com" 
                        onChangeText={setEmail}
                        outlineColor="rgba(255, 255, 255, 0.3)"
                        activeOutlineColor="#00BFFF"
                        textColor="#FFFFFF"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                    />
                    
                    <TextInput 
                        label="Verification Code" 
                        value={verificationCode}
                        mode="outlined" 
                        style={styles.input} 
                        autoCapitalize="none" 
                        placeholder="Enter your verification code" 
                        onChangeText={setVerificationCode}
                        outlineColor="rgba(255, 255, 255, 0.3)"
                        activeOutlineColor="#00BFFF"
                        textColor="#FFFFFF"
                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                        theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                    />
                    
                    {error && <Text style={{ color: 'red', marginBottom: 10 }}>{error}</Text>}
                    {success && <Text style={{ color: 'green', marginBottom: 10 }}>{success}</Text>}
                    
                    <Button 
                        mode="contained" 
                        style={styles.button} 
                        onPress={() => handleVerify()}>
                        Verify
                    </Button>
                    
                    <Button 
                        mode="text" 
                        labelStyle={{ color: '#fff' }} 
                        style={styles.textButton}
                        onPress={() => handleResendCode()}>
                        Resend Verification Code
                    </Button>

                    <Button
                        mode="text" 
                        labelStyle={{ color: '#fff' }} 
                        style={styles.textButton}
                        onPress={() => router.push('/auth')}>
                        Back to Login
                    </Button>
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
    textButton: {
        marginTop: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});