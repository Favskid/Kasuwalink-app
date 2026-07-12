// app/(tabs)/home.tsx
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { onValue, push, ref, serverTimestamp, set } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { database } from '../../config/firebaseConfig';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { Post } from '../../types';

// ─── Video Modal Component ──────────────────────────────────────────────────
function VideoModal({ visible, videoUrl, onClose }: { visible: boolean; videoUrl: string; onClose: () => void }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={videoStyles.overlay}>
        <View style={videoStyles.container}>
          <View style={videoStyles.header}>
            <View style={videoStyles.liveBadgeLg}>
              <Ionicons name="videocam" size={14} color="#fff" />
              <Text style={videoStyles.liveBadgeText}>PRODUCE VIDEO</Text>
            </View>
            <TouchableOpacity style={videoStyles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <VideoView
            player={player}
            style={videoStyles.video}
            allowsFullscreen
            allowsPictureInPicture
          />
        </View>
      </View>
    </Modal>
  );
}

const videoStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  liveBadgeLg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.live,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
});

// ─── Offer Modal Component ──────────────────────────────────────────────────
function OfferModal({
  visible, post, onClose, onSubmit,
}: {
  visible: boolean;
  post: Post | null;
  onClose: () => void;
  onSubmit: (price: string, qty: string) => void;
}) {
  const [offerPrice, setOfferPrice] = useState(post?.price?.toString() || '');
  const [offerQty, setOfferQty] = useState('1');

  useEffect(() => {
    if (post) {
      setOfferPrice(post.price?.toString() || '');
      setOfferQty('1');
    }
  }, [post]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={offerStyles.overlay}>
        <View style={offerStyles.sheet}>
          <View style={offerStyles.handle} />
          <Text style={offerStyles.title}>Make an Offer</Text>
          {post && (
            <Text style={offerStyles.postName}>{post.produceName} — ₦{post.price}/{post.unit}</Text>
          )}

          <Text style={offerStyles.label}>Your Offer Price (₦ per {post?.unit})</Text>
          <TextInput
            style={offerStyles.input}
            value={offerPrice}
            onChangeText={setOfferPrice}
            keyboardType="numeric"
            placeholder="Enter price"
            placeholderTextColor={COLORS.textLight}
          />

          <Text style={offerStyles.label}>Quantity ({post?.unit})</Text>
          <TextInput
            style={offerStyles.input}
            value={offerQty}
            onChangeText={setOfferQty}
            keyboardType="numeric"
            placeholder="Enter quantity"
            placeholderTextColor={COLORS.textLight}
          />

          {offerPrice && offerQty ? (
            <View style={offerStyles.totalRow}>
              <Text style={offerStyles.totalLabel}>Total</Text>
              <Text style={offerStyles.totalValue}>
                ₦{(parseFloat(offerPrice || '0') * parseFloat(offerQty || '0')).toLocaleString()}
              </Text>
            </View>
          ) : null}

          <View style={offerStyles.btnRow}>
            <TouchableOpacity style={offerStyles.cancelBtn} onPress={onClose}>
              <Text style={offerStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={offerStyles.submitBtn}
              onPress={() => onSubmit(offerPrice, offerQty)}
            >
              <Text style={offerStyles.submitText}>Send Offer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const offerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  postName: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMid,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.primaryPale,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.textMid,
    fontWeight: '700',
    fontSize: 15,
  },
  submitBtn: {
    flex: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

// ─── Main Home Screen ────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  useEffect(() => {
    const postsRef = ref(database, 'posts');
    const unsubscribe = onValue(postsRef, (snapshot) => {
      const loadedPosts: Post[] = [];
      snapshot.forEach((child) => {
        loadedPosts.push({ id: child.key as string, ...child.val() });
      });
      loadedPosts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setPosts(loadedPosts);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleMakeOffer = async (offerPrice: string, offerQty: string) => {
    if (!selectedPost || !user || !offerPrice || !offerQty) return;
    try {
      const newOrderRef = push(ref(database, 'orders'));
      await set(newOrderRef, {
        postId: selectedPost.id,
        produceName: selectedPost.produceName,
        buyerUid: user.uid,
        buyerName: user.displayName || '',
        buyerEmail: user.email || '',
        farmerUid: selectedPost.farmerUid,
        farmerName: selectedPost.farmerName || '',
        farmerEmail: selectedPost.farmerEmail || '',
        priceOffered: parseFloat(offerPrice),
        quantity: parseFloat(offerQty),
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      Alert.alert('Offer Sent! 🎉', 'The farmer will review your offer. Check the Orders tab.');
      setOfferModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const openChat = (post: Post) => {
    if (!user) return;
    if (user.uid === post.farmerUid) {
      Alert.alert('Your Post', 'You cannot message yourself. Buyers will contact you.');
      return;
    }
    // threadId = postId_buyerUid — unique private thread per buyer per post
    const threadId = `${post.id}_${user.uid}`;
    router.push({
      pathname: '/chat/[threadId]',
      params: {
        threadId,
        postId: post.id,
        farmerUid: post.farmerUid,
        farmerName: post.farmerName || 'Farmer',
        farmerEmail: post.farmerEmail || '',
        produceName: post.produceName,
      },
    });
  };

  const filteredPosts = posts.filter((post) => {
    const matchSearch = post.produceName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchLoc = locationFilter
      ? post.location?.toLowerCase().includes(locationFilter.toLowerCase())
      : true;
    return matchSearch && matchLoc;
  });

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.card}>
      {/* Image */}
      <View style={styles.imageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.noImagePlaceholder]}>
            <Ionicons name="leaf" size={42} color={COLORS.primaryLight} />
          </View>
        )}

        {/* LIVE video badge */}
        {item.videoUrl ? (
          <TouchableOpacity
            style={styles.liveBadge}
            onPress={() => {
              setVideoUrl(item.videoUrl!);
              setVideoModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="videocam" size={12} color="#fff" />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </TouchableOpacity>
        ) : null}

        {/* Status badge */}
        {item.status === 'sold' && (
          <View style={styles.soldBadge}>
            <Text style={styles.soldBadgeText}>SOLD</Text>
          </View>
        )}

        {/* Verified badge */}
        {item.farmerVerified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={COLORS.verified} />
            <Text style={styles.verifiedBadgeText}>Verified</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={styles.produceName} numberOfLines={1}>{item.produceName}</Text>
          <Text style={styles.priceText}>₦{item.price?.toLocaleString()}</Text>
        </View>
        <Text style={styles.priceUnit}>per {item.unit}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="cube-outline" size={13} color={COLORS.primary} />
            <Text style={styles.metaChipText}>{item.quantity} {item.unit}</Text>
          </View>
          <View style={[styles.metaChip, styles.metaChipAmber]}>
            <Ionicons name="location-outline" size={13} color={COLORS.secondary} />
            <Text style={[styles.metaChipText, { color: COLORS.secondary }]}>{item.location}</Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* Farmer info */}
        {item.farmerName ? (
          <View style={styles.farmerRow}>
            <Ionicons name="person-circle-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.farmerName}>{item.farmerName}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actionRow}>
          {/* Message button - only if not own post */}
          {user?.uid !== item.farmerUid && (
            <TouchableOpacity
              style={styles.msgBtn}
              onPress={() => openChat(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={17} color={COLORS.primary} />
              <Text style={styles.msgBtnText}>Message</Text>
            </TouchableOpacity>
          )}

          {/* Offer button - buyers only, post must be available */}
          {user?.role === 'buyer' && item.status !== 'sold' && (
            <TouchableOpacity
              style={styles.offerBtn}
              onPress={() => {
                setSelectedPost(item);
                setOfferModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="pricetag-outline" size={17} color="#fff" />
              <Text style={styles.offerBtnText}>Make Offer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const ListHeader = () => (
    <View style={styles.listHeader}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search produce..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.textLight}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Location filter */}
      <View style={[styles.searchBar, { marginTop: 10 }]}>
        <Ionicons name="location-outline" size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Filter by location..."
          value={locationFilter}
          onChangeText={setLocationFilter}
          placeholderTextColor={COLORS.textLight}
        />
        {locationFilter.length > 0 && (
          <TouchableOpacity onPress={() => setLocationFilter('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.resultCount}>
        {filteredPosts.length} listing{filteredPosts.length !== 1 ? 's' : ''} available
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading market...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No produce listed yet</Text>
            <Text style={styles.emptySubtitle}>Check back soon or pull to refresh</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />

      <OfferModal
        visible={offerModalVisible}
        post={selectedPost}
        onClose={() => setOfferModalVisible(false)}
        onSubmit={handleMakeOffer}
      />

      <VideoModal
        visible={videoModalVisible}
        videoUrl={videoUrl}
        onClose={() => setVideoModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  loadingText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
  listHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  resultCount: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 12,
    marginLeft: 2,
    fontWeight: '500',
  },
  // Card styles
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  imageContainer: {
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: 190,
    backgroundColor: COLORS.primaryPale,
  },
  noImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.live,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: COLORS.live,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  liveBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  soldBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.textMid,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  soldBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  verifiedBadgeText: {
    color: COLORS.verified,
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  produceName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  priceUnit: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 12,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryPale,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  metaChipAmber: {
    backgroundColor: COLORS.secondaryLight,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  description: {
    fontSize: 13,
    color: COLORS.textMid,
    lineHeight: 19,
    marginBottom: 10,
  },
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  farmerName: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  msgBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryPale,
  },
  msgBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  offerBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  offerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
});
