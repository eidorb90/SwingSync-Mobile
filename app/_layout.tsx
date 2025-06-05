import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { AuthProvider } from "../context/AuthContext";

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
    <AuthProvider>
      <RootLayout />
    </AuthProvider>
  );
}