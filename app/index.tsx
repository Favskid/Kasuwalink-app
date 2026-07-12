// app/index.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Dimensions, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/colors';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Hero Section */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight, '#4CAF50']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <View style={styles.heroContent}>
          <Text style={styles.emoji}>🌾</Text>
          <Text style={styles.brand}>Kasuwalink</Text>
          <Text style={styles.tagline}>Nigeria's Agricultural Marketplace</Text>
          <Text style={styles.desc}>
            Connecting small-scale farmers directly to buyers across Nigeria
          </Text>
        </View>
      </LinearGradient>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>500+</Text>
          <Text style={styles.statLabel}>Farmers</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>1,200+</Text>
          <Text style={styles.statLabel}>Buyers</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>₦50M+</Text>
          <Text style={styles.statLabel}>Traded</Text>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => router.push('/login')}
          activeOpacity={0.85}
        >
          <Ionicons name="log-in-outline" size={20} color="#fff" />
          <Text style={styles.btnPrimaryText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btnSecondary}
          onPress={() => router.push('/register')}
          activeOpacity={0.85}
        >
          <Ionicons name="person-add-outline" size={20} color={COLORS.primary} />
          <Text style={styles.btnSecondaryText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing you agree to our Terms of Service
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  hero: {
    height: height * 0.52,
    justifyContent: 'flex-end',
    padding: 32,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -80,
    right: -60,
  },
  circle2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: 20,
    left: -50,
  },
  heroContent: {
    zIndex: 1,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  brand: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  desc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 21,
    maxWidth: 280,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
  actions: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 14,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnSecondary: {
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  btnSecondaryText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  terms: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 12,
    marginTop: 8,
  },
});
