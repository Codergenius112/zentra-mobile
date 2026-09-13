import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

// Source photo is 860×640. The moon disc + glow sits at roughly
// x:150-260, y:130-240 (verified by pixel analysis, not eyeballed).
// Cropping the visible window to start at x=280 keeps a comfortable
// margin past the moon while preserving most of the starfield,
// mountains, and water below.
const IMG_W = 860;
const IMG_H = 640;
const CROP_LEFT = 280;

export default function NightSkyBackground() {
  const { width, height } = Dimensions.get('window');
  const cropWidth = IMG_W - CROP_LEFT;

  // Scale large enough to fill the screen either way, so this holds up
  // across different device aspect ratios, not just the common ones.
  const scale = Math.max(height / IMG_H, width / cropWidth);
  const scaledW = IMG_W * scale;
  const scaledH = IMG_H * scale;
  const offsetX = -(CROP_LEFT * scale);
  const offsetY = -((scaledH - height) / 2);

  return (
    <View style={[StyleSheet.absoluteFill, styles.clip]}>
      <Image
        source={require('../assets/images/celestial_night_sky_crescent_moon_deep_purple_navy_atmospheric.jpg')}
        style={{ position: 'absolute', width: scaledW, height: scaledH, left: offsetX, top: offsetY }}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden', backgroundColor: '#0A0A0F' },
});
