import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import ProfilePage from "../components/ProfilePage";

export default function ProfileScreen() {
    return (
        <LinearGradient 
            style={styles.container} 
            colors={['#000026', "#000080", '#000026']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.headerContainer}>
            </View>
            <View style={styles.profileContainer}>
                <ProfilePage />
            </View>
        </LinearGradient>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%', 
        height: '100%'
    },
    headerContainer: {
        padding: 20,
        paddingTop: 60, // Add more padding at top for status bar
    },
    headerText: {
        color: 'white',
        fontSize: 28, 
        fontWeight: 'bold'
    },
    profileContainer: {
        flex: 1,
        paddingHorizontal: 10,
    }
});