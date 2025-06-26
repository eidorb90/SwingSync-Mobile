import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Index() {
  const { isAuthenticated, needsVerification } = useAuth();
  
  if (needsVerification) {
    return <Redirect href="/verify" />;
  } else if (isAuthenticated) {
    return <Redirect href="/(tabs)/Home" />;
  } else {
    return <Redirect href="/auth" />;
  }
}