// app/verify.tsx — KYC Verification Details
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { ref, set, get, serverTimestamp } from 'firebase/database';
import { database } from '../config/firebaseConfig';
import { useAuth } from '../hooks/useAuth';
import { COLORS } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { VerificationData } from '../types';

const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export default function VerifyScreen() {
  const { user, updateProfileData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<VerificationData | null>(null);

  // Common fields
  const [fullLegalName, setFullLegalName] = useState('');
  const [nin, setNin] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState_] = useState('Lagos');

  // Farmer-specific
  const [farmName, setFarmName] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [produceTypes, setProduceTypes] = useState('');

  // Buyer-specific
  const [businessName, setBusinessName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  useEffect(() => {
    if (!user) return;
    get(ref(database, `verifications/${user.uid}`)).then((snap) => {
      if (snap.exists()) {
        const data = snap.val() as VerificationData;
        setExisting(data);
        setFullLegalName(data.fullLegalName || '');
        setNin(data.nin || '');
        setPhone(data.phone || '');
        setAddress(data.address || '');
        setState_(data.state || 'Lagos');
        setFarmName(data.farmName || '');
        setFarmSize(data.farmSize || '');
        setProduceTypes(data.produceTypes || '');
        setBusinessName(data.businessName || '');
        setDeliveryAddress(data.deliveryAddress || '');
      } else {
        setPhone(user.phone || '');
        setFullLegalName(user.displayName || '');
      }
      setLoading(false);
    });
  }, [user]);

  const handleSubmit = async () => {
    if (!fullLegalName.trim() || !nin.trim() || !phone.trim() || !address.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields marked with *');
      return;
    }
    if (nin.length < 11) {
      Alert.alert('Invalid NIN', 'National Identification Number must be at least 11 digits');
      return;
    }
    if (!user) return;

    setSaving(true);
    try {
      const verificationData: VerificationData = {
        uid: user.uid,
        role: user.role,
        fullLegalName: fullLegalName.trim(),
        nin: nin.trim(),
        phone: phone.trim(),
        address: address.trim(),
        state,
        farmName: farmName.trim(),
        farmSize: farmSize.trim(),
        produceTypes: produceTypes.trim(),
        businessName: businessName.trim(),
        deliveryAddress: deliveryAddress.trim(),
        submittedAt: serverTimestamp(),
        status: 'pending',
      };

      await set(ref(database, `verifications/${user.uid}`), verificationData);
      // Update user's verification status to pending
      await updateProfileData(user.uid, { verificationStatus: 'pending' });

      Alert.alert(
        'Submitted! ✅',
        'Your verification details have been submitted. Our team will review and verify your account within 24–48 hours.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isSubmitted = existing?.status === 'pending' || existing?.status === 'verified';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Status banner if already submitted */}
      {existing && (
        <View style={[
          styles.statusBanner,
          existing.status === 'verified' ? styles.bannerVerified :
          existing.status === 'pending' ? styles.bannerPending :
          existing.status === 'rejected' ? styles.bannerRejected : {},
        ]}>
          <Ionicons
            name={existing.status === 'verified' ? 'checkmark-circle' : existing.status === 'pending' ? 'time' : 'close-circle'}
            size={22}
            color={existing.status === 'verified' ? COLORS.success : existing.status === 'pending' ? COLORS.warning : COLORS.error}
          />
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.bannerTitle,
              { color: existing.status === 'verified' ? COLORS.success : existing.status === 'pending' ? COLORS.warning : COLORS.error },
            ]}>
              {existing.status === 'verified' ? 'Account Verified' :
               existing.status === 'pending' ? 'Under Review' : 'Verification Rejected'}
            </Text>
            <Text style={styles.bannerSub}>
              {existing.status === 'verified' ? 'Your account has been verified. A badge will show on your listings.' :
               existing.status === 'pending' ? 'We are reviewing your details. This takes 24–48 hours.' :
               'Please update your details and resubmit.'}
            </Text>
          </View>
        </View>
      )}

      {/* Why verify */}
      {!isSubmitted && (
        <View style={styles.whyCard}>
          <Text style={styles.whyTitle}>Why Verify?</Text>
          <View style={styles.whyItem}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.whyText}>Build trust with buyers and farmers</Text>
          </View>
          <View style={styles.whyItem}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.whyText}>Get a verified badge on your listings</Text>
          </View>
          <View style={styles.whyItem}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            <Text style={styles.whyText}>Higher chance of getting offers</Text>
          </View>
        </View>
      )}

      {/* Common details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="person-outline" size={16} color={COLORS.primary} /> Identity Details
        </Text>

        <Field label="Full Legal Name *" value={fullLegalName} onChangeText={setFullLegalName}
          placeholder="As on your National ID" editable={!isSubmitted} />
        <Field label="NIN (National Identification Number) *" value={nin} onChangeText={setNin}
          placeholder="11-digit NIN" keyboardType="numeric" maxLength={11} editable={!isSubmitted} />
        <Field label="Phone Number *" value={phone} onChangeText={setPhone}
          placeholder="080XXXXXXXX" keyboardType="phone-pad" editable={!isSubmitted} />
        <Field label="Residential Address *" value={address} onChangeText={setAddress}
          placeholder="House number, street, city" editable={!isSubmitted} />

        <Text style={styles.fieldLabel}>State *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          <View style={styles.chipRow}>
            {STATES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.stateChip, state === s && styles.stateChipActive]}
                onPress={() => !isSubmitted && setState_(s)}
              >
                <Text style={[styles.stateChipText, state === s && styles.stateChipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Farmer-specific */}
      {user?.role === 'farmer' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="leaf-outline" size={16} color={COLORS.primary} /> Farm Details
          </Text>
          <Field label="Farm/Business Name" value={farmName} onChangeText={setFarmName}
            placeholder="e.g. Musa's Green Farm" editable={!isSubmitted} />
          <Field label="Farm Size" value={farmSize} onChangeText={setFarmSize}
            placeholder="e.g. 2 hectares" editable={!isSubmitted} />
          <Field label="Types of Produce" value={produceTypes} onChangeText={setProduceTypes}
            placeholder="e.g. Tomatoes, Yam, Cassava" editable={!isSubmitted} />
        </View>
      )}

      {/* Buyer-specific */}
      {user?.role === 'buyer' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="cart-outline" size={16} color={COLORS.primary} /> Buyer Details
          </Text>
          <Field label="Business Name (optional)" value={businessName} onChangeText={setBusinessName}
            placeholder="e.g. Lagos Fresh Stores" editable={!isSubmitted} />
          <Field label="Delivery Address" value={deliveryAddress} onChangeText={setDeliveryAddress}
            placeholder="Where goods will be delivered" editable={!isSubmitted} />
        </View>
      )}

      {/* Submit or note */}
      {!isSubmitted ? (
        <TouchableOpacity
          style={[styles.submitBtn, saving && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Submit for Verification</Text>
            </>
          )}
        </TouchableOpacity>
      ) : existing?.status === 'rejected' ? (
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={saving}
        >
          <Ionicons name="refresh-outline" size={20} color="#fff" />
          <Text style={styles.submitBtnText}>Resubmit</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.disclaimer}>
        🔒 Your information is kept strictly confidential and used only for identity verification purposes.
      </Text>
    </ScrollView>
  );
}

