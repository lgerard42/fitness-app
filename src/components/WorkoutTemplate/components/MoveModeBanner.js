import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

const MoveModeBanner = ({ onCancel, onDone, styles }) => {
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
