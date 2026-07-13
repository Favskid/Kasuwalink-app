// app/(tabs)/orders.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { equalTo, onValue, orderByChild, query, ref, update } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { database } from '../../config/firebaseConfig';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { Order, OrderStatus } from '../../types';

// Only import WebView on native — web doesn't support it
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

const PAYSTACK_PUBLIC_KEY = 'pk_test_76913f178ecddab58afac746c97e5d07d9a5484b';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Pending',      color: COLORS.warning,   bg: COLORS.warningLight,  icon: 'time-outline' },
  accepted:  { label: 'Accepted',     color: COLORS.success,   bg: COLORS.successLight,  icon: 'checkmark-circle-outline' },
  rejected:  { label: 'Rejected',     color: COLORS.error,     bg: COLORS.errorLight,    icon: 'close-circle-outline' },
  paid:      { label: 'Paid (Escrow)',color: COLORS.escrow,    bg: COLORS.escrowLight,   icon: 'shield-checkmark-outline' },
  delivered: { label: 'Delivered',    color: COLORS.verified,  bg: COLORS.verifiedLight, icon: 'cube-outline' },
  completed: { label: 'Completed',    color: COLORS.success,   bg: COLORS.successLight,  icon: 'trophy-outline' },
  cancelled: { label: 'Cancelled',    color: COLORS.textLight, bg: COLORS.borderLight,   icon: 'ban-outline' },
  disputed:  { label: 'Disputed',     color: COLORS.error,     bg: COLORS.errorLight,    icon: 'warning-outline' },
};

