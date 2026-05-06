// app/(tabs)/my-posts.tsx
import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { ref, query, orderByChild, equalTo, onValue } from 'firebase/database';
import { database } from '../../config/firebaseConfig';
import { Post } from '../../types';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';

export default function MyPostsScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // Query only posts where farmerUid matches the current user
    const postsQuery = query(ref(database, 'posts'), orderByChild('farmerUid'), equalTo(user.uid));

    const unsubscribe = onValue(postsQuery, (snapshot) => {
      const loadedPosts: Post[] = [];
      snapshot.forEach((childSnap) => {
        loadedPosts.push({
          id: childSnap.key as string,
          ...childSnap.val()
        });
      });
      // Sort descending by createdAt
      loadedPosts.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setPosts(loadedPosts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <Text style={styles.produce}>{item.produceName}</Text>
      <Text style={styles.price}>₦{item.price} / {item.unit}</Text>
      <Text>Qty: {item.quantity} • {item.location}</Text>
      <Text style={styles.desc}>{item.description}</Text>
      {item.images?.length > 0 && <Text>📷 {item.images.length} photos</Text>}
    </View>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Posts ({posts.length})</Text>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        ListEmptyComponent={<Text style={styles.empty}>No posts yet. Create one from the + tab!</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, padding: 16 },
  postCard: { backgroundColor: 'white', margin: 10, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  produce: { fontSize: 18, fontWeight: '600' },
  price: { fontSize: 17, fontWeight: 'bold', color: '#4CAF50', marginVertical: 6 },
  desc: { color: '#444', marginTop: 8 },
  empty: { textAlign: 'center', marginTop: 50, color: '#666' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
