import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X, Plus, ChevronDown, Check } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import type { GroupType } from '@/types/workout';

interface GroupOption {
  label: string;
  value: GroupType | '';
}

interface HeaderTopRowProps {
  onClose: () => void;
  onCreate: () => void;
  groupType: GroupType | '';
  setGroupType: (type: GroupType | '') => void;
  isGroupDropdownOpen: boolean;
  setIsGroupDropdownOpen: (open: boolean) => void;
  selectedIds: string[];
  onAdd: () => void;
  groupOptions: GroupOption[];
}

const HeaderTopRow: React.FC<HeaderTopRowProps> = ({
  onClose,
  onCreate,
  groupType,
  setGroupType,
  isGroupDropdownOpen,
  setIsGroupDropdownOpen,
  selectedIds,
  onAdd,
  groupOptions
}) => {
  const isDisabled = selectedIds.length < 2;

  return (
    <View style={styles.headerTop}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color={COLORS.slate[500]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onCreate} style={styles.createButton}>
          <Plus size={14} color={COLORS.slate[700]} />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.headerRight}>
        <View style={styles.groupButtonContainer}>
          <TouchableOpacity
            disabled={isDisabled}
            onPress={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
            style={[styles.groupButton, isDisabled && styles.groupButtonDisabled]}
          >
            <Text style={[styles.groupButtonText, isDisabled && styles.groupButtonTextDisabled]}>
              {groupType || "Individual"}
            </Text>
            <ChevronDown size={14} color={isDisabled ? COLORS.slate[400] : COLORS.slate[700]} style={{ transform: [{ rotate: isGroupDropdownOpen ? '180deg' : '0deg' }] }} />
          </TouchableOpacity>

          {isGroupDropdownOpen && !isDisabled && (
            <View style={styles.groupDropdown}>
              {groupOptions.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  onPress={() => {
                    setGroupType(option.value);
                    setIsGroupDropdownOpen(false);
                  }}
                  style={[styles.groupOption, groupType === option.value && styles.groupOptionSelected]}
                >
                  <Text style={[styles.groupOptionText, groupType === option.value && styles.groupOptionTextSelected]}>
                    {option.label}
                  </Text>
                  {groupType === option.value && <Check size={12} color={COLORS.blue[600]} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <TouchableOpacity 
          onPress={onAdd}
          disabled={selectedIds.length === 0}
          style={[styles.addButton, selectedIds.length === 0 && styles.addButtonDisabled]}
        >
          <Text style={styles.addButtonText}>
            Add {selectedIds.length > 0 && `(${selectedIds.length})`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    zIndex: 101,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  closeButton: {
    padding: 4,
    marginLeft: -8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[700],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 102,
  },
  groupButtonContainer: {
    position: 'relative',
    zIndex: 10,
  },
  groupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  groupButtonDisabled: {
    opacity: 0.5,
  },
  groupButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[700],
  },
  groupButtonTextDisabled: {
    color: COLORS.slate[400],
  },
  groupDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    width: 120,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 200,
  },
  groupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  groupOptionSelected: {
    backgroundColor: COLORS.blue[50],
  },
  groupOptionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[700],
  },
  groupOptionTextSelected: {
    color: COLORS.blue[600],
  },
  addButton: {
    backgroundColor: COLORS.blue[600],
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default HeaderTopRow;
