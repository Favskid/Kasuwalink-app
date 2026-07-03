// app/(tabs)/profile.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { COLORS } from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function ProfileScreen() {
  const { user, logout, updateProfileData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhone(user.phone || '');
      setLocation(user.location || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfileData(user.uid, { displayName, phone, location });
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Logout Error', e.message);
    }
  };

  if (!user) return <ActivityIndicator style={styles.center} color={COLORS.primary} />;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-circle-outline" size={100} color={COLORS.primary} />
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.glassCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Personal Information</Text>
            <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
              {saving ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <Text style={styles.editText}>{isEditing ? 'Save' : 'Edit'}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={24} color={COLORS.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.label}>Full Name</Text>
              {isEditing ? (
                <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} />
              ) : (
                <Text style={styles.value}>{user.displayName || 'Not provided'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={24} color={COLORS.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.label}>Email Address</Text>
              <Text style={styles.value}>{user.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={24} color={COLORS.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.label}>Phone Number</Text>
              {isEditing ? (
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              ) : (
                <Text style={styles.value}>{user.phone || 'Not provided'}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={24} color={COLORS.textLight} />
            <View style={styles.infoContent}>
              <Text style={styles.label}>Location / Address</Text>
              {isEditing ? (
                <TextInput style={styles.input} value={location} onChangeText={setLocation} />
              ) : (
                <Text style={styles.value}>{user.location || 'Not provided'}</Text>
              )}
            </View>
          </View>
        </View>

        {user.role === 'admin' && (
          <TouchableOpacity 
            style={[styles.glassCard, { marginTop: 10, flexDirection: 'row', alignItems: 'center' }]} 
            onPress={() => router.push('/admin')}
          >
            <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
            <Text style={{ marginLeft: 10, fontSize: 16, fontWeight: 'bold', color: COLORS.text }}>Go to Admin Dashboard</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="white" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  avatarContainer: { position: 'relative', alignItems: 'center' },
  roleBadge: { position: 'absolute', bottom: 5, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: 'white' },
  roleText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  
  glassCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.90)', 
    borderRadius: 20, 
    padding: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 10, 
    elevation: 3, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 20 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 10 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  editText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 16 },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  infoContent: { marginLeft: 15, flex: 1 },
  label: { fontSize: 12, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  value: { fontSize: 16, color: COLORS.text, fontWeight: '500' },
  input: { borderBottomWidth: 1, borderBottomColor: COLORS.primary, fontSize: 16, color: COLORS.text, paddingVertical: 4 },
  
  logoutBtn: { backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, marginTop: 10, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  logoutText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
});
