import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Star, X } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

interface ChipProps {
  label: string;
  selected: boolean;
  isPrimary?: boolean;
  isSpecial?: boolean;
  onClick: () => void;
  onRemove?: () => void;
  onMakePrimary?: () => void;
  /** When set, shows "2"/"3" circle button on primary badge; "3" when hasTertiarySelected */
  onSecondaryPress?: () => void;
  hasSecondarySelected?: boolean;
  hasTertiarySelected?: boolean;
}

const Chip: React.FC<ChipProps> = ({ label, selected, isPrimary, isSpecial, onClick, onRemove, onMakePrimary, onSecondaryPress, hasSecondarySelected, hasTertiarySelected }) => {
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
      <View style={styles.contentRow}>
        {isSelectedPrimary && (
          <View style={styles.starContainer}>
            <Star size={12} color={COLORS.white} fill={COLORS.white} />
          </View>
        )}
        {isSelectedSecondary && onMakePrimary && (
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); onMakePrimary(); }} style={styles.starContainer}>
            <Star size={12} color={COLORS.blue[400]} />
          </TouchableOpacity>
        )}
        <Text style={[
          styles.text,
          selected ? (isSelectedPrimary ? styles.textSelectedPrimary : styles.textSelectedSecondary) : styles.textUnselected
        ]}>
          {label}
        </Text>

        {onRemove && (
          <TouchableOpacity onPress={(e) => { e.stopPropagation(); onRemove(); }} style={styles.iconContainer}>
            <X size={12} color={COLORS.slate[500]} />
          </TouchableOpacity>
        )}
      </View>

      {selected && onSecondaryPress != null && (
        <TouchableOpacity
          onPress={(e) => { e.stopPropagation(); onSecondaryPress(); }}
          style={[
            styles.secondaryButton,
            (hasSecondarySelected || hasTertiarySelected) ? styles.secondaryButtonSelected : styles.secondaryButtonDisabled
          ]}
        >
          <Text style={[styles.secondaryButtonText, (hasSecondarySelected || hasTertiarySelected) ? styles.secondaryButtonTextSelected : styles.secondaryButtonTextDisabled]}>
            {hasTertiarySelected ? '3' : '2'}
          </Text>
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
    position: 'relative',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    marginRight: 6,
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
    marginRight: 6,
  },
  textSelectedSecondary: {
    color: COLORS.blue[700],
    marginRight: 6,
  },
  iconContainer: {
    marginLeft: 6,
  },
  secondaryButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate[300],
  },
  secondaryButtonDisabled: {
    backgroundColor: COLORS.slate[100],
  },
  secondaryButtonSelected: {
    backgroundColor: COLORS.blue[500],
    borderColor: COLORS.blue[400],
  },
  secondaryButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  secondaryButtonTextDisabled: {
    color: COLORS.slate[500],
  },
  secondaryButtonTextSelected: {
    color: COLORS.white,
  },
});

export default Chip;
