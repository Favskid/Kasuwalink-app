// app/(tabs)/home.tsx
import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, Modal, Alert, Image } from 'react-native';
import { ref, onValue, push, set, serverTimestamp } from 'firebase/database';
import { database } from '../../config/firebaseConfig';
import { Post } from '../../types';
import { COLORS } from '../../constants/colors';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function HomeScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [offerQuantity, setOfferQuantity] = useState('');

  useEffect(() => {
    const postsRef = ref(database, 'posts');
    const unsubscribe = onValue(postsRef, (snapshot) => {
        const loadedPosts: Post[] = [];
        snapshot.forEach((childSnapshot) => {
          loadedPosts.push({ id: childSnapshot.key as string, ...childSnapshot.val() });
        });
        loadedPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setPosts(loadedPosts);
        setLoading(false);
        setError('');
      }, (err) => {
        setError('Failed to load posts.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const handleMakeOffer = async () => {
    if (!selectedPost || !user || !offerPrice || !offerQuantity) return;
    try {
      const newOrderRef = push(ref(database, 'orders'));
      await set(newOrderRef, {
        postId: selectedPost.id,
        produceName: selectedPost.produceName,
        buyerUid: user.uid,
        farmerUid: selectedPost.farmerUid,
        priceOffered: parseFloat(offerPrice),
        quantity: parseFloat(offerQuantity),
        status: 'pending',
        createdAt: serverTimestamp()
      });
      Alert.alert('Success', 'Offer sent to farmer! Check Orders tab.');
      setOfferModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.produceName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter ? post.location?.toLowerCase().includes(locationFilter.toLowerCase()) : true;
    return matchesSearch && matchesLocation;
  });

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity style={styles.postCard} onPress={() => router.push(`/chat/${item.id}`)} activeOpacity={0.8}>
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.postImage} />
      ) : (
        <View style={[styles.postImage, styles.noImage]}>
          <Ionicons name="leaf-outline" size={40} color={COLORS.primaryLight} />
        </View>
      )}

      <View style={styles.postContent}>
        <View style={styles.postHeader}>
          <Text style={styles.produce}>{item.produceName}</Text>
          <Text style={styles.price}>₦{item.price} / {item.unit}</Text>
        </View>
        
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="cube-outline" size={14} color={COLORS.primary} />
            <Text style={styles.badgeText}>{item.quantity} available</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="location-outline" size={14} color={COLORS.secondary} />
            <Text style={[styles.badgeText, { color: COLORS.secondary }]}>{item.location}</Text>
          </View>
        </View>

        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionBtnOutline} onPress={() => router.push(`/chat/${item.id}`)}>
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.primary} />
            <Text style={styles.actionTextOutline}>Message</Text>
          </TouchableOpacity>
          
          {user?.role === 'buyer' && (
            <TouchableOpacity 
              style={styles.actionBtnSolid}
              onPress={() => {
                setSelectedPost(item);
                setOfferPrice(item.price.toString());
                setOfferQuantity('1');
                setOfferModalVisible(true);
              }}
            >
              <Text style={styles.actionTextSolid}>Make Offer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScreenWrapper style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace 🌾</Text>
        <Text style={styles.headerSubtitle}>Discover fresh produce directly from farmers</Text>
      </View>
      
      <View style={styles.filtersContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <TextInput style={styles.searchInput} placeholder="Search produce..." value={searchQuery} onChangeText={setSearchQuery} placeholderTextColor={COLORS.textLight} />
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="location" size={20} color={COLORS.textLight} />
          <TextInput style={styles.searchInput} placeholder="Filter by location" value={locationFilter} onChangeText={setLocationFilter} placeholderTextColor={COLORS.textLight} />
        </View>
      </View>

      <FlatList
        data={filteredPosts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      />

      <Modal visible={offerModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Make an Offer</Text>
            <Text style={{color: COLORS.textLight, marginBottom: 15}}>Suggest a price for {selectedPost?.produceName}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Offer Price (₦)</Text>
              <TextInput style={styles.modalInput} keyboardType="numeric" value={offerPrice} onChangeText={setOfferPrice} />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Quantity Needed</Text>
              <TextInput style={styles.modalInput} keyboardType="numeric" value={offerQuantity} onChangeText={setOfferQuantity} />
            </View>

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setOfferModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleMakeOffer}>
                <Text style={styles.saveText}>Send Offer</Text>
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
  header: { padding: 20, paddingTop: 10, backgroundColor: 'rgba(255, 255, 255, 0.85)', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: COLORS.textLight },
  filtersContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'rgba(255, 255, 255, 0.85)', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', marginBottom: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(243, 244, 246, 0.8)', borderRadius: 10, paddingHorizontal: 12, marginBottom: 8 },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15, color: COLORS.text },
  
  postCard: { backgroundColor: 'rgba(255, 255, 255, 0.95)', marginHorizontal: 16, marginVertical: 8, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.5)' },
  postImage: { width: '100%', height: 160, backgroundColor: '#E5E7EB' },
  noImage: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#ECFDF5' },
  postContent: { padding: 16 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  produce: { fontSize: 19, fontWeight: 'bold', color: COLORS.text },
  price: { fontSize: 18, fontWeight: '800', color: COLORS.success },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  desc: { color: COLORS.textLight, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  
  postActions: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16 },
  actionBtnOutline: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary },
  actionTextOutline: { color: COLORS.primary, fontWeight: '600', marginLeft: 6 },
  actionBtnSolid: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: COLORS.primary },
  actionTextSolid: { color: COLORS.white, fontWeight: '600' },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.white, padding: 24, borderRadius: 16 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginBottom: 6, textTransform: 'uppercase' },
  modalInput: { borderWidth: 1, borderColor: COLORS.border, padding: 14, borderRadius: 10, fontSize: 16, backgroundColor: '#F9FAFB' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelText: { color: COLORS.text, fontWeight: '600', fontSize: 16 },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
});
