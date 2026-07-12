// app/(tabs)/create.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ref as dbRef, push, serverTimestamp, set } from 'firebase/database';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';
import { database } from '../../config/firebaseConfig';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';

const CLOUDINARY_CLOUD = 'zosh1v8m';
const CLOUDINARY_UPLOAD_PRESET = 'kasuwalink_upload';
const CLOUDINARY_IMAGE_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;
const CLOUDINARY_VIDEO_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/video/upload`;

const UNITS = ['kg', 'bag', 'basket', 'crate', 'piece', 'litre', 'dozen', 'tonne'];

export default function CreatePostScreen() {
  const { user } = useAuth();
  const [produceName, setProduceName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets) {
      const uris = result.assets.map((a) => a.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 5));
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
    }
  };

  const uploadToCloudinary = async (uri: string, type: 'image' | 'video') => {
    const data = new FormData();
    data.append('file', {
      uri,
      type: type === 'image' ? 'image/jpeg' : 'video/mp4',
      name: `upload_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
    } as any);
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const url = type === 'image' ? CLOUDINARY_IMAGE_URL : CLOUDINARY_VIDEO_URL;
    const res = await fetch(url, { method: 'POST', body: data });
    const result = await res.json();
    if (result.secure_url) return result.secure_url;
    throw new Error(result.error?.message || `Failed to upload ${type}`);
  };

  const handleCreatePost = async () => {
    if (!produceName.trim() || !description.trim() || !quantity || !price) {
      Alert.alert('Missing Details', 'Please fill in all required fields');
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
        setUploadStep(`Uploading images (0/${images.length})...`);
        const uploadedImages: string[] = [];
        for (let i = 0; i < images.length; i++) {
          setUploadStep(`Uploading images (${i + 1}/${images.length})...`);
          const url = await uploadToCloudinary(images[i], 'image');
          uploadedImages.push(url);
        }
        imageUrls = uploadedImages;
      }

      let uploadedVideoUrl: string | null = null;
      if (videoUri) {
        setUploadStep('Uploading produce video...');
        uploadedVideoUrl = await uploadToCloudinary(videoUri, 'video');
      }

      setUploadStep('Saving listing...');
      const newPostRef = push(dbRef(database, 'posts'));
      await set(newPostRef, {
        produceName: produceName.trim(),
        description: description.trim(),
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        unit,
        location,
        images: imageUrls,
        videoUrl: uploadedVideoUrl || null,
        farmerUid: user.uid,
        farmerName: user.displayName || '',
        farmerEmail: user.email || '',
        farmerVerified: user.verificationStatus === 'verified',
        status: 'available',
        createdAt: serverTimestamp(),
      });

      Alert.alert('Listed! 🎉', 'Your produce is now live on the market.', [
        { text: 'View Listings', onPress: () => router.push('/(tabs)/my-posts') },
        { text: 'Post Another', onPress: () => {
          setProduceName(''); setDescription(''); setQuantity('');
          setPrice(''); setImages([]); setVideoUri(null);
        }},
      ]);
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
    } finally {
      setUploading(false);
      setUploadStep('');
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Produce Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Produce Details</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Produce Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Fresh Tomatoes, Garlic, Yam"
            value={produceName}
            onChangeText={setProduceName}
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your produce — quality, freshness, harvest date..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <View style={styles.rowFields}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50"
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textLight}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Price (₦) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2500"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textLight}
            />
          </View>
        </View>

        {/* Unit selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Unit</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
            <View style={styles.chipRow}>
              {UNITS.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[styles.chip, unit === u && styles.chipActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.chipText, unit === u && styles.chipTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Location - free text input */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Kano, Kaduna, Ibadan..."
            value={location}
            onChangeText={setLocation}
            placeholderTextColor={COLORS.textLight}
          />
        </View>
      </View>

      {/* Images */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Produce Photos</Text>
        <Text style={styles.sectionSub}>Add up to 5 photos of your produce</Text>

        <View style={styles.mediaGrid}>
          {images.map((uri, idx) => (
            <View key={idx} style={styles.mediaThumb}>
              <Image source={{ uri }} style={styles.thumbImage} />
              <TouchableOpacity
                style={styles.removeThumb}
                onPress={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
              >
                <Ionicons name="close-circle" size={22} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 && (
            <TouchableOpacity style={styles.addMediaBtn} onPress={pickImages}>
              <Ionicons name="camera-outline" size={28} color={COLORS.primaryLight} />
              <Text style={styles.addMediaText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Live Video */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Produce Video</Text>
            <Text style={styles.sectionSub}>Upload a short video to show buyers</Text>
          </View>
          <View style={styles.liveBadge}>
            <Ionicons name="videocam" size={13} color="#fff" />
            <Text style={styles.liveBadgeText}>LIVE</Text>
          </View>
        </View>

        {videoUri ? (
          <View style={styles.videoPreview}>
            <View style={styles.videoPreviewInner}>
              <Ionicons name="film-outline" size={36} color={COLORS.primary} />
              <Text style={styles.videoPreviewText}>Video selected</Text>
              <Text style={styles.videoPreviewSub} numberOfLines={1}>{videoUri.split('/').pop()}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeVideoBtn}
              onPress={() => setVideoUri(null)}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              <Text style={styles.removeVideoText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addVideoBtn} onPress={pickVideo}>
            <Ionicons name="videocam-outline" size={32} color={COLORS.primaryLight} />
            <Text style={styles.addVideoText}>Select Produce Video</Text>
            <Text style={styles.addVideoSub}>MP4 recommended</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Submit */}
      <View style={styles.section}>
        {uploading ? (
          <View style={styles.uploadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.uploadingText}>{uploadStep || 'Uploading...'}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.submitBtn} onPress={handleCreatePost} activeOpacity={0.85}>
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>Publish Listing</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: 40,
  },
  section: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 14,
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
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 13,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primaryPale,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMid,
  },
  chipTextActive: {
    color: COLORS.primary,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaThumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: 'visible',
    position: 'relative',
  },
  thumbImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  removeThumb: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  addMediaBtn: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: COLORS.primaryPale,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addMediaText: {
    fontSize: 10,
    color: COLORS.primaryLight,
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.live,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11,
  },
  addVideoBtn: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    borderStyle: 'dashed',
    backgroundColor: COLORS.primaryPale,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
  },
  addVideoText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  addVideoSub: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  videoPreview: {
    borderRadius: 14,
    backgroundColor: COLORS.primaryPale,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  videoPreviewInner: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  videoPreviewText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  videoPreviewSub: {
    fontSize: 12,
    color: COLORS.textLight,
    maxWidth: 220,
  },
  removeVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  removeVideoText: {
    color: COLORS.error,
    fontWeight: '600',
    fontSize: 14,
  },
  uploadingBox: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  uploadingText: {
    color: COLORS.textMid,
    fontSize: 14,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
