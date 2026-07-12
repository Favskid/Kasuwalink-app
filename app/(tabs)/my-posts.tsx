// app/(tabs)/my-posts.tsx
import { Ionicons } from '@expo/vector-icons';
import { equalTo, onValue, orderByChild, query, ref, remove } from 'firebase/database';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { database } from '../../config/firebaseConfig';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { Post } from '../../types';

export default function MyPostsScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const q = query(ref(database, 'posts'), orderByChild('farmerUid'), equalTo(user.uid));
    const unsubscribe = onValue(q, (snapshot) => {
      const loaded: Post[] = [];
      snapshot.forEach((child) => {
        loaded.push({ id: child.key as string, ...child.val() });
      });
      loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setPosts(loaded);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleDelete = (postId: string, produceName: string) => {
    Alert.alert(
      'Delete Listing',
      `Remove "${produceName}" from the market?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(ref(database, 'posts/' + postId));
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={styles.postImage} />
      ) : (
        <View style={[styles.postImage, styles.noImage]}>
          <Ionicons name="leaf" size={28} color={COLORS.primaryLight} />
        </View>
      )}

      <View style={styles.postInfo}>
        <View style={styles.postTopRow}>
          <Text style={styles.postName} numberOfLines={1}>{item.produceName}</Text>
          <View style={[
            styles.postStatusBadge,
            { backgroundColor: item.status === 'available' ? COLORS.successLight : COLORS.borderLight },
          ]}>
            <Text style={[
              styles.postStatusText,
              { color: item.status === 'available' ? COLORS.success : COLORS.textLight },
            ]}>
              {item.status?.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.postPrice}>₦{item.price?.toLocaleString()} / {item.unit}</Text>

        <View style={styles.postMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="cube-outline" size={13} color={COLORS.textLight} />
            <Text style={styles.metaText}>{item.quantity} {item.unit}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={13} color={COLORS.textLight} />
            <Text style={styles.metaText}>{item.location}</Text>
          </View>
          {item.videoUrl && (
            <View style={styles.videoChip}>
              <Ionicons name="videocam" size={11} color={COLORS.live} />
              <Text style={styles.videoChipText}>Video</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.id, item.produceName)}
      >
        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No listings yet</Text>
            <Text style={styles.emptySub}>
              Use the + button to list your first produce on the market
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  postCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  postImage: {
    width: 90,
    height: 90,
    backgroundColor: COLORS.primaryPale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImage: {},
  postInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  postTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  postName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 6,
  },
  postStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  postStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  postPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 6,
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  videoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  videoChipText: {
    fontSize: 10,
    color: COLORS.live,
    fontWeight: '700',
  },
  deleteBtn: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', lineHeight: 21 },
});
