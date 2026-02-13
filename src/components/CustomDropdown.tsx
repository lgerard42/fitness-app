import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, LayoutChangeEvent, Image, ImageSourcePropType } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { GripImages } from '@/constants/gripImages';

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  allowClear?: boolean;
  /** When set, the closed trigger shows this icon for the selected value (e.g. grip type) */
  optionIcons?: Record<string, ImageSourcePropType>;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, onChange, options, placeholder, allowClear = false, optionIcons }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [layout, setLayout] = useState<{ width: number; height: number; x: number; y: number } | null>(null);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const renderGripIcon = (item: string) => {
    const src = GripImages[item];
    if (!src) return <View style={styles.iconPlaceholder} />;
    return <Image source={src} style={styles.gripIcon} resizeMode="contain" />;
  };

  return (
    <View 
      style={[styles.container, isOpen && styles.containerOpen]}
      onLayout={(event: LayoutChangeEvent) => setLayout(event.nativeEvent.layout)}
    >
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={styles.trigger}
      >
        {value && optionIcons?.[value] ? (
          <Image source={optionIcons[value]} style={styles.triggerIcon} resizeMode="contain" />
        ) : optionIcons ? (
          <View style={styles.triggerIconPlaceholder} />
        ) : null}
        <Text style={[styles.text, value ? styles.textSelected : styles.textPlaceholder]}>
          {value || placeholder}
        </Text>
        <ChevronDown 
          size={16} 
          color={isOpen ? COLORS.blue[500] : COLORS.slate[400]} 
          style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.dropdownMenu}>
             <FlatList
               data={options}
               keyExtractor={(item) => item}
               ListFooterComponent={
                 allowClear ? (
                   <TouchableOpacity
                     style={[styles.option, styles.clearOption, !value && styles.optionSelected]}
                     onPress={() => handleSelect('')}
                   >
                     <Text style={[styles.optionText, !value && styles.optionTextSelected]}>
                       Clear
                     </Text>
                     {!value && <Check size={16} color={COLORS.blue[600]} />}
                   </TouchableOpacity>
                 ) : null
               }
               renderItem={({ item }) => (
                 <TouchableOpacity
                   style={[styles.option, value === item && styles.optionSelected]}
                   onPress={() => handleSelect(item)}
                 >
                   {renderGripIcon(item)}
                   <Text style={[styles.optionText, value === item && styles.optionTextSelected]}>
                     {item}
                   </Text>
                   {value === item && <Check size={16} color={COLORS.blue[600]} />}
                 </TouchableOpacity>
               )}
             />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 10,
  },
  containerOpen: {
    zIndex: 20,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.slate[50],
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  triggerIcon: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  triggerIconPlaceholder: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  text: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  textSelected: {
    color: COLORS.slate[900],
    fontWeight: '500',
  },
  textPlaceholder: {
    color: COLORS.slate[400],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    padding: 20,
  },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    maxHeight: 300,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearOption: {
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[100],
    marginTop: 4,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  gripIcon: {
    width: 24,
    height: 24,
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
});

export default CustomDropdown;