// ─── Order Card ───────────────────────────────────────────────────────────────
function OrderCard({
  item,
  userRole,
  onAction,
  onChat,
}: {
  item: Order;
  userRole: string;
  onAction: (order: Order, action: string) => void;
  onChat: (order: Order) => void;
}) {
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;

  return (
    <View style={styles.orderCard}>
      {/* Header */}
      <View style={styles.orderCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderProduce} numberOfLines={1}>{item.produceName}</Text>
          <Text style={styles.orderQty}>Qty: {item.quantity} units</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Price */}
      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Agreed Price</Text>
        <Text style={styles.priceValue}>₦{item.priceOffered?.toLocaleString()}</Text>
      </View>

      {/* Parties */}
      <View style={styles.partiesRow}>
        <View style={styles.partyItem}>
          <Ionicons name="person-circle-outline" size={16} color={COLORS.textLight} />
          <View>
            <Text style={styles.partyRole}>Farmer</Text>
            <Text style={styles.partyName} numberOfLines={1}>
              {item.farmerName || item.farmerUid?.slice(0, 8)}
            </Text>
          </View>
        </View>
        <Ionicons name="arrow-forward" size={16} color={COLORS.textLight} />
        <View style={styles.partyItem}>
          <Ionicons name="person-outline" size={16} color={COLORS.textLight} />
          <View>
            <Text style={styles.partyRole}>Buyer</Text>
            <Text style={styles.partyName} numberOfLines={1}>
              {item.buyerName || item.buyerUid?.slice(0, 8)}
            </Text>
          </View>
        </View>
      </View>

      {/* Escrow banner */}
      {item.status === 'paid' && (
        <View style={styles.escrowInfo}>
          <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.escrow} />
          <Text style={styles.escrowText}>
            Payment held in escrow — released to farmer after you confirm delivery
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.chatBtn} onPress={() => onChat(item)}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.primary} />
          <Text style={styles.chatBtnText}>Chat</Text>
        </TouchableOpacity>

        {userRole === 'farmer' && item.status === 'pending' && (
          <>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => onAction(item, 'accept')}>
              <Text style={styles.actionBtnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.counterBtn} onPress={() => onAction(item, 'counter')}>
              <Text style={styles.actionBtnText}>Counter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => onAction(item, 'reject')}>
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}

        {userRole === 'buyer' && item.status === 'accepted' && (
          <TouchableOpacity style={styles.payBtn} onPress={() => onAction(item, 'pay')}>
            <Ionicons name="card-outline" size={16} color="#fff" />
            <Text style={styles.payBtnText}>Pay Now 💳</Text>
          </TouchableOpacity>
        )}

        {userRole === 'farmer' && item.status === 'paid' && (
          <TouchableOpacity style={styles.deliverBtn} onPress={() => onAction(item, 'delivered')}>
            <Ionicons name="cube-outline" size={16} color="#fff" />
            <Text style={styles.payBtnText}>Mark Delivered</Text>
          </TouchableOpacity>
        )}

        {userRole === 'buyer' && item.status === 'delivered' && (
          <TouchableOpacity style={styles.confirmBtn} onPress={() => onAction(item, 'confirm')}>
            <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
            <Text style={styles.payBtnText}>Confirm Received</Text>
          </TouchableOpacity>
        )}

        {userRole === 'buyer' && (item.status === 'paid' || item.status === 'delivered') && (
          <TouchableOpacity style={styles.disputeBtn} onPress={() => onAction(item, 'dispute')}>
            <Ionicons name="warning-outline" size={15} color={COLORS.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OrdersScreen() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Counter offer modal
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [counterPrice, setCounterPrice] = useState('');

  // Paystack WebView modal
  const [paystackVisible, setPaystackVisible] = useState(false);
  const [payingOrder, setPayingOrder] = useState<Order | null>(null);
  const paystackRef = useRef(`KSW_${Date.now()}`);

  // Filter
  const [activeFilter, setActiveFilter] = useState<'all' | OrderStatus>('all');

  useEffect(() => {
    if (!user) return;
    const field = user.role === 'farmer' ? 'farmerUid' : 'buyerUid';
    const q = query(ref(database, 'orders'), orderByChild(field), equalTo(user.uid));
    const unsubscribe = onValue(q, (snapshot) => {
      const loaded: Order[] = [];
      snapshot.forEach((child) => {
        loaded.push({ id: child.key as string, ...child.val() });
      });
      loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setOrders(loaded);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const updateStatus = async (orderId: string, status: OrderStatus, extra?: Record<string, any>) => {
    const updates: Record<string, any> = { status, ...extra };
    await update(ref(database, 'orders/' + orderId), updates);
  };

  const handleAction = (order: Order, action: string) => {
    switch (action) {
      case 'accept':
        Alert.alert('Accept Order', `Accept offer of ₦${order.priceOffered?.toLocaleString()}?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Accept', onPress: () => updateStatus(order.id, 'accepted') },
        ]);
        break;

      case 'reject':
        Alert.alert('Reject Order', 'Reject this offer?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reject', style: 'destructive', onPress: () => updateStatus(order.id, 'rejected') },
        ]);
        break;

      case 'counter':
        setSelectedOrder(order);
        setCounterPrice(order.priceOffered.toString());
        setCounterModalVisible(true);
        break;

      case 'pay':
        // Open Paystack via inline WebView modal
        paystackRef.current = `KSW_${order.id}_${Date.now()}`;
        setPayingOrder(order);
        setPaystackVisible(true);
        break;

      case 'delivered':
        Alert.alert('Mark as Delivered', 'Confirm you have delivered the goods to the buyer?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Delivered',
            onPress: () => updateStatus(order.id, 'delivered', { deliveredAt: Date.now() }),
          },
        ]);
        break;

      case 'confirm':
        Alert.alert(
          'Confirm Goods Received',
          'By confirming, payment will be released to the farmer. Are you satisfied with the goods?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Yes, Release Payment',
              onPress: () => updateStatus(order.id, 'completed', { completedAt: Date.now() }),
            },
          ],
        );
        break;

      case 'dispute':
        Alert.alert(
          'Raise Dispute',
          'A dispute will hold the payment until our team resolves it. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Raise Dispute',
              style: 'destructive',
              onPress: () => updateStatus(order.id, 'disputed'),
            },
          ],
        );
        break;
    }
  };

  const handleChat = (order: Order) => {
    if (!user) return;
    const threadId = `${order.postId}_${order.buyerUid}`;
    router.push({
      pathname: '/chat/[threadId]',
      params: {
        threadId,
        postId: order.postId,
        farmerUid: order.farmerUid,
        farmerName: order.farmerName || 'Farmer',
        farmerEmail: order.farmerEmail || '',
        produceName: order.produceName,
      },
    });
  };

  const submitCounter = async () => {
    if (!selectedOrder || !counterPrice) return;
    await updateStatus(selectedOrder.id, 'pending', { priceOffered: parseFloat(counterPrice) });
    Alert.alert('Counter Sent', 'Your counter offer has been sent to the buyer.');
    setCounterModalVisible(false);
  };

  const onPaymentSuccess = async (txRef: string) => {
    setPaystackVisible(false);
    if (!payingOrder) return;
    await updateStatus(payingOrder.id, 'paid', {
      paystackRef: txRef,
      paidAt: Date.now(),
      escrowNote: 'Payment held in escrow. Released upon buyer confirmation.',
    });
    Alert.alert(
      'Payment Successful 🎉',
      `₦${payingOrder.priceOffered?.toLocaleString()} is now held securely in escrow.\n\nIt will be released to the farmer only after you confirm goods received.`,
    );
    setPayingOrder(null);
  };

  const onPaymentCancel = () => {
    setPaystackVisible(false);
    setPayingOrder(null);
    Alert.alert('Payment Cancelled', 'Your payment was not completed.');
  };

  const filteredOrders = activeFilter === 'all' ? orders : orders.filter((o) => o.status === activeFilter);

  const filters: { key: 'all' | OrderStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'paid', label: 'In Escrow' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'completed', label: 'Completed' },
  ];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.key)}
          >
            <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            item={item}
            userRole={user?.role || 'buyer'}
            onAction={handleAction}
            onChat={handleChat}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📦</Text>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySub}>
              {user?.role === 'buyer'
                ? 'Browse the market and make an offer on produce you like'
                : 'When buyers make offers on your listings, they appear here'}
            </Text>
          </View>
        }
      />

      {/* Counter Offer Modal */}
      <Modal
        visible={counterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCounterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Counter Offer</Text>
            <Text style={styles.modalSub}>
              Buyer offered: ₦{selectedOrder?.priceOffered?.toLocaleString()}
            </Text>
            <Text style={styles.modalLabel}>Your Counter Price (₦)</Text>
            <TextInput
              style={styles.modalInput}
              value={counterPrice}
              onChangeText={setCounterPrice}
              keyboardType="numeric"
              placeholder="Enter new price"
              placeholderTextColor={COLORS.textLight}
            />
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCounterModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={submitCounter}>
                <Text style={styles.modalSubmitText}>Send Counter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Paystack WebView Payment Modal */}
      {paystackVisible && payingOrder && user && (
        <Modal
          visible
          animationType="slide"
          onRequestClose={onPaymentCancel}
        >
          <View style={styles.paystackContainer}>
            {/* Header */}
            <View style={styles.paystackHeader}>
              <TouchableOpacity onPress={onPaymentCancel} style={styles.paystackClose}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.paystackTitle}>Secure Payment</Text>
                <Text style={styles.paystackSub}>
                  ₦{payingOrder.priceOffered?.toLocaleString()} · {payingOrder.produceName}
                </Text>
              </View>
              <View style={styles.escrowChip}>
                <Ionicons name="shield-checkmark" size={13} color={COLORS.escrow} />
                <Text style={styles.escrowChipText}>Escrow</Text>
              </View>
            </View>

            {/* Paystack inline checkout via WebView */}
            <WebView
              style={{ flex: 1 }}
              originWhitelist={['*']}
              source={{
                html: `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://js.paystack.co/v1/inline.js"></script>
</head>
<body style="margin:0;padding:0;background:#fff;">
<script>
  window.onload = function() {
    var handler = PaystackPop.setup({
      key: '${PAYSTACK_PUBLIC_KEY}',
      email: '${user.email}',
      amount: ${payingOrder.priceOffered * 100},
      currency: 'NGN',
      ref: '${paystackRef.current}',
      metadata: {
        custom_fields: [
          { display_name: 'Order', variable_name: 'order_id', value: '${payingOrder.id}' },
          { display_name: 'Produce', variable_name: 'produce', value: '${payingOrder.produceName}' }
        ]
      },
      callback: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', reference: response.reference }));
      },
      onClose: function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cancel' }));
      }
    });
    handler.openIframe();
  };
</script>
</body>
</html>`,
              }}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  if (data.type === 'success') {
                    onPaymentSuccess(data.reference || paystackRef.current);
                  } else if (data.type === 'cancel') {
                    onPaymentCancel();
                  }
                } catch {}
              }}
              javaScriptEnabled
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterBar: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    maxHeight: 56,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryPale,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMid,
  },
  filterChipTextActive: {
    color: COLORS.primary,
  },
  orderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginBottom: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderProduce: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  orderQty: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  partiesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  partyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  partyRole: {
    fontSize: 10,
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  partyName: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
    maxWidth: 120,
  },
  escrowInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.escrowLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  escrowText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.escrow,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryPale,
  },
  chatBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  acceptBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  counterBtn: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.escrow,
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: COLORS.escrow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  deliverBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.verified,
    paddingVertical: 11,
    borderRadius: 12,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.success,
    paddingVertical: 11,
    borderRadius: 12,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  disputeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', lineHeight: 21 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  modalSub: { fontSize: 14, color: COLORS.textLight, marginBottom: 20 },
  modalLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMid,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  modalInput: {
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.text, marginBottom: 20,
  },
  modalBtnRow: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  modalCancelText: { color: COLORS.textMid, fontWeight: '700', fontSize: 15 },
  modalSubmitBtn: {
    flex: 2, backgroundColor: COLORS.primary,
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  modalSubmitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // Paystack modal
  paystackContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? 0 : 44,
  },
  paystackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  paystackClose: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paystackTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
  },
  paystackSub: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 1,
  },
  escrowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.escrowLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  escrowChipText: {
    fontSize: 11,
    color: COLORS.escrow,
    fontWeight: '700',
  },
});
