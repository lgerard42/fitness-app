import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import type { StyleSheet } from 'react-native';

interface MoveModeBannerProps {
  onCancel: () => void;
  onDone: () => void;
  styles: any;
}

const MoveModeBanner: React.FC<MoveModeBannerProps> = ({ onCancel, onDone, styles }) => {
  return (
    <View style={styles.moveModeBanner}>
      <TouchableOpacity onPress={onCancel}>
        <Text style={styles.moveModeBannerButtonText}>Cancel</Text>
      </TouchableOpacity>
      <View style={styles.moveModeBannerCenter}>
        <Text style={styles.moveModeBannerTitle}>Move Item</Text>
        <Text style={styles.moveModeBannerSubtitle}>Press and hold on an exercise or group to move it</Text>
      </View>
      <TouchableOpacity onPress={onDone}>
        <Text style={styles.moveModeBannerButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MoveModeBanner;
