// app/(tabs)/profile.tsx
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      Alert.alert('Logged Out', 'Please log in again to continue');
      router.replace('/');
    } catch (error: any) {
      Alert.alert('Logout Failed', error.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Ionicons name="person-outline" size={80} color={COLORS.primary} />
        <Text style={{ fontSize: 18, marginVertical: 20, textAlign: 'center' }}>You are not logged in</Text>
        <TouchableOpacity
          style={{ backgroundColor: COLORS.primary, padding: 15, borderRadius: 8, width: '100%', alignItems: 'center' }}
          onPress={() => router.replace('/')}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={60} color={COLORS.primary} />
        </View>
        <Text style={styles.name}>{user.displayName || 'User'}</Text>
        <Text style={styles.role}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Account Information</Text>
        <Text style={styles.info}>📧 Email: {user.email}</Text>
        <Text style={styles.info}>🆔 User ID: {user.uid.slice(0, 10)}...</Text>
        <Text style={styles.info}>🌾 Role: {user.role.charAt(0).toUpperCase() + user.role.slice(1)}</Text>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Feature Coming Soon', 'Edit profile will be added later')}>
          <Ionicons name="create-outline" size={24} color={COLORS.text} />
          <Text style={styles.menuText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert('Kawasulink v1.0', 'Final Year Project Demo')}>
          <Ionicons name="information-circle-outline" size={24} color={COLORS.text} />
          <Text style={styles.menuText}>About App</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomWidth: 0 }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#F44336" />
          <Text style={[styles.menuText, { color: '#F44336' }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Kawasulink - Final Year Project</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { alignItems: 'center', padding: 30, backgroundColor: COLORS.primary, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  avatar: {
    width: 100,
    height: 100,
    backgroundColor: 'white',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  name: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  role: { fontSize: 16, color: 'white', opacity: 0.9 },
  infoCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee'
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: COLORS.primary },
  info: { fontSize: 15, marginBottom: 8, color: COLORS.text },
  menu: { backgroundColor: 'white', margin: 16, borderRadius: 12, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  menuText: { marginLeft: 15, fontSize: 16, color: COLORS.text },
  footer: { textAlign: 'center', marginTop: 30, color: '#888', fontSize: 12 },
});
