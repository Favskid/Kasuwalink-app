// app/admin.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { onValue, ref, update } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { database } from '../config/firebaseConfig';
import { COLORS } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { AppUser, Order, VerificationData } from '../types';

type Tab = 'users' | 'orders' | 'disputes' | 'kyc';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [verifications, setVerifications] = useState<VerificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedKyc, setSelectedKyc] = useState<VerificationData | null>(null);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-260)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, { toValue: 0, duration: 260, useNativeDriver: true }).start();
  };

  const closeDrawer = () => {
    Animated.timing(drawerAnim, { toValue: -260, duration: 220, useNativeDriver: true }).start(() => setDrawerOpen(false));
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    closeDrawer();
  };

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/(tabs)/home');
      return;
    }

    const unsubUsers = onValue(ref(database, 'users'), (snap) => {
      const list: AppUser[] = [];
      snap.forEach((child) => {
        const u = child.val();
        if (u.role !== 'admin') list.push({ uid: child.key as string, ...u });
      });
      setUsers(list);
    });

    const unsubOrders = onValue(ref(database, 'orders'), (snap) => {
      const list: Order[] = [];
      snap.forEach((child) => list.push({ id: child.key as string, ...child.val() }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(list);
    });

    const unsubKyc = onValue(ref(database, 'verifications'), (snap) => {
      const list: VerificationData[] = [];
      snap.forEach((child) => list.push({ uid: child.key as string, ...child.val() }));
      setVerifications(list);
      setLoading(false);
    });

    return () => { unsubUsers(); unsubOrders(); unsubKyc(); };
  }, [user]);

  const toggleUserStatus = async (uid: string, current?: string) => {
    const next = current === 'suspended' ? 'active' : 'suspended';
    await update(ref(database, 'users/' + uid), { accountStatus: next });
    Alert.alert('Done', `User is now ${next}`);
    setSelectedUser(null);
  };

  const reviewKyc = async (uid: string, decision: 'verified' | 'rejected') => {
    await update(ref(database, `verifications/${uid}`), { status: decision, reviewedAt: Date.now() });
    await update(ref(database, `users/${uid}`), { verificationStatus: decision });
    Alert.alert('Done', `Verification ${decision}`);
    setSelectedKyc(null);
  };

  const resolveDispute = async (orderId: string, resolution: 'completed' | 'cancelled') => {
    await update(ref(database, `orders/${orderId}`), {
      status: resolution,
      disputeResolvedAt: Date.now(),
    });
    Alert.alert('Resolved', `Order marked as ${resolution}`);
    setSelectedOrder(null);
  };

  const disputes = orders.filter((o) => o.status === 'disputed');
  const allOrders = orders.filter((o) => o.status !== 'disputed');

  const stats = {
    farmers: users.filter((u) => u.role === 'farmer').length,
    buyers: users.filter((u) => u.role === 'buyer').length,
    pendingKyc: verifications.filter((v) => v.status === 'pending').length,
    inEscrow: orders.filter((o) => o.status === 'paid').length,
    disputes: disputes.length,
  };

  const statusColor = (s?: string) => {
    if (s === 'completed') return COLORS.success;
    if (s === 'paid') return COLORS.escrow;
    if (s === 'disputed') return COLORS.error;
    if (s === 'cancelled' || s === 'rejected') return COLORS.error;
    if (s === 'accepted') return COLORS.primary;
    return COLORS.warning;
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const renderUser = ({ item }: { item: AppUser }) => (
    <TouchableOpacity style={styles.listCard} onPress={() => setSelectedUser(item)} activeOpacity={0.8}>
      <View style={styles.listCardAvatar}>
        {item.photoURL
          ? <Image source={{ uri: item.photoURL }} style={styles.listCardAvatarPhoto} />
          : <Text style={styles.listCardAvatarText}>{(item.displayName?.[0] || item.email?.[0] || '?').toUpperCase()}</Text>}
      </View>
      <View style={styles.listCardInfo}>
        <Text style={styles.listCardName}>{item.displayName || 'Unnamed'}</Text>
        <Text style={styles.listCardSub}>{item.email}</Text>
        <View style={styles.listCardBadgeRow}>
          <View style={[styles.chip, item.role === 'farmer' ? { backgroundColor: COLORS.primaryPale } : { backgroundColor: COLORS.secondaryLight }]}>
            <Text style={[styles.chipText, { color: item.role === 'farmer' ? COLORS.primary : COLORS.secondary }]}>{item.role}</Text>
          </View>
          <View style={[styles.chip, item.accountStatus === 'suspended' ? { backgroundColor: COLORS.errorLight } : { backgroundColor: COLORS.successLight }]}>
            <Text style={[styles.chipText, { color: item.accountStatus === 'suspended' ? COLORS.error : COLORS.success }]}>
              {item.accountStatus?.toUpperCase() || 'ACTIVE'}
            </Text>
          </View>
          {item.verificationStatus === 'verified' && (
            <View style={[styles.chip, { backgroundColor: COLORS.verifiedLight }]}>
              <Ionicons name="shield-checkmark" size={11} color={COLORS.verified} />
              <Text style={[styles.chipText, { color: COLORS.verified }]}>Verified</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
    </TouchableOpacity>
  );

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity style={styles.listCard} onPress={() => setSelectedOrder(item)} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <Text style={styles.listCardName}>{item.produceName}</Text>
        <Text style={styles.listCardSub}>₦{item.priceOffered?.toLocaleString()} × {item.quantity}</Text>
        <Text style={styles.listCardSub}>{item.farmerName || 'Farmer'} → {item.buyerName || 'Buyer'}</Text>
      </View>
      <View style={[styles.chip, { backgroundColor: `${statusColor(item.status)}20` }]}>
        <Text style={[styles.chipText, { color: statusColor(item.status) }]}>{item.status?.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderDispute = ({ item }: { item: Order }) => (
    <TouchableOpacity style={[styles.listCard, styles.disputeCard]} onPress={() => setSelectedOrder(item)} activeOpacity={0.8}>
      <View style={styles.disputeIcon}>
        <Ionicons name="alert-circle" size={22} color={COLORS.error} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.listCardName}>{item.produceName}</Text>
        <Text style={styles.listCardSub}>₦{item.priceOffered?.toLocaleString()} × {item.quantity}</Text>
        <Text style={styles.listCardSub}>Farmer: {item.farmerName || item.farmerEmail || '—'}</Text>
        <Text style={styles.listCardSub}>Buyer: {item.buyerName || item.buyerEmail || '—'}</Text>
        {(item as any).disputeNote && <Text style={styles.disputeNote}>"{(item as any).disputeNote}"</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
    </TouchableOpacity>
  );

  const renderKyc = ({ item }: { item: VerificationData }) => (
    <TouchableOpacity style={styles.listCard} onPress={() => setSelectedKyc(item)} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <Text style={styles.listCardName}>{item.fullLegalName}</Text>
        <Text style={styles.listCardSub}>{item.role} · {item.state}</Text>
        {item.role === 'farmer' && item.farmName && <Text style={styles.listCardSub}>Farm: {item.farmName}</Text>}
        {item.role === 'buyer' && item.businessName && <Text style={styles.listCardSub}>Business: {item.businessName}</Text>}
      </View>
      <View style={[styles.chip, {
        backgroundColor: item.status === 'verified' ? COLORS.successLight : item.status === 'pending' ? COLORS.warningLight : COLORS.errorLight,
      }]}>
        <Text style={[styles.chipText, { color: item.status === 'verified' ? COLORS.success : item.status === 'pending' ? COLORS.warning : COLORS.error }]}>
          {item.status?.toUpperCase()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const tabLabel: Record<Tab, string> = {
    users: 'Users',
    orders: 'Orders',
    disputes: 'Disputes',
    kyc: 'KYC Requests',
  };

  const tabIcon: Record<Tab, string> = {
    users: 'people-outline',
    orders: 'cart-outline',
    disputes: 'alert-circle-outline',
    kyc: 'shield-checkmark-outline',
  };

  return (
    <View style={styles.screen}>

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={openDrawer}>
          <Ionicons name="menu-outline" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSub}>Kasuwalink · {tabLabel[activeTab]}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={async () => { await logout(); router.replace('/'); }}>
          <Ionicons name="log-out-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsContent}>
        <StatCard label="Farmers" value={stats.farmers} color={COLORS.primary} icon="leaf-outline" />
        <StatCard label="Buyers" value={stats.buyers} color={COLORS.secondary} icon="cart-outline" />
        <StatCard label="Disputes" value={stats.disputes} color={COLORS.error} icon="alert-circle-outline" />
        <StatCard label="KYC Pending" value={stats.pendingKyc} color={COLORS.warning} icon="time-outline" />
        <StatCard label="In Escrow" value={stats.inEscrow} color={COLORS.escrow} icon="shield-outline" />
      </ScrollView>

      {/* Main content */}
      {activeTab === 'users' && <FlatList data={users} keyExtractor={(u) => u.uid} renderItem={renderUser} contentContainerStyle={styles.listContent} ListEmptyComponent={<Text style={styles.emptyText}>No users yet</Text>} />}
      {activeTab === 'orders' && <FlatList data={allOrders} keyExtractor={(o) => o.id} renderItem={renderOrder} contentContainerStyle={styles.listContent} ListEmptyComponent={<Text style={styles.emptyText}>No orders yet</Text>} />}
      {activeTab === 'disputes' && <FlatList data={disputes} keyExtractor={(o) => o.id} renderItem={renderDispute} contentContainerStyle={styles.listContent} ListEmptyComponent={<View style={styles.emptyDisputeBox}><Ionicons name="checkmark-circle" size={44} color={COLORS.success} /><Text style={styles.emptyText}>No active disputes</Text></View>} />}
      {activeTab === 'kyc' && <FlatList data={verifications} keyExtractor={(v) => v.uid} renderItem={renderKyc} contentContainerStyle={styles.listContent} ListEmptyComponent={<Text style={styles.emptyText}>No KYC submissions yet</Text>} />}

      {/* Side Drawer Overlay */}
      {drawerOpen && (
        <TouchableWithoutFeedback onPress={closeDrawer}>
          <View style={styles.drawerOverlay} />
        </TouchableWithoutFeedback>
      )}

      {/* Side Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        {/* Drawer header */}
        <View style={styles.drawerHeader}>
          <View style={styles.drawerAvatarCircle}>
            <Ionicons name="shield-checkmark" size={28} color="#fff" />
          </View>
          <Text style={styles.drawerTitle}>Admin</Text>
          <Text style={styles.drawerSub}>{user?.email}</Text>
        </View>

        {/* Nav items */}
        <View style={styles.drawerNav}>
          {(['users', 'orders', 'disputes', 'kyc'] as Tab[]).map((tab) => {
            const isActive = activeTab === tab;
            const badge = tab === 'disputes' ? stats.disputes : tab === 'kyc' ? stats.pendingKyc : undefined;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.drawerNavItem, isActive && styles.drawerNavItemActive]}
                onPress={() => switchTab(tab)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={tabIcon[tab] as any}
                  size={20}
                  color={isActive ? COLORS.primary : COLORS.textMid}
                />
                <Text style={[styles.drawerNavLabel, isActive && styles.drawerNavLabelActive]}>
                  {tabLabel[tab]}
                </Text>
                {badge != null && badge > 0 && (
                  <View style={[styles.drawerBadge, tab === 'disputes' && { backgroundColor: COLORS.error }]}>
                    <Text style={styles.drawerBadgeText}>{badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Drawer footer */}
        <TouchableOpacity
          style={styles.drawerLogout}
          onPress={async () => { closeDrawer(); await logout(); router.replace('/'); }}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
          <Text style={styles.drawerLogoutText}>Log Out</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* User Modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide" onRequestClose={() => setSelectedUser(null)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
            <View style={styles.modalHandle} />
            <View style={styles.modalUserHeader}>
              <View style={styles.modalAvatarLg}>
                {selectedUser?.photoURL ? <Image source={{ uri: selectedUser.photoURL }} style={styles.modalAvatarPhoto} /> : <Text style={styles.modalAvatarText}>{(selectedUser?.displayName?.[0] || selectedUser?.email?.[0] || '?').toUpperCase()}</Text>}
              </View>
              <Text style={styles.modalTitle}>{selectedUser?.displayName || 'Unnamed'}</Text>
              <Text style={styles.modalSub}>{selectedUser?.email}</Text>
            </View>
            <DetailRow label="Role" value={selectedUser?.role?.toUpperCase() || '—'} />
            <DetailRow label="Phone" value={selectedUser?.phone || 'Not provided'} />
            <DetailRow label="Location" value={selectedUser?.location || 'Not provided'} />
            <DetailRow label="Status" value={selectedUser?.accountStatus?.toUpperCase() || 'ACTIVE'} />
            <DetailRow label="Verification" value={selectedUser?.verificationStatus?.toUpperCase() || 'UNVERIFIED'} />
            <View style={[styles.kycBtnRow, { marginTop: 20 }]}>
              <TouchableOpacity style={[styles.actionBigBtn, { backgroundColor: selectedUser?.accountStatus === 'suspended' ? COLORS.success : COLORS.error }]} onPress={() => selectedUser && toggleUserStatus(selectedUser.uid, selectedUser.accountStatus)}>
                <Ionicons name={selectedUser?.accountStatus === 'suspended' ? 'checkmark-circle-outline' : 'ban-outline'} size={18} color="#fff" />
                <Text style={styles.kycBtnText}>{selectedUser?.accountStatus === 'suspended' ? 'Unsuspend User' : 'Suspend User'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedUser(null)}><Text style={styles.closeBtnText}>Close</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Order / Dispute Modal */}
      <Modal visible={!!selectedOrder} transparent animationType="slide" onRequestClose={() => setSelectedOrder(null)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{selectedOrder?.produceName}</Text>
            <View style={[styles.chip, { backgroundColor: `${statusColor(selectedOrder?.status)}20`, alignSelf: 'flex-start', marginBottom: 16 }]}>
              <Text style={[styles.chipText, { color: statusColor(selectedOrder?.status) }]}>{selectedOrder?.status?.toUpperCase()}</Text>
            </View>
            <Text style={styles.sectionLabel}>Transaction</Text>
            <DetailRow label="Amount" value={`₦${selectedOrder?.priceOffered?.toLocaleString() || 0}`} />
            <DetailRow label="Quantity" value={`${selectedOrder?.quantity || 0}`} />
            {selectedOrder?.paystackRef && <DetailRow label="Paystack Ref" value={selectedOrder.paystackRef} />}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Farmer</Text>
            <DetailRow label="Name" value={selectedOrder?.farmerName || '—'} />
            <DetailRow label="Email" value={selectedOrder?.farmerEmail || '—'} />
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Buyer</Text>
            <DetailRow label="Name" value={selectedOrder?.buyerName || '—'} />
            <DetailRow label="Email" value={selectedOrder?.buyerEmail || '—'} />
            {(selectedOrder as any)?.disputeNote && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 14, color: COLORS.error }]}>Dispute Reason</Text>
                <View style={styles.disputeReasonBox}><Text style={styles.disputeReasonText}>{(selectedOrder as any).disputeNote}</Text></View>
              </>
            )}
            {selectedOrder?.status === 'disputed' && (
              <View style={styles.kycBtnRow}>
                <TouchableOpacity style={styles.kycApproveBtn} onPress={() => selectedOrder && resolveDispute(selectedOrder.id, 'completed')}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.kycBtnText}>Release to Farmer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.kycRejectBtn} onPress={() => selectedOrder && resolveDispute(selectedOrder.id, 'cancelled')}>
                  <Ionicons name="return-down-back-outline" size={18} color="#fff" /><Text style={styles.kycBtnText}>Refund Buyer</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedOrder(null)}><Text style={styles.closeBtnText}>Close</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* KYC Modal */}
      <Modal visible={!!selectedKyc} transparent animationType="slide" onRequestClose={() => setSelectedKyc(null)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>KYC Review</Text>
            <View style={[styles.chip, { alignSelf: 'flex-start', marginBottom: 16, backgroundColor: selectedKyc?.status === 'verified' ? COLORS.successLight : selectedKyc?.status === 'pending' ? COLORS.warningLight : COLORS.errorLight }]}>
              <Text style={[styles.chipText, { color: selectedKyc?.status === 'verified' ? COLORS.success : selectedKyc?.status === 'pending' ? COLORS.warning : COLORS.error }]}>{selectedKyc?.status?.toUpperCase()}</Text>
            </View>
            <Text style={styles.sectionLabel}>Identity</Text>
            <DetailRow label="Full Legal Name" value={selectedKyc?.fullLegalName || '—'} />
            <DetailRow label="NIN" value={selectedKyc?.nin || '—'} />
            <DetailRow label="Phone" value={selectedKyc?.phone || '—'} />
            <DetailRow label="Address" value={selectedKyc?.address || '—'} />
            <DetailRow label="State" value={selectedKyc?.state || '—'} />
            <DetailRow label="Role" value={selectedKyc?.role?.toUpperCase() || '—'} />
            {selectedKyc?.role === 'farmer' && (<>
              <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Farm Details</Text>
              <DetailRow label="Farm Name" value={selectedKyc.farmName || 'Not provided'} />
              <DetailRow label="Farm Size" value={selectedKyc.farmSize || 'Not provided'} />
              <DetailRow label="Produce Types" value={selectedKyc.produceTypes || 'Not provided'} />
            </>)}
            {selectedKyc?.role === 'buyer' && (<>
              <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Buyer Details</Text>
              <DetailRow label="Business Name" value={selectedKyc.businessName || 'Not provided'} />
              <DetailRow label="Delivery Address" value={selectedKyc.deliveryAddress || 'Not provided'} />
            </>)}
            {selectedKyc?.status === 'pending' && (
              <View style={styles.kycBtnRow}>
                <TouchableOpacity style={styles.kycApproveBtn} onPress={() => selectedKyc && reviewKyc(selectedKyc.uid, 'verified')}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" /><Text style={styles.kycBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.kycRejectBtn} onPress={() => selectedKyc && reviewKyc(selectedKyc.uid, 'rejected')}>
                  <Ionicons name="close-circle-outline" size={18} color="#fff" /><Text style={styles.kycBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedKyc(null)}><Text style={styles.closeBtnText}>Close</Text></TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <View style={[statStyles.card, { borderTopColor: color }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, gap: 12 },
  label: { fontSize: 13, color: COLORS.textLight, fontWeight: '500', flex: 1 },
  value: { fontSize: 13, color: COLORS.text, fontWeight: '600', flex: 2, textAlign: 'right' },
});

const statStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, alignItems: 'center', gap: 4, minWidth: 90, borderTopWidth: 3, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  value: { fontSize: 24, fontWeight: '800' },
  label: { fontSize: 11, color: COLORS.textLight, fontWeight: '600', textAlign: 'center' },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 1 },
  menuBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  statsScroll: { flexGrow: 0 },
  statsContent: { padding: 16, gap: 10 },
  listContent: { padding: 16, paddingBottom: 30 },
  listCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: COLORS.borderLight, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  disputeCard: { borderColor: COLORS.error, borderWidth: 1.5 },
  disputeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.errorLight, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  disputeNote: { fontSize: 12, color: COLORS.error, fontStyle: 'italic', marginTop: 4 },
  listCardAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryPale, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 },
  listCardAvatarPhoto: { width: 44, height: 44, borderRadius: 22 },
  listCardAvatarText: { color: COLORS.primary, fontWeight: '800', fontSize: 16 },
  listCardInfo: { flex: 1, minWidth: 0 },
  listCardName: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  listCardSub: { fontSize: 12, color: COLORS.textLight, marginBottom: 2 },
  listCardBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontSize: 11, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: COLORS.textLight, paddingTop: 40, fontSize: 15 },
  emptyDisputeBox: { alignItems: 'center', paddingTop: 60, gap: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  modalUserHeader: { alignItems: 'center', marginBottom: 20 },
  modalAvatarLg: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.primaryPale, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10 },
  modalAvatarPhoto: { width: 72, height: 72, borderRadius: 36 },
  modalAvatarText: { color: COLORS.primary, fontWeight: '800', fontSize: 28 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  modalSub: { fontSize: 14, color: COLORS.textLight },
  disputeReasonBox: { backgroundColor: COLORS.errorLight, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.error, marginTop: 6 },
  disputeReasonText: { fontSize: 14, color: COLORS.error, lineHeight: 20 },
  kycBtnRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  kycApproveBtn: { flex: 1, backgroundColor: COLORS.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  kycRejectBtn: { flex: 1, backgroundColor: COLORS.error, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  actionBigBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  kycBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  closeBtn: { backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border, paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  closeBtnText: { color: COLORS.textMid, fontWeight: '700', fontSize: 14 },
  // Drawer
  drawerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 10 },
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 260, backgroundColor: COLORS.surface, zIndex: 20, shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 16 },
  drawerHeader: { backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 24, paddingHorizontal: 20 },
  drawerAvatarCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  drawerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 2 },
  drawerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  drawerNav: { paddingVertical: 12, paddingHorizontal: 12 },
  drawerNavItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  drawerNavItemActive: { backgroundColor: COLORS.primaryPale },
  drawerNavLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textMid },
  drawerNavLabelActive: { color: COLORS.primary, fontWeight: '700' },
  drawerBadge: { backgroundColor: COLORS.primary, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  drawerBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  drawerLogout: { flexDirection: 'row', alignItems: 'center', gap: 12, margin: 16, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.errorLight, backgroundColor: COLORS.errorLight },
  drawerLogoutText: { color: COLORS.error, fontWeight: '700', fontSize: 15 },
});
