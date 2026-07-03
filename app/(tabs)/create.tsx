import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { ref as dbRef, push, serverTimestamp, set } from "firebase/database";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import ScreenWrapper from "../../components/ScreenWrapper";
import { database } from "../../config/firebaseConfig";
import { COLORS } from "../../constants/colors";
import { useAuth } from "../../hooks/useAuth";

// TODO: Replace with your actual Cloudinary Details
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/zosh1v8m/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "kasuwalink_upload";

export default function CreatePostScreen() {
  const { user } = useAuth();
  const [produceName, setProduceName] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [location, setLocation] = useState("Lagos");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...uris].slice(0, 5)); // max 5 images
    }
  };

  const uploadToCloudinary = async (imageUri: string) => {
    const data = new FormData();
    data.append("file", {
      uri: imageUri,
      type: "image/jpeg",
      name: `upload_${Date.now()}.jpg`,
    } as any);
    data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: data,
    });

    const result = await response.json();
    if (result.secure_url) {
      return result.secure_url;
    } else {
      throw new Error(result.error?.message || "Failed to upload image");
    }
  };

  const handleCreatePost = async () => {
    if (!produceName || !description || !quantity || !price) {
      Alert.alert("Missing Details", "Please fill all required fields");
      return;
    }
    if (!user) {
      Alert.alert("Error", "You must be logged in to create a post");
      return;
    }

    if (
      CLOUDINARY_UPLOAD_PRESET === "YOUR_UPLOAD_PRESET" &&
      images.length > 0
    ) {
      Alert.alert(
        "Configuration Needed",
        "Please add your Cloudinary Cloud Name and Upload Preset in app/(tabs)/create.tsx to upload images.",
      );
      return;
    }

    setUploading(true);
    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const uploadPromises = images.map((uri) => uploadToCloudinary(uri));
        imageUrls = await Promise.all(uploadPromises);
      }

      const newPostRef = push(dbRef(database, "posts"));
      await set(newPostRef, {
        produceName,
        description,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        unit,
        location,
        images: imageUrls,
        createdAt: serverTimestamp(),
        status: "available",
        farmerUid: user.uid,
      });

      Alert.alert("Success 🎉", "Your produce is now live on the market!");
      setProduceName("");
      setDescription("");
      setQuantity("");
      setPrice("");
      setImages([]);
      router.push("/(tabs)/my-posts");
    } catch (error: any) {
      Alert.alert("Upload Error", error.message || "Failed to create post");
    }
    setUploading(false);
  };

  return (
    <ScreenWrapper>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>List New Produce</Text>
          <Text style={styles.subtitle}>
            Reach buyers faster with clear details
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Produce Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Fresh Tomatoes"
            value={produceName}
            onChangeText={setProduceName}
            placeholderTextColor={COLORS.textLight}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the quality and freshness..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            placeholderTextColor={COLORS.textLight}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 50"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Price (₦)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 5000"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Unit</Text>
              <TextInput
                style={styles.input}
                placeholder="kg, basket..."
                value={unit}
                onChangeText={setUnit}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Farm location"
                value={location}
                onChangeText={setLocation}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          <Text style={styles.label}>Product Images (Max 5)</Text>
          <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
            <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
            <Text style={styles.imagePickerText}>Tap to add photos</Text>
          </TouchableOpacity>

          {images.length > 0 && (
            <View style={styles.imagePreview}>
              {images.map((uri, index) => (
                <Image
                  key={index}
                  source={{ uri }}
                  style={styles.previewImage}
                />
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreatePost}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.createButtonText}>Publish Listing</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 20, marginTop: 10 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, color: COLORS.textLight },
  formCard: {
    backgroundColor: "rgba(255, 255, 255, 0.90)",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "rgba(249, 250, 251, 0.8)",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: { height: 100 },
  row: { flexDirection: "row" },
  imagePickerBtn: {
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderStyle: "dashed",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  imagePickerText: { color: COLORS.primary, fontWeight: "600", fontSize: 16 },
  imagePreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  previewImage: { width: 70, height: 70, borderRadius: 10 },
  createButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