function Field({
  label, value, onChangeText, placeholder, keyboardType, maxLength, editable = true,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboardType?: any; maxLength?: number; editable?: boolean;
}) {
  return (
    <View style={fieldStyles.group}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, !editable && fieldStyles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        keyboardType={keyboardType || 'default'}
        maxLength={maxLength}
        editable={editable}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  group: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textMid, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 7 },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
  },
  inputDisabled: {
    backgroundColor: COLORS.borderLight,
    color: COLORS.textLight,
  },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  bannerVerified: { backgroundColor: COLORS.successLight, borderColor: COLORS.success },
  bannerPending: { backgroundColor: COLORS.warningLight, borderColor: COLORS.warning },
  bannerRejected: { backgroundColor: COLORS.errorLight, borderColor: COLORS.error },
  bannerTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  bannerSub: { fontSize: 13, color: COLORS.textMid, lineHeight: 18 },
  whyCard: {
    backgroundColor: COLORS.primaryPale,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    gap: 8,
  },
  whyTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  whyItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  whyText: { fontSize: 13, color: COLORS.textMid, flex: 1 },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', gap: 8 },
  stateChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  stateChipActive: {
    backgroundColor: COLORS.primaryPale,
    borderColor: COLORS.primary,
  },
  stateChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textMid },
  stateChipTextActive: { color: COLORS.primary },
  submitBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  disclaimer: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
});
