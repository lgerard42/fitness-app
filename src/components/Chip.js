import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Star, X } from 'lucide-react-native';
import { COLORS } from '../constants/colors';

const Chip = ({ label, selected, isPrimary, isSpecial, onClick, onRemove, onMakePrimary }) => {
  const isSelectedPrimary = selected && isPrimary;
  const isSelectedSecondary = selected && !isPrimary;

  return (
    <TouchableOpacity
      onPress={onClick}
      style={[
        styles.container,
        selected ? (isSelectedPrimary ? styles.selectedPrimary : styles.selectedSecondary) : styles.unselected,
        (!selected && isSpecial) && styles.specialUnselected
      ]}
    >
      <Text style={[
        styles.text,
        selected ? (isSelectedPrimary ? styles.textSelectedPrimary : styles.textSelectedSecondary) : styles.textUnselected
      ]}>
        {label}
      </Text>

      {isSelectedPrimary && (
        <View style={styles.iconContainer}>
          <Star size={12} color={COLORS.white} fill={COLORS.white} />
        </View>
      )}

      {isSelectedSecondary && onMakePrimary && (
        <TouchableOpacity onPress={(e) => { e.stopPropagation(); onMakePrimary(); }} style={styles.iconContainer}>
          <Star size={12} color={COLORS.blue[400]} />
        </TouchableOpacity>
      )}

      {onRemove && (
        <TouchableOpacity onPress={(e) => { e.stopPropagation(); onRemove(); }} style={styles.iconContainer}>
          <X size={12} color={COLORS.slate[500]} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  unselected: {
    backgroundColor: COLORS.slate[100],
    borderColor: 'transparent',
  },
  specialUnselected: {
    borderColor: COLORS.slate[300],
  },
  selectedPrimary: {
    backgroundColor: COLORS.blue[600],
    borderColor: COLORS.blue[600],
  },
  selectedSecondary: {
    backgroundColor: COLORS.blue[100],
    borderColor: COLORS.blue[200],
  },
  text: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  textUnselected: {
    color: COLORS.slate[600],
  },
  textSelectedPrimary: {
    color: COLORS.white,
  },
  textSelectedSecondary: {
    color: COLORS.blue[700],
  },
  iconContainer: {
    marginLeft: 6,
  },
});

export default Chip;
