import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  SectionList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Check, Search, Hash } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useEquipmentPickerSections, useEquipmentIconsByLabel } from '@/database/useExerciseConfig';
import { getEquipmentIconSource } from '@/utils/equipmentIcons';

export type EquipmentPickerItem = { label: string; icon?: string };
export type EquipmentSection = { title: string; data: EquipmentPickerItem[] };

/** Renders equipment icon. Uses icon from DB (base64) when available; "Reps" shows #; "Other" shows empty. */
export const EquipmentIcon: React.FC<{ equipment: string; size?: number; noMargin?: boolean; iconBase64?: string }> = ({
  equipment,
  size = 24,
  noMargin = false,
  iconBase64,
}) => {
  const iconsByLabel = useEquipmentIconsByLabel();
  const base64 = iconBase64 ?? (equipment ? iconsByLabel[equipment] : undefined);
  const boxStyle = { width: size, height: size, ...(noMargin ? {} : { marginRight: 10 }) };

  if (!equipment) return <View style={boxStyle} />;
  if (equipment === 'Other') return <View style={boxStyle} />;
  if (equipment === 'Reps' || equipment === 'Reps Only') {
    return (
      <View style={[boxStyle, { alignItems: 'center', justifyContent: 'center' }]}>
        <Hash size={size * 0.75} color={COLORS.slate[600]} />
      </View>
    );
  }
  const src = base64 ? getEquipmentIconSource(base64) : null;
  if (!src) return <View style={boxStyle} />;
  return <Image source={src} style={[boxStyle]} resizeMode="contain" />;
};

interface EquipmentPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  selectedValue: string;
  placeholder?: string;
  allowClear?: boolean;
}

const EquipmentPickerModal: React.FC<EquipmentPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedValue,
  placeholder = 'Select Equipment...',
  allowClear = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const allSections = useEquipmentPickerSections();
  const iconsByLabel = useEquipmentIconsByLabel();

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allSections;
    return allSections.map((section) => {
      const categoryMatches = section.title.toLowerCase().includes(q);
      const matchingData = section.data.filter((item) =>
        item.label.toLowerCase().includes(q)
      );
      if (categoryMatches) return { title: section.title, data: section.data };
      if (matchingData.length > 0) return { title: section.title, data: matchingData };
      return null;
    }).filter((s): s is EquipmentSection => s !== null);
  }, [searchQuery, allSections]);

  const handleSelect = (item: EquipmentPickerItem) => {
    onSelect(item.label);
    setSearchQuery('');
    onClose();
  };

  const handleClear = () => {
    onSelect('');
    setSearchQuery('');
    onClose();
  };

  const renderEquipmentIcon = (itemOrLabel: EquipmentPickerItem | string) => {
    const label = typeof itemOrLabel === 'string' ? itemOrLabel : itemOrLabel.label;
    const iconBase64 = typeof itemOrLabel === 'string' ? iconsByLabel[label] : itemOrLabel.icon ?? iconsByLabel[label];
    if (label === 'Other') return <View style={styles.iconPlaceholder} />;
    if (label === 'Reps') {
      return (
        <View style={styles.iconPlaceholder}>
          <Hash size={20} color={COLORS.slate[600]} />
        </View>
      );
    }
    if (failedImages.has(label)) return <View style={styles.iconPlaceholder} />;
    const src = iconBase64 ? getEquipmentIconSource(iconBase64) : null;
    if (!src) return <View style={styles.iconPlaceholder} />;
    return (
      <Image
        source={src}
        style={styles.equipmentIcon}
        resizeMode="contain"
        onError={() => setFailedImages((prev) => new Set(prev).add(label))}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centered}
        >
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Equipment</Text>
              {selectedValue ? (
                <View style={styles.selectedRow}>
                  {renderEquipmentIcon(selectedValue)}
                  <Text style={styles.selectedText} numberOfLines={1}>{selectedValue}</Text>
                </View>
              ) : null}
              <View style={styles.searchRow}>
                <Search size={18} color={COLORS.slate[400]} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search equipment or category..."
                  placeholderTextColor={COLORS.slate[400]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
            <SectionList
              sections={filteredSections}
              keyExtractor={(item) => item.label}
              stickySectionHeadersEnabled
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, selectedValue === item.label && styles.optionSelected]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  {renderEquipmentIcon(item)}
                  <Text
                    style={[
                      styles.optionText,
                      selectedValue === item.label && styles.optionTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                  {selectedValue === item.label && (
                    <Check size={18} color={COLORS.blue[600]} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>No equipment found</Text>
                </View>
              }
              contentContainerStyle={styles.listContent}
              style={styles.list}
            />
            <View style={styles.footerRow}>
              {allowClear && (
                <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={allowClear ? styles.cancelButtonInRow : styles.cancelButton}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  centered: {
    width: '100%',
    maxHeight: '85%',
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    marginBottom: 12,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedText: {
    fontSize: 15,
    color: COLORS.slate[800],
    fontWeight: '500',
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.slate[900],
  },
  list: {
    maxHeight: '80%',
  },
  listContent: {
    paddingBottom: 0,
  },
  sectionHeader: {
    backgroundColor: COLORS.slate[50],
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate[500],
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  iconPlaceholder: {
    width: 28,
    height: 28,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equipmentIcon: {
    width: 28,
    height: 28,
    marginRight: 12,
  },
  optionSelected: {
    backgroundColor: COLORS.blue[50],
  },
  optionText: {
    fontSize: 15,
    color: COLORS.slate[700],
    fontWeight: '500',
    flex: 1,
  },
  optionTextSelected: {
    color: COLORS.blue[600],
    fontWeight: '500',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.slate[500],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[100],
  },
  clearButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.red[600],
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonInRow: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate[300],
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.slate[600],
  },
});

export default EquipmentPickerModal;
