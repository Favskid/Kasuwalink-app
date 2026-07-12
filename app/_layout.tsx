// app/_layout.tsx
import { Stack } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { auth } from '../config/firebaseConfig';
import { COLORS } from '../constants/colors';

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  if (initializing) {
    return (
      <View style={styles.splash}>
        <Text style={styles.logo}>🌾</Text>
        <Text style={styles.brand}>Kasuwalink</Text>
        <Text style={styles.tagline}>Farm to Market</Text>
        <ActivityIndicator
          size="large"
          color={COLORS.primaryLight}
          style={{ marginTop: 40 }}
        />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="admin" />
      <Stack.Screen name="chat/[threadId]" />
      <Stack.Screen
        name="verify"
        options={{
          headerShown: true,
          title: 'Verify Account',
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  logo: {
    fontSize: 72,
    marginBottom: 12,
  },
  brand: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
    marginTop: 6,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
