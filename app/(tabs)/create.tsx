// app/(tabs)/create.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ref as dbRef, push, set, serverTimestamp } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '../../config/firebaseConfig';
import { COLORS } from '../../constants/colors';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';

export default function CreatePostScreen() {
  const { user } = useAuth();
  const [produceName, setProduceName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [location, setLocation] = useState('Lagos');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map(asset => asset.uri);
      setImages(prev => [...prev, ...uris].slice(0, 5)); // max 5 images
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    for (const uri of images) {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `posts/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const sRef = storageRef(storage, filename);
      
      await uploadBytes(sRef, blob);
      const downloadUrl = await getDownloadURL(sRef);
      uploadedUrls.push(downloadUrl);
    }
    return uploadedUrls;
  };

  const handleCreatePost = async () => {
    if (!produceName || !description || !quantity || !price) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a post');
      return;
    }

    setUploading(true);
    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      const newPostRef = push(dbRef(database, 'posts'));
      await set(newPostRef, {
        produceName,
        description,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        unit,
        location,
        images: imageUrls,
        createdAt: serverTimestamp(),
        status: 'available',
        farmerUid: user.uid
      });

      Alert.alert('Success', 'Post created successfully!');
      // Clear form
      setProduceName(''); setDescription(''); setQuantity(''); setPrice(''); setImages([]);
      router.push('/(tabs)/my-posts'); // go to my posts
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create post');
    }
    setUploading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create New Post 🌾</Text>

      <TextInput style={styles.input} placeholder="Produce Name (e.g. Yam, Tomatoes)" value={produceName} onChangeText={setProduceName} />
      <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
      
      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
        <TextInput style={[styles.input, { flex: 1, marginLeft: 10 }]} placeholder="Price (₦)" value={price} onChangeText={setPrice} keyboardType="numeric" />
      </View>

      <View style={styles.row}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder="Unit (kg, basket, etc.)" value={unit} onChangeText={setUnit} />
        <TextInput style={[styles.input, { flex: 1, marginLeft: 10 }]} placeholder="Location" value={location} onChangeText={setLocation} />
      </View>

      <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
        <Text style={styles.imageButtonText}>Pick Images ({images.length}/5)</Text>
      </TouchableOpacity>

      <View style={styles.imagePreview}>
        {images.map((uri, index) => (
          <Image key={index} source={{ uri }} style={styles.previewImage} />
        ))}
      </View>

      <TouchableOpacity style={styles.createButton} onPress={handleCreatePost} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.createButtonText}>Post to Market</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: 'white', padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#ddd' },
  row: { flexDirection: 'row' },
  imageButton: { backgroundColor: '#FF9800', padding: 14, borderRadius: 8, alignItems: 'center', marginVertical: 10 },
  imageButtonText: { color: 'white', fontWeight: '600' },
  imagePreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  previewImage: { width: 80, height: 80, borderRadius: 8 },
  createButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  createButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
