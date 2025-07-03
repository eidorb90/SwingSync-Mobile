import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from 'expo-status-bar';
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import { Alert, Image, Platform, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Dialog, Paragraph, Portal, Text, TextInput } from "react-native-paper";

const BACKEND_URL = Constants.expoConfig?.extra?.BACKEND_URL;

export default function ChangeProfilePicture() {
    const router = useRouter();
    const [token, setToken] = useState<string | null>(null);
    const [userID, setUserID] = useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [uploading, setUploading] = useState<boolean>(false);

    const [action, setAction] = useState<string | null>(null);  
    const [look, setLook] = useState<string | null>(null);
    const [pose, setPose] = useState<string | null>(null);
    const [background, setBackground] = useState<string | null>(null);
    const [location, setLocation] = useState<string | null>(null);

    const [aiModalVisible, setAiModalVisible] = useState(false);

    useEffect(() => {
        fetchTokenAndSetUserID();
        requestPermissions();
    }, []);

    const requestPermissions = async () => {
        if (Platform.OS !== 'web') {
            const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
            if (cameraStatus !== 'granted') {
                Alert.alert('Permission needed', 'We need camera access to take photos');
            }
            
            const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (libraryStatus !== 'granted') {
                Alert.alert('Permission needed', 'We need photo library access to select images');
            }
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
                setTimeout(() => {
                    getProfilePicture();
                }, 500);
            } else {
                router.replace("/auth");
            }
        } catch (e) {
            console.error("Failed to fetch token:", e);
            router.replace("/auth");
        } finally {
            setLoading(false);
        }
    }

    const getProfilePicture = async () => {
        if (!userID || !token) return;
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/user/${userID}/profile_picture/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.profile_picture) {
                    setProfilePictureUri(data.profile_picture);
                }
            }
        } catch (error) {
            console.error("Error fetching profile picture:", error);
        }
    }

    const openImagePicker = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
                setProfilePictureUri(result.assets[0].uri);
                console.log('Selected image:', result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick an image');
        }
    };

    const handleCameraLaunch = async () => {
        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
                setProfilePictureUri(result.assets[0].uri);
                console.log('Captured image:', result.assets[0].uri);
            }
        } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('Error', 'Failed to take a photo');
        }
    };

    const genProfilePicture = async () => {
        console.log("Form values:", { action, look, pose, background, location });
        
        if (!action || !look || !pose || !background || !location) {
            Alert.alert("Error", "Please fill in all fields to generate a profile picture.");
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('action', action);
            formData.append('look', look);
            formData.append('pose', pose);
            formData.append('background', background);
            formData.append('location', location);

            console.log("Sending AI generation request with params:", 
                        JSON.stringify({action, look, pose, background, location}));

            const response = await fetch(`${BACKEND_URL}/api/user/${userID}/ai_gen_pfp/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            console.log("AI generation response status:", response.status);

            const responseText = await response.text();
            console.log("Response text:", responseText);
            
            let responseData;
            try {
                responseData = JSON.parse(responseText);
            } catch (e) {
                responseData = { error: "Could not parse response" };
            }

            if (!response.ok) {
                throw new Error(responseData.detail || 'Failed to generate profile picture');
            }
            
            if (responseData.profile_picture) {
                setProfilePictureUri(responseData.profile_picture);
                hideAiModal();
                
                await AsyncStorage.setItem('profileImageTimestamp', Date.now().toString());
                
                Alert.alert(
                    "Success", 
                    "AI profile picture generated and uploaded successfully!",
                    [
                        { 
                            text: "OK", 
                            onPress: () => {
                                router.back();
                            }
                        }
                    ]
                );
            } else {
                throw new Error("No profile picture URL in response");
            }

        } catch (error: any) {
            console.error('AI Profile Picture Generation Error:', error);
            Alert.alert("Error", error.message || "Failed to generate profile picture");
        } finally {
            setUploading(false);
        }
    }

    const uploadProfilePicture = async () => {
        if (!profilePictureUri || !token || !userID) {
            Alert.alert("Error", "Please select an image first");
            return;
        }

        if (profilePictureUri.includes(BACKEND_URL)) {
            Alert.alert(
                "Already Uploaded", 
                "This AI-generated image has already been uploaded to your profile!",
                [
                    { 
                        text: "OK", 
                        onPress: () => {
                            router.back();
                        }
                    }
                ]
            );
            return;
        }

        setUploading(true);

        try {
            const formData = new FormData();
            
            const uriParts = profilePictureUri.split('/');
            const fileName = uriParts[uriParts.length - 1];
            
            console.log(`Preparing to upload image: ${fileName} from ${profilePictureUri}`);
            
            // @ts-ignore
            formData.append('profile_picture', {
                uri: profilePictureUri,
                type: profilePictureUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
                name: fileName,
            });

            console.log("Uploading image...");

            const response = await fetch(`${BACKEND_URL}/api/user/${userID}/profile_picture/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            const responseText = await response.text();
            console.log("Raw response:", responseText);
            
            let responseData;
            try {
                responseData = JSON.parse(responseText);
                console.log("Upload response:", responseData);
            } catch (e) {
                console.log("Response is not valid JSON:", e);
                responseData = { detail: "Server returned an invalid response" };
            }

            if (!response.ok) {
                throw new Error(responseData.detail || `Upload failed with status ${response.status}`);
            }

            await AsyncStorage.setItem('profileImageTimestamp', Date.now().toString());
            
            Alert.alert(
                "Success", 
                "Profile picture updated successfully!",
                [
                    { 
                        text: "OK", 
                        onPress: () => {
                            router.back();
                        }
                    }
                ]
            );
        } catch (error: any) {
            console.error('Upload error:', error);
            
            if (error.message.includes("No such file or directory")) {
                Alert.alert(
                    "Upload Error", 
                    "The server had trouble processing your image. Please try selecting a different image format or taking a new photo.",
                    [
                        {
                            text: "Try Again",
                            onPress: () => {
                                setProfilePictureUri(null);
                            }
                        }
                    ]
                );
            } else {
                Alert.alert("Error", error.message || "Failed to upload profile picture");
            }
        } finally {
            setUploading(false);
        }
    };

    const showAiModal = () => setAiModalVisible(true);
    const hideAiModal = () => setAiModalVisible(false);

    return (
        <>
            <StatusBar style="light" backgroundColor="#000026" />
            <Stack.Screen
                options={{
                    title: "Profile Picture",
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
            <View style={{ flex: 1, backgroundColor: '#000026' }}>
                <LinearGradient
                    style={{ flex: 1, width: '100%', height: '100%' }}
                    colors={['#000026', "#000080", '#000026']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color="#00BFFF" size="large" />
                            <Text style={styles.loadingText}>Loading...</Text>
                        </View>
                    ) : (
                        <ScrollView style={{ flex: 1 }}>
                            <View style={styles.contentContainer}>
                                <Text style={styles.title}>Update Profile Picture</Text>
                                <Text style={styles.subtitle}>
                                    Choose a new profile photo or generate one with AI.
                                </Text>
                                <View style={styles.pictureContainer}>
                                    <View style={styles.profileImageContainer}>
                                        {profilePictureUri ? (
                                            <Image
                                                source={{ uri: profilePictureUri }}
                                                style={styles.profileImage}
                                            />
                                        ) : (
                                            <View style={styles.placeholderContainer}>
                                                <Text style={styles.placeholderText}>No image selected</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.buttonRow}>
                                        <Button
                                            mode="contained"
                                            onPress={openImagePicker}
                                            style={styles.pickButton}
                                            disabled={uploading}
                                            labelStyle={styles.buttonLabel}
                                            icon="image"
                                        >
                                            Gallery
                                        </Button>
                                        <Button
                                            mode="contained"
                                            onPress={handleCameraLaunch}
                                            style={styles.cameraButton}
                                            disabled={uploading}
                                            labelStyle={styles.buttonLabel}
                                            icon="camera"
                                        >
                                            Camera
                                        </Button>
                                    </View>
                                    {profilePictureUri && (
                                        <View style={styles.uploadButtonContainer}>
                                            {uploading ? (
                                                <View style={styles.uploadingContainer}>
                                                    <ActivityIndicator color="#FFC107" size="small" />
                                                    <Text style={styles.uploadingText}>
                                                        {profilePictureUri.includes(BACKEND_URL) ? "Processing..." : "Uploading..."}
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Button
                                                    mode="contained"
                                                    onPress={uploadProfilePicture}
                                                    style={[
                                                        styles.uploadButton,
                                                        profilePictureUri.includes(BACKEND_URL) && styles.disabledButton
                                                    ]}
                                                    labelStyle={styles.buttonLabel}
                                                    icon="cloud-upload"
                                                    disabled={profilePictureUri.includes(BACKEND_URL)}
                                                >
                                                    {profilePictureUri.includes(BACKEND_URL) 
                                                        ? "AI Image Uploaded" 
                                                        : "Upload"}
                                                </Button>
                                            )}
                                        </View>
                                    )}
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.pictureContainer}>
                                    <Text style={styles.sectionTitle}>AI Profile Picture Generator</Text>
                                    <Text style={styles.featureDescription}>
                                        Create a unique avatar with AI. Describe your desired look and let our AI do the rest!
                                    </Text>
                                    <Button
                                        mode="contained"
                                        style={styles.aiButton}
                                        labelStyle={styles.buttonLabel}
                                        onPress={showAiModal}
                                        icon="brain"
                                    >
                                        Generate with AI
                                    </Button>
                                </View>
                            </View>
                        </ScrollView>
                    )}
                </LinearGradient>
            </View>
            
            {/* AI Modal */}
            <Portal>
                <Dialog visible={aiModalVisible} onDismiss={hideAiModal} style={styles.aiModal}>
                    <Dialog.Title style={styles.aiModalTitle}>AI Profile Picture</Dialog.Title>
                    <Dialog.Content style={styles.dialogContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Paragraph style={styles.aiModalText}>
                                Fill in the details below to generate your custom avatar.
                            </Paragraph>
                            <TextInput
                                label="Action"
                                mode="outlined"
                                style={styles.aiTextInput}
                                outlineColor="rgba(255, 255, 255, 0.2)"
                                activeOutlineColor="#00BFFF"
                                textColor="#FFFFFF"
                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                                placeholder="What is your avatar doing?"
                                onChangeText={setAction}
                            />
                            <TextInput
                                label="Look"
                                mode="outlined"
                                style={styles.aiTextInput}
                                outlineColor="rgba(255, 255, 255, 0.2)"
                                activeOutlineColor="#00BFFF"
                                textColor="#FFFFFF"
                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                                placeholder="Describe the look"
                                onChangeText={setLook}
                            />
                            <TextInput
                                label="Pose"
                                mode="outlined"
                                style={styles.aiTextInput}
                                outlineColor="rgba(255, 255, 255, 0.2)"
                                activeOutlineColor="#00BFFF"
                                textColor="#FFFFFF"
                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                                placeholder="Describe the pose"
                                onChangeText={setPose}
                            />
                            <TextInput
                                label="Background"
                                mode="outlined"
                                style={styles.aiTextInput}
                                outlineColor="rgba(255, 255, 255, 0.2)"
                                activeOutlineColor="#00BFFF"
                                textColor="#FFFFFF"
                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                                placeholder="What's in the background?"
                                onChangeText={setBackground}
                            />
                            <TextInput
                                label="Location"
                                mode="outlined"
                                style={styles.aiTextInput}
                                outlineColor="rgba(255, 255, 255, 0.2)"
                                activeOutlineColor="#00BFFF"
                                textColor="#FFFFFF"
                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                theme={{ colors: { onSurfaceVariant: 'rgba(255, 255, 255, 0.7)' } }}
                                placeholder='Where is your avatar?'
                                onChangeText={setLocation}
                            />
                            <Button 
                                mode="contained"
                                style={styles.aiGenerateButton}
                                labelStyle={styles.aiGenerateButtonText}
                                onPress={genProfilePicture}
                                loading={uploading}
                                disabled={uploading}
                                icon="image-plus"
                            >
                                Generate
                            </Button>
                            <Button 
                                mode="outlined"
                                style={styles.closeButton}
                                labelStyle={styles.closeButtonText}
                                onPress={hideAiModal}
                            >
                                Cancel
                            </Button>
                        </ScrollView>
                    </Dialog.Content>
                </Dialog>
            </Portal>
        </>
    );
}

const styles = StyleSheet.create({
    contentContainer: {
        padding: 18,
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 6,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    subtitle: {
        color: '#b0c4de',
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 18,
        marginTop: 2,
    },
    pictureContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        borderRadius: 16,
        padding: 20,
        marginTop: 12,
        alignItems: 'center',
        width: '100%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,191,255,0.08)',
        marginBottom: 18,
    },
    profileImageContainer: {
        borderRadius: 80,
        overflow: 'hidden',
        height: 140,
        width: 140,
        marginBottom: 18,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 3.84,
        elevation: 4,
        borderWidth: 2,
        borderColor: '#00BFFF',
        backgroundColor: '#181848',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    placeholderContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,60,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: '#bbb',
        fontSize: 15,
        textAlign: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
        marginBottom: 10,
    },
    buttonLabel: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.3,
        color: '#fff',
        paddingVertical: 2,
    },
    pickButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 22,
        elevation: 2,
        flex: 1,
        marginRight: 6,
    },
    cameraButton: {
        backgroundColor: '#2196F3',
        borderRadius: 22,
        elevation: 2,
        flex: 1,
        marginLeft: 6,
    },
    uploadButton: {
        backgroundColor: '#FFC107',
        borderRadius: 22,
        elevation: 2,
        marginTop: 10,
    },
    aiButton: {
        backgroundColor: '#9C27B0',
        borderRadius: 22,
        elevation: 2,
        marginTop: 10,
        width: '100%',
    },
    uploadButtonContainer: {
        marginTop: 12,
        width: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#fff',
        marginTop: 16,
        fontSize: 17,
    },
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.10)',
        borderRadius: 22,
        padding: 10,
    },
    uploadingText: {
        color: '#FFC107',
        marginLeft: 10,
        fontSize: 15,
        fontWeight: '600',
    },
    sectionTitle: {
        color: '#00BFFF',
        fontWeight: 'bold',
        fontSize: 18,
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    featureDescription: {
        color: '#e0e0e0',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    divider: {
        width: '80%',
        height: 1,
        backgroundColor: 'rgba(0,191,255,0.18)',
        alignSelf: 'center',
        marginVertical: 18,
        borderRadius: 1,
    },
    aiModal: {
        backgroundColor: 'rgba(0, 0, 50, 0.98)',
        borderRadius: 18,
        maxHeight: '85%',
        paddingBottom: 0,
    },
    dialogContent: {
        paddingHorizontal: 6,
        paddingBottom: 10,
    },
    aiModalTitle: {
        color: '#00BFFF',
        fontSize: 21,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 8,
        letterSpacing: 0.5,
    },
    aiModalText: {
        color: '#ffffff',
        marginBottom: 16,
        lineHeight: 20,
        fontSize: 15,
        textAlign: 'center',
    },
    aiTextInput: {
        marginBottom: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.10)',
        borderRadius: 8,
    },
    aiGenerateButton: {
        marginTop: 10,
        backgroundColor: "#0000FF",
        borderRadius: 8,
        paddingVertical: 6,
        width: '100%',
    },
    aiGenerateButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '600',
    },
    closeButton: {
        marginTop: 10,
        borderRadius: 8,
        borderColor: "#d9534f",
        borderWidth: 1,
        width: '100%',
    },
    closeButtonText: {
        color: '#d9534f',
        fontSize: 15,
        fontWeight: '600',
    },
    disabledButton: {
        backgroundColor: '#666',
        opacity: 0.6,
    },
});