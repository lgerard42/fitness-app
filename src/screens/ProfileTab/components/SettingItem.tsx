import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
  // Toggle mode
  isToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  // Segmented mode
  options?: string[];
  selectedOption?: string;
  onSelectOption?: (option: string) => void;
  // Styling
  isLast?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  label,
  value,
  onPress,
  isToggle,
  toggleValue,
  onToggle,
  options,
  selectedOption,
  onSelectOption,
  isLast,
}) => {
  // Toggle mode
  if (isToggle) {
    return (
      <View style={[styles.container, !isLast && styles.borderBottom]}>
        <View style={styles.leftSection}>
          <View style={styles.iconWrapper}>{icon}</View>
          <Text style={styles.label}>{label}</Text>
        </View>
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: COLORS.slate[200], true: COLORS.blue[500] }}
          thumbColor={COLORS.white}
        />
      </View>
    );
  }

  // Segmented picker mode
  if (options && onSelectOption) {
    return (
      <View style={[styles.containerColumn, !isLast && styles.borderBottom]}>
        <View style={styles.leftSection}>
          <View style={styles.iconWrapper}>{icon}</View>
          <Text style={styles.label}>{label}</Text>
        </View>
        <View style={styles.segmentedControl}>
          {options.map(option => (
            <TouchableOpacity
              key={option}
              onPress={() => onSelectOption(option)}
              style={[
                styles.segmentButton,
                selectedOption === option && styles.segmentActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  selectedOption === option && styles.segmentTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // Default press mode
  return (
    <TouchableOpacity
      style={[styles.container, !isLast && styles.borderBottom]}
      onPress={onPress}
      activeOpacity={0.6}
      disabled={!onPress}
    >
      <View style={styles.leftSection}>
        <View style={styles.iconWrapper}>{icon}</View>
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.rightSection}>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {onPress ? <ChevronRight size={18} color={COLORS.slate[400]} /> : null}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  containerColumn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginBottom: 0,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.slate[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.slate[800],
    flex: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontSize: 14,
    color: COLORS.slate[500],
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.slate[100],
    borderRadius: 8,
    padding: 3,
    marginTop: 10,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate[500],
  },
  segmentTextActive: {
    color: COLORS.blue[600],
  },
});

export default SettingItem;
