// app/register.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../constants/colors';
import { UserRole } from '../types';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('buyer');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, displayName, role);
      Alert.alert('Success', 'Account created! Welcome to Kawasulink');
      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
    }
    setLoading(false);
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.glassCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="leaf-outline" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the agricultural marketplace today</Text>

          <TextInput style={styles.input} placeholder="Full Name" value={displayName} onChangeText={setDisplayName} placeholderTextColor={COLORS.textLight} />
          <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={COLORS.textLight} />
          
          <View style={styles.passwordContainer}>
            <TextInput 
              style={styles.passwordInput} 
              placeholder="Password (min 6 chars)" 
              value={password} 
              onChangeText={setPassword} 
              secureTextEntry={!showPassword} 
              placeholderTextColor={COLORS.textLight}
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          <Text style={styles.roleLabel}>I am a:</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity 
              style={[styles.roleButton, role === 'farmer' && styles.roleButtonActive]} 
              onPress={() => setRole('farmer')}
            >
              <Ionicons name="leaf" size={20} color={role === 'farmer' ? COLORS.primary : COLORS.textLight} />
              <Text style={[styles.roleText, role === 'farmer' && styles.roleTextActive]}>Farmer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.roleButton, role === 'buyer' && styles.roleButtonActive]} 
              onPress={() => setRole('buyer')}
            >
              <Ionicons name="cart" size={20} color={role === 'buyer' ? COLORS.primary : COLORS.textLight} />
              <Text style={[styles.roleText, role === 'buyer' && styles.roleTextActive]}>Buyer</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/login')} style={styles.linkContainer}>
            <Text style={styles.linkText}>Already have an account? <Text style={styles.linkTextBold}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginBottom: 25 },
  input: {
    backgroundColor: 'rgba(249, 250, 251, 0.8)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    color: COLORS.text,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 250, 251, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
  },
  eyeIcon: {
    padding: 16,
  },
  roleLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textLight, marginBottom: 10, textTransform: 'uppercase' },
  roleContainer: { flexDirection: 'row', gap: 12, marginBottom: 25 },
  roleButton: { 
    flex: 1, 
    flexDirection: 'row',
    gap: 8,
    padding: 16, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 12, 
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(249, 250, 251, 0.8)'
  },
  roleButtonActive: { 
    borderColor: COLORS.primary, 
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
  },
  roleText: { fontSize: 16, fontWeight: '600', color: COLORS.textLight },
  roleTextActive: { color: COLORS.primary },
  button: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  linkContainer: { marginTop: 24, alignItems: 'center' },
  linkText: { color: COLORS.textLight, fontSize: 15 },
  linkTextBold: { color: COLORS.primary, fontWeight: 'bold' },
});
