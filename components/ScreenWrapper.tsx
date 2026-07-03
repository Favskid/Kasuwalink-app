import React from 'react';
import { View, StyleSheet, ImageBackground, ViewStyle } from 'react-native';
import { COLORS } from '../constants/colors';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  overlayOpacity?: number;
};

// Beautiful faint leafy agricultural background
const BG_IMAGE_URL = 'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?q=80&w=1080&auto=format&fit=crop';

export default function ScreenWrapper({ children, style, overlayOpacity = 0.9 }: Props) {
  return (
    <ImageBackground 
      source={{ uri: BG_IMAGE_URL }} 
      style={styles.background}
      resizeMode="cover"
    >
      <View style={[styles.overlay, { backgroundColor: `rgba(248, 250, 249, ${overlayOpacity})` }]}>
        <View style={[styles.content, style]}>
          {children}
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    // The overlay color is applied inline to allow custom opacities
  },
  content: {
    flex: 1,
  }
});
