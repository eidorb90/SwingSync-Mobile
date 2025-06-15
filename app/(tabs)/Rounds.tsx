import { Text, Button } from 'react-native-paper';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RoundInput from '../components/RoundInput';


export default function RoundsScreen() {
    return (
        <LinearGradient style={styles.background} colors={['#000026', "#000080", '#000026']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <RoundInput />
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
});

