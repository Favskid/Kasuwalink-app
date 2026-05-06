// app/(tabs)/home.tsx
import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from '../../config/firebaseConfig';
import { Post } from '../../types';
import { COLORS } from '../../constants/colors';
import { router } from 'expo-router';

export default function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const postsRef = ref(database, 'posts');
    const unsubscribe = onValue(
      postsRef,
      (snapshot) => {
        const loadedPosts: Post[] = [];
        snapshot.forEach((childSnapshot) => {
          loadedPosts.push({
            id: childSnapshot.key as string,
            ...childSnapshot.val()
          });
        });
        
        // Sort descending by client side
        loadedPosts.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

        setPosts(loadedPosts);
        setLoading(false);
        setError('');
      },
      (err) => {
        console.error(err);
        setError('Failed to load posts. Check your internet.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity 
      style={styles.postCard}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <Text style={styles.produce}>{item.produceName}</Text>
      <Text style={styles.price}>₦{item.price} / {item.unit}</Text>
      <Text style={styles.details}>Qty: {item.quantity} • 📍 {item.location}</Text>
      <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
      {item.images?.length > 0 && <Text style={styles.images}>📷 {item.images.length} photos</Text>}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.text }}>Loading market...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red' }}>{error}</Text>
        <TouchableOpacity onPress={() => {}}>
          <Text style={{ color: COLORS.primary, marginTop: 10 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Market Feed 🌾</Text>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>No produce listed yet.</Text>
            <Text style={{ color: '#666' }}>Farmers can post from the Create tab</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, padding: 16 },
  postCard: {
    backgroundColor: 'white',
    margin: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  produce: { fontSize: 18, fontWeight: '600' },
  price: { fontSize: 17, fontWeight: 'bold', color: '#4CAF50', marginVertical: 6 },
  details: { color: '#555', marginBottom: 6 },
  desc: { color: '#444', marginTop: 4 },
  images: { color: '#888', marginTop: 8, fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  empty: { fontSize: 16, textAlign: 'center', marginBottom: 8 },
});
