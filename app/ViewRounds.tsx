import { View } from 'react-native';
import { Text } from 'react-native-paper'
import { StatusBar } from 'expo-status-bar';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function ViewRounds() {
    return (
        <>
        <StatusBar style="light" backgroundColor="#000026" />
            <Stack.Screen 
                options={{
                    title: "",
                    headerStyle: {
                        backgroundColor: '#000080',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                    headerBackTitle: '',
                }}
            />
        <LinearGradient 
            style={{flex: 1, width: '100%', height: '100%'}} 
            colors={['#000026', "#000080", '#000026']} 
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 1 }}
        >
            <View>
                <Text>Comming Sonn...</Text>
            </View>
        </LinearGradient>

    
    </>
    )
}