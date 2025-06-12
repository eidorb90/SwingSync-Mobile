import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { DefaultTheme, Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../context/AuthContext";

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#0000FF", // This matches your button color
    accent: "#00BFFF", // This matches your active outline color
  },
};

function RootLayout() {
  const router = useRouter();
  const { isAuthenticated, loading, needsVerification } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (needsVerification) {
        router.replace("/verify");
      } else if (!isAuthenticated) {
        router.replace("/auth");
      }
    }
  }, [isAuthenticated, loading, needsVerification]);

  if (loading) return null;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="verify" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function LayoutWrapper() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <RootLayout />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}