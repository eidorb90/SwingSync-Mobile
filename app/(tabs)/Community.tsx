import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import CommunityHomePage from '../components/CommunityHomePage';

export default function CommunityScreen() {
    return (
        <LinearGradient style={styles.background} colors={['#000026', "#000080", '#000026']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.container}>
                <CommunityHomePage />
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
    }
});
