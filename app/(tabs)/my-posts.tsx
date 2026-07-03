// app/(tabs)/my-posts.tsx
import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { ref, query, orderByChild, equalTo, onValue, remove } from 'firebase/database';
import { database } from '../../config/firebaseConfig';
import { Post } from '../../types';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';

export default function MyPostsScreen() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const postsQuery = query(ref(database, 'posts'), orderByChild('farmerUid'), equalTo(user.uid));
    const unsubscribe = onValue(postsQuery, (snapshot) => {
      const loadedPosts: Post[] = [];
      snapshot.forEach((child) => {
        loadedPosts.push({ id: child.key as string, ...child.val() });
      });
      loadedPosts.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(loadedPosts);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleDelete = (postId: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this produce listing?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await remove(ref(database, 'posts/' + postId));
            Alert.alert('Success', 'Post deleted successfully');
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
      }}
    ]);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.produce}>{item.produceName} (x{item.quantity})</Text>
        <Text style={styles.price}>₦{item.price}</Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
        <Ionicons name="trash-outline" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScreenWrapper style={styles.container}>
      <Text style={styles.header}>My Farm Listings</Text>
      <FlatList
        data={posts}
        keyExtractor={item => item.id}
        renderItem={renderPost}
        ListEmptyComponent={<Text style={styles.empty}>You haven't listed any produce yet.</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  header: { fontSize: 24, fontWeight: '800', color: COLORS.primary, padding: 16 },
  postCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.90)', 
    marginHorizontal: 16, 
    marginVertical: 8, 
    padding: 16, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.5)', 
    flexDirection: 'row', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  produce: { fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  price: { fontSize: 16, color: COLORS.success, fontWeight: '600' },
  deleteBtn: { backgroundColor: '#EF4444', padding: 10, borderRadius: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', marginTop: 40, color: COLORS.textLight, fontSize: 16 },
});
