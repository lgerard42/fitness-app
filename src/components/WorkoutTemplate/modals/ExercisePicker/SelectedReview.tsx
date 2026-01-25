import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

const SelectedReview: React.FC = () => {
  return (
    <View style={styles.rootContainer} />
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    borderBottomColor: COLORS.slate[200],
    borderBottomWidth: 2,
  },
});

export default SelectedReview;
