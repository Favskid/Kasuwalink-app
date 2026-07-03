// app/admin.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal } from 'react-native';
import { ref, onValue, update } from 'firebase/database';
import { database } from '../config/firebaseConfig';
import { AppUser, Order } from '../types';
import { COLORS } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'orders'>('users');

  useEffect(() => {
    // If not admin, redirect out immediately just in case
    if (user && user.role !== 'admin') {
      router.replace('/(tabs)/home');
      return;
    }

    const usersRef = ref(database, 'users');
    const ordersRef = ref(database, 'orders');

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const loadedUsers: AppUser[] = [];
      snapshot.forEach(child => {
        const u = child.val();
        if (u.role !== 'admin') {
          loadedUsers.push({ id: child.key as string, ...u });
        }
      });
      setUsers(loadedUsers);
    });

    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      const loadedOrders: Order[] = [];
      snapshot.forEach(child => {
        loadedOrders.push({ id: child.key as string, ...child.val() });
      });
      loadedOrders.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(loadedOrders);
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeOrders();
    };
  }, [user]);

  const toggleUserStatus = async (uid: string, currentStatus: string | undefined) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await update(ref(database, 'users/' + uid), { accountStatus: newStatus });
      Alert.alert('Success', `User is now ${newStatus}`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);

  const getOrderUserDetails = (uid: string) => {
    const u = users.find(user => user.uid === uid);
    return u ? `${u.displayName || 'Unnamed'} (${u.email})` : uid.slice(0, 8);
  };

  const renderUser = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.displayName || 'Unnamed User'}</Text>
        <Text style={styles.cardSub}>Role: {item.role.toUpperCase()}</Text>
        <Text style={styles.cardSub}>Email: {item.email}</Text>
        <Text style={[styles.cardSub, { color: item.accountStatus === 'suspended' ? '#EF4444' : '#10B981', fontWeight: 'bold' }]}>
          Status: {item.accountStatus?.toUpperCase() || 'ACTIVE'}
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.actionBtn, { backgroundColor: item.accountStatus === 'suspended' ? '#10B981' : '#EF4444' }]}
        onPress={() => toggleUserStatus(item.uid, item.accountStatus)}
      >
        <Text style={styles.actionBtnText}>{item.accountStatus === 'suspended' ? 'Unsuspend' : 'Suspend'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderOrder = ({ item }: { item: Order }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => {
        setSelectedOrder(item);
        setOrderModalVisible(true);
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.cardTitle}>{item.produceName} (x{item.quantity})</Text>
        <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>₦{item.priceOffered}</Text>
      </View>
      <Text style={styles.cardSub}>Status: {item.status.toUpperCase()}</Text>
      <Text style={[styles.cardSub, { color: COLORS.primary, marginTop: 4, fontWeight: '600' }]}>Tap to view full details</Text>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScreenWrapper style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard 🛡️</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'users' && styles.activeTab]} onPress={() => setActiveTab('users')}>
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users ({users.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'orders' && styles.activeTab]} onPress={() => setActiveTab('orders')}>
          <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>All Orders ({orders.length})</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'users' ? (
        <FlatList
          data={users}
          keyExtractor={item => item.uid}
          renderItem={renderUser}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Order Details Modal */}
      <Modal visible={orderModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Order Details</Text>
            {selectedOrder && (
              <>
                <Text style={styles.detailText}>Produce: <Text style={{fontWeight: 'bold'}}>{selectedOrder.produceName}</Text></Text>
                <Text style={styles.detailText}>Quantity: {selectedOrder.quantity}</Text>
                <Text style={styles.detailText}>Total Price: ₦{selectedOrder.priceOffered}</Text>
                <Text style={styles.detailText}>Status: {selectedOrder.status.toUpperCase()}</Text>
                
                <View style={{ marginVertical: 15, padding: 12, backgroundColor: 'rgba(249, 250, 251, 0.8)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{fontWeight: 'bold', marginBottom: 5, color: COLORS.text}}>Farmer Details:</Text>
                  <Text style={{color: COLORS.textLight}}>{getOrderUserDetails(selectedOrder.farmerUid)}</Text>
                </View>

                <View style={{ marginBottom: 15, padding: 12, backgroundColor: 'rgba(249, 250, 251, 0.8)', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{fontWeight: 'bold', marginBottom: 5, color: COLORS.text}}>Buyer Details:</Text>
                  <Text style={{color: COLORS.textLight}}>{getOrderUserDetails(selectedOrder.buyerUid)}</Text>
                </View>
              </>
            )}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOrderModalVisible(false)}>
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { backgroundColor: 'rgba(46, 125, 50, 0.9)', padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.9)', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  tab: { flex: 1, padding: 15, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 16, color: COLORS.textLight, fontWeight: '600' },
  activeTabText: { color: COLORS.primary },
  listContainer: { padding: 16 },
  userCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.90)', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.5)', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  orderCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.90)', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3 
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, color: COLORS.text },
  cardSub: { fontSize: 14, color: COLORS.textLight, marginBottom: 2 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  actionBtnText: { color: 'white', fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 15, color: COLORS.primary },
  detailText: { fontSize: 16, marginBottom: 8, color: COLORS.text },
  closeBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, marginTop: 10 },
});
