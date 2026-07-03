// app/(tabs)/orders.tsx
import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { ref, query, orderByChild, equalTo, onValue, update, push, set, serverTimestamp } from 'firebase/database';
import { database } from '../../config/firebaseConfig';
import { Order } from '../../types';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function OrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Bargain Modal State
  const [isBargaining, setIsBargaining] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [counterPrice, setCounterPrice] = useState('');

  useEffect(() => {
    if (!user) return;
    
    // If farmer, get orders where farmerUid == user.uid
    // If buyer, get orders where buyerUid == user.uid
    const queryField = user.role === 'farmer' ? 'farmerUid' : 'buyerUid';
    const ordersQuery = query(ref(database, 'orders'), orderByChild(queryField), equalTo(user.uid));

    const unsubscribe = onValue(ordersQuery, (snapshot) => {
      const loadedOrders: Order[] = [];
      snapshot.forEach((childSnap) => {
        loadedOrders.push({
          id: childSnap.key as string,
          ...childSnap.val()
        });
      });
      loadedOrders.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(loadedOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const updateOrderStatus = async (orderId: string, status: string, newPrice?: number) => {
    try {
      const updates: any = { status };
      if (newPrice) updates.priceOffered = newPrice;
      await update(ref(database, 'orders/' + orderId), updates);
      Alert.alert('Success', `Order ${status}!`);
      setIsBargaining(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handlePay = async (orderId: string) => {
    Alert.alert('Simulate Payment', 'Paystack/Flutterwave gateway simulation', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pay Now', onPress: () => updateOrderStatus(orderId, 'completed') }
    ]);
  };

  const openCounterOffer = (order: Order) => {
    setSelectedOrder(order);
    setCounterPrice(order.priceOffered.toString());
    setIsBargaining(true);
  };

  const submitCounterOffer = () => {
    if (selectedOrder && counterPrice) {
      // Counter-offer leaves it 'pending' but changes price. For simplicity, we just change price.
      // In a real app we'd track "lastOfferedBy". We'll just alert the other user.
      updateOrderStatus(selectedOrder.id, 'pending', parseFloat(counterPrice));
    }
  };

  const renderOrder = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.headerRow}>
        <Text style={styles.produce}>{item.produceName} (x{item.quantity})</Text>
        <View style={[styles.statusBadge, (styles as any)[`status_${item.status}`] || styles.status_pending]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.price}>Current Price: ₦{item.priceOffered}</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.chatBtn} onPress={() => router.push(`/chat/${item.postId}`)}>
          <Ionicons name="chatbubble-outline" size={18} color="white" />
          <Text style={styles.chatText}>Chat</Text>
        </TouchableOpacity>

        {user?.role === 'farmer' && item.status === 'pending' && (
          <View style={styles.farmerActions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => updateOrderStatus(item.id, 'accepted')}>
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.counterBtn} onPress={() => openCounterOffer(item)}>
              <Text style={styles.btnText}>Counter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => updateOrderStatus(item.id, 'rejected')}>
              <Text style={styles.btnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {user?.role === 'buyer' && item.status === 'accepted' && (
          <TouchableOpacity style={styles.payBtn} onPress={() => handlePay(item.id)}>
            <Text style={styles.btnText}>Pay Now 💳</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScreenWrapper style={styles.container}>
      <Text style={styles.header}>My Orders / Offers</Text>
      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        renderItem={renderOrder}
        ListEmptyComponent={<Text style={styles.empty}>No orders or offers yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Modal visible={isBargaining} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Counter Offer</Text>
            <Text>Suggest a new price for {selectedOrder?.produceName}</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              value={counterPrice} 
              onChangeText={setCounterPrice} 
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsBargaining(false)}>
                <Text>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={submitCounterOffer}>
                <Text style={{color: 'white'}}>Submit Offer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { fontSize: 24, fontWeight: '800', color: COLORS.primary, padding: 16 },
  orderCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.90)', 
    marginHorizontal: 16, 
    marginVertical: 8, 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  produce: { fontSize: 18, fontWeight: 'bold' },
  price: { fontSize: 16, color: '#4CAF50', marginVertical: 8, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  status_pending: { backgroundColor: '#FF9800' },
  status_accepted: { backgroundColor: '#2196F3' },
  status_completed: { backgroundColor: '#4CAF50' },
  status_rejected: { backgroundColor: '#F44336' },
  status_cancelled: { backgroundColor: '#9E9E9E' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, alignItems: 'center' },
  chatBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center' },
  chatText: { color: 'white', marginLeft: 4, fontWeight: '600' },
  farmerActions: { flexDirection: 'row', gap: 6 },
  acceptBtn: { backgroundColor: '#4CAF50', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  counterBtn: { backgroundColor: '#FF9800', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  rejectBtn: { backgroundColor: '#F44336', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  payBtn: { backgroundColor: '#4CAF50', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  btnText: { color: 'white', fontWeight: 'bold' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: 40, color: '#666', fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginVertical: 15, fontSize: 18 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancelBtn: { padding: 12 },
  saveBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8 },
});
