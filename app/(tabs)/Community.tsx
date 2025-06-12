import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

export default function CommunityScreen() {
    return (
        <LinearGradient style={styles.background} colors={['#000026', "#000080", '#000026']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.container}>
                <Text style={styles.title}>Community</Text>
                <Text style={styles.subtitle}>Coming soon...</Text>
            </View>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#fff",
        marginBottom: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    }
});
