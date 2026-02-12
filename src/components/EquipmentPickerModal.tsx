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
  ImageSourcePropType,
} from 'react-native';
import { Check, Search, Hash } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { WEIGHT_EQUIP_CATEGORIES } from '@/constants/data';
import { EquipmentImages } from '@/constants/equipmentImages';

export type EquipmentSection = { title: string; data: string[] };

/**
 * Equipment name -> image (left icon). "Reps Only" shows # icon; "Other" has no icon.
 * Images are imported from equipmentImages.ts to help Metro bundler resolve files with spaces.
 */
const EQUIPMENT_ICON_SOURCES: Record<string, ImageSourcePropType | 'repsOnly' | 'other' | undefined> = {
  ...EquipmentImages,
  'Reps Only': 'repsOnly',
  'Other': 'other',
};

interface EquipmentPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  selectedValue: string;
  placeholder?: string;
}

const ALL_SECTIONS: EquipmentSection[] = Object.entries(WEIGHT_EQUIP_CATEGORIES).map(
  ([category, tags]) => ({ title: category, data: tags })
);

const EquipmentPickerModal: React.FC<EquipmentPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedValue,
  placeholder = 'Select Equipment...',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ALL_SECTIONS;
    return ALL_SECTIONS.map((section) => {
      const categoryMatches = section.title.toLowerCase().includes(q);
      const matchingData = section.data.filter((item) =>
        item.toLowerCase().includes(q)
      );
      if (categoryMatches) return { title: section.title, data: section.data };
      if (matchingData.length > 0) return { title: section.title, data: matchingData };
      return null;
    }).filter((s): s is EquipmentSection => s !== null);
  }, [searchQuery]);

  const handleSelect = (item: string) => {
    onSelect(item);
    setSearchQuery('');
    onClose();
  };

  const renderEquipmentIcon = (item: string) => {
    const src = EQUIPMENT_ICON_SOURCES[item];
    if (src === 'other' || src === undefined) return <View style={styles.iconPlaceholder} />;
    if (src === 'repsOnly') {
      return (
        <View style={styles.iconPlaceholder}>
          <Hash size={20} color={COLORS.slate[600]} />
        </View>
      );
    }
    if (failedImages.has(item)) {
      return <View style={styles.iconPlaceholder} />;
    }
    // Check if src is a valid ImageSourcePropType (number from require)
    if (typeof src !== 'number' && typeof src !== 'object') {
      return <View style={styles.iconPlaceholder} />;
    }
    return (
      <Image
        source={src}
        style={styles.equipmentIcon}
        resizeMode="contain"
        onError={(error) => {
          console.warn(`Failed to load image for "${item}":`, error);
          setFailedImages((prev) => new Set(prev).add(item));
        }}
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
              keyExtractor={(item) => item}
              stickySectionHeadersEnabled
              renderSectionHeader={({ section: { title } }) => (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, selectedValue === item && styles.optionSelected]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  {renderEquipmentIcon(item)}
                  <Text
                    style={[
                      styles.optionText,
                      selectedValue === item && styles.optionTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {item}
                  </Text>
                  {selectedValue === item && (
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
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
    maxHeight: 320,
  },
  listContent: {
    paddingBottom: 8,
  },
  sectionHeader: {
    backgroundColor: COLORS.slate[50],
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    paddingVertical: 12,
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
    color: COLORS.slate[800],
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
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[100],
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.slate[600],
  },
});

export default EquipmentPickerModal;
