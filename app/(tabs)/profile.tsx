// app/(tabs)/profile.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';

const CLOUDINARY_CLOUD = 'zosh1v8m';
const CLOUDINARY_UPLOAD_PRESET = 'kasuwalink_upload';

async function uploadAvatarToCloudinary(uri: string): Promise<string> {
  const data = new FormData();
  data.append('file', { uri, type: 'image/jpeg', name: `avatar_${Date.now()}.jpg` } as any);
  data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: data,
  });
  const result = await res.json();
  if (result.secure_url) return result.secure_url;
  throw new Error(result.error?.message || 'Failed to upload photo');
}

export default function ProfileScreen() {
  const { user, logout, updateProfileData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || '');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhone(user.phone || '');
      setLocation(user.location || '');
    }
  }, [user]);

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadAvatarToCloudinary(result.assets[0].uri);
      await updateProfileData(user!.uid, { photoURL: url });
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Could not upload photo');
    }
    setUploadingPhoto(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfileData(user.uid, { displayName, phone, location });
      setIsEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const verificationColor = {
    unverified: COLORS.textLight,
    pending: COLORS.warning,
    verified: COLORS.success,
    rejected: COLORS.error,
  }[user.verificationStatus || 'unverified'];

  const verificationIcon = {
    unverified: 'shield-outline',
    pending: 'time-outline',
    verified: 'shield-checkmark',
    rejected: 'shield-outline',
  }[user.verificationStatus || 'unverified'];

  const verificationLabel = {
    unverified: 'Not Verified',
    pending: 'Verification Pending',
    verified: 'Verified Account',
    rejected: 'Verification Rejected',
  }[user.verificationStatus || 'unverified'];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {/* Tappable avatar — shows photo if set, else initials */}
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickPhoto} activeOpacity={0.85}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(user.displayName?.[0] || user.email?.[0] || '?').toUpperCase()}
                </Text>
              </View>
            )}
            {/* Camera overlay */}
            <View style={styles.cameraOverlay}>
              {uploadingPhoto
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="camera" size={16} color="#fff" />}
            </View>
          </TouchableOpacity>

          <View style={[styles.rolePill, user.role === 'farmer' ? styles.roleFarmer : styles.roleBuyer]}>
            <Text style={styles.rolePillText}>{user.role.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.profileName}>{user.displayName || 'Your Name'}</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
      </View>

      {/* Verification Banner */}
      <TouchableOpacity
        style={[styles.verificationCard, { borderColor: verificationColor }]}
        onPress={() => router.push('/verify')}
        activeOpacity={0.8}
      >
        <View style={styles.verificationLeft}>
          <Ionicons name={verificationIcon as any} size={28} color={verificationColor} />
          <View>
            <Text style={[styles.verificationTitle, { color: verificationColor }]}>
              {verificationLabel}
            </Text>
            <Text style={styles.verificationSub}>
              {user.verificationStatus === 'verified'
                ? 'Your account is verified. Buyers trust you.'
                : user.verificationStatus === 'pending'
                ? 'We are reviewing your submission.'
                : 'Verify your identity to build buyer trust'}
            </Text>
          </View>
        </View>
        {user.verificationStatus !== 'verified' && user.verificationStatus !== 'pending' && (
          <Ionicons name="chevron-forward" size={20} color={verificationColor} />
        )}
      </TouchableOpacity>

      {/* Personal Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          <TouchableOpacity
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
            style={styles.editBtn}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <>
                <Ionicons name={isEditing ? 'checkmark-outline' : 'create-outline'} size={16} color={COLORS.primary} />
                <Text style={styles.editBtnText}>{isEditing ? 'Save' : 'Edit'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <InfoRow
          icon="person-outline"
          label="Full Name"
          value={user.displayName || 'Not provided'}
          editable={isEditing}
          inputValue={displayName}
          onChangeText={setDisplayName}
        />
        <InfoRow
          icon="mail-outline"
          label="Email"
          value={user.email}
        />
        <InfoRow
          icon="call-outline"
          label="Phone"
          value={user.phone || 'Not provided'}
          editable={isEditing}
          inputValue={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <InfoRow
          icon="location-outline"
          label="Location"
          value={user.location || 'Not provided'}
          editable={isEditing}
          inputValue={location}
          onChangeText={setLocation}
          last
        />
      </View>

      {/* Quick links */}
      {user.role === 'admin' && (
        <TouchableOpacity style={styles.linkCard} onPress={() => router.push('/admin')}>
          <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.primary} />
          <Text style={styles.linkCardText}>Admin Dashboard</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Kasuwalink v1.0 · Built for Nigerian Farmers</Text>
    </ScrollView>
  );
}

function InfoRow({
  icon, label, value, editable, inputValue, onChangeText, keyboardType, last,
}: {
  icon: string; label: string; value: string;
  editable?: boolean; inputValue?: string;
  onChangeText?: (v: string) => void;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  last?: boolean;
}) {
  return (
    <View style={[infoRowStyles.row, !last && infoRowStyles.borderBottom]}>
      <View style={infoRowStyles.iconBox}>
        <Ionicons name={icon as any} size={20} color={COLORS.textLight} />
      </View>
      <View style={infoRowStyles.content}>
        <Text style={infoRowStyles.label}>{label}</Text>
        {editable ? (
          <TextInput
            style={infoRowStyles.input}
            value={inputValue}
            onChangeText={onChangeText}
            keyboardType={keyboardType || 'default'}
            placeholderTextColor={COLORS.textLight}
          />
        ) : (
          <Text style={infoRowStyles.value}>{value}</Text>
        )}
      </View>
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  label: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  value: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  input: {
    fontSize: 15,
    color: COLORS.text,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primary,
    paddingVertical: 3,
  },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileHeader: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 36,
  },
  avatarContainer: { alignItems: 'center', marginBottom: 12 },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '800' },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleFarmer: { backgroundColor: 'rgba(255,255,255,0.15)' },
  roleBuyer: { backgroundColor: 'rgba(255,255,255,0.15)' },
  rolePillText: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  profileName: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  profileEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  verificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  verificationLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  verificationTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  verificationSub: { fontSize: 12, color: COLORS.textLight, maxWidth: 220, lineHeight: 17 },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  linkCardText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.error,
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  version: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 12,
    marginTop: 24,
    marginBottom: 10,
  },
});
