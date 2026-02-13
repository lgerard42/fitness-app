import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Image } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { StanceTypeImages } from '@/constants/stanceImages';

const PLACEHOLDER_STANCE_IMAGE = require('../../../assets/Equipment/UnselectedOrOtherGrip.png');

interface StanceTypeWidthPickerProps {
  stanceType: string;
  stanceWidth: string;
  onStanceTypeChange: (type: string) => void;
  onStanceWidthChange: (width: string) => void;
  stanceTypeOptions: string[];
  stanceWidthOptions: string[];
  allowClear?: boolean;
}

const WIDTH_SPACING: Record<string, number> = {
  'Extra Narrow': 0.1,
  'Narrow': 0.2,
  'Shoulder Width': 0.35,
  'Wide': 0.5,
  'Extra Wide': 0.65,
};

const StanceTypeWidthPicker: React.FC<StanceTypeWidthPickerProps> = ({
  stanceType,
  stanceWidth,
  onStanceTypeChange,
  onStanceWidthChange,
  stanceTypeOptions,
  stanceWidthOptions,
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectType = (type: string) => {
    if (type === stanceType) {
      onStanceTypeChange('');
      setIsOpen(false);
    } else {
      onStanceTypeChange(type);
    }
  };

  const handleSelectWidth = (width: string) => {
    if (width === stanceWidth) {
      onStanceWidthChange('');
    } else {
      onStanceWidthChange(width);
    }
  };

  const renderCircleButton = (isPreview: boolean = false) => {
    const effectiveWidth = stanceWidth || 'Shoulder Width';
    const spacingMultiplier = WIDTH_SPACING[effectiveWidth] || WIDTH_SPACING['Shoulder Width'];
    const spacing = spacingMultiplier * 40;
    const buttonWidth = 72 + spacing;
    const buttonHeight = 72;
    const imageSize = 44;

    const stanceImage = stanceType ? StanceTypeImages[stanceType] : null;
    const isPlaceholder = !stanceType || !stanceImage;
    const displayImage = stanceImage || PLACEHOLDER_STANCE_IMAGE;

    const hasStanceType = !!stanceType;
    const hasStanceWidth = !!stanceWidth;
    const bothSelected = hasStanceType && hasStanceWidth;
    const oneSelected = (hasStanceType || hasStanceWidth) && !bothSelected;

    const buttonStyle = [
      styles.circleButton,
      bothSelected && styles.circleButtonSelected,
      oneSelected && styles.circleButtonPartiallySelected,
      { width: buttonWidth, height: buttonHeight }
    ];

    if (isPlaceholder) {
      return (
        <View style={buttonStyle}>
          <View style={[styles.splitImageContainer, { height: imageSize }]}>
            <View style={[styles.imageHalf, { marginRight: spacing / 2, width: imageSize / 2, height: imageSize }]}>
              <Image source={displayImage} style={[styles.splitImageLeft, { width: imageSize, height: imageSize }, styles.placeholderImage]} resizeMode="contain" />
            </View>
            <View style={[styles.imageHalf, { marginLeft: spacing / 2, width: imageSize / 2, height: imageSize }]}>
              <Image source={displayImage} style={[styles.splitImageRight, { width: imageSize, height: imageSize, marginLeft: -imageSize / 2 }, styles.placeholderImage]} resizeMode="contain" />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={buttonStyle}>
        <View style={[styles.splitImageContainer, { height: imageSize }]}>
          <View style={[styles.imageHalf, { marginRight: spacing / 2, width: imageSize / 2, height: imageSize }]}>
            <Image source={stanceImage} style={[styles.splitImageLeft, { width: imageSize, height: imageSize }]} resizeMode="contain" />
          </View>
          <View style={[styles.imageHalf, { marginLeft: spacing / 2, width: imageSize / 2, height: imageSize }]}>
            <Image source={stanceImage} style={[styles.splitImageRight, { width: imageSize, height: imageSize, marginLeft: -imageSize / 2 }]} resizeMode="contain" />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setIsOpen(true)} style={styles.triggerCircleWrapper} activeOpacity={0.7}>
        {renderCircleButton(false)}
        <View style={styles.labelContainer}>
          {stanceType ? <Text style={[styles.circleLabel, styles.textSelected]} numberOfLines={1}>Option {stanceType}</Text> : null}
          {stanceWidth ? <Text style={[styles.circleLabel, styles.textSelected]} numberOfLines={1}>{stanceWidth}</Text> : null}
          {!stanceType && !stanceWidth && <Text style={[styles.circleLabel, styles.textPlaceholder]} numberOfLines={1}>Stance</Text>}
        </View>
      </TouchableOpacity>

      <Modal visible={isOpen} transparent={true} animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsOpen(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalContentInner}>
              <View style={styles.previewContainer}>{renderCircleButton(true)}</View>
              <View style={styles.sideBySideContainer}>
                <View style={styles.columnContainer}>
                  <View style={[styles.columnHeader, styles.columnHeaderFirst]}>
                    <Text style={styles.columnHeaderText}>Type</Text>
                  </View>
                  <FlatList
                    data={stanceTypeOptions}
                    keyExtractor={(item) => item}
                    style={styles.scrollableList}
                    renderItem={({ item, index }) => {
                      const isSelected = stanceType === item;
                      const icon = StanceTypeImages[item];
                      const isLastItem = index === stanceTypeOptions.length - 1;
                      return (
                        <TouchableOpacity
                          style={[styles.option, isSelected && styles.optionSelected, isLastItem && styles.optionLast]}
                          onPress={() => handleSelectType(item)}
                        >
                          {icon ? <Image source={icon} style={styles.optionIcon} resizeMode="contain" /> : <View style={styles.iconPlaceholder} />}
                          <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item}</Text>
                          {isSelected && <Check size={16} color={COLORS.blue[600]} />}
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
                <View style={[styles.columnContainer, styles.columnContainerLast]}>
                  <View style={[styles.columnHeader, styles.columnHeaderLast]}>
                    <Text style={styles.columnHeaderText}>Width</Text>
                  </View>
                  <FlatList
                    data={stanceWidthOptions}
                    keyExtractor={(item) => item}
                    style={styles.scrollableList}
                    renderItem={({ item, index }) => {
                      const isSelected = stanceWidth === item;
                      const isLastItem = index === stanceWidthOptions.length - 1;
                      return (
                        <TouchableOpacity
                          style={[styles.option, isSelected && styles.optionSelected, isLastItem && styles.optionLast]}
                          onPress={() => handleSelectWidth(item)}
                        >
                          <View style={styles.iconPlaceholder} />
                          <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item}</Text>
                          {isSelected && <Check size={16} color={COLORS.blue[600]} />}
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              </View>
            </View>
            <View style={styles.footerRow}>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.cancelButtonInRow}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  triggerCircleWrapper: { alignItems: 'center', justifyContent: 'center' },
  circleButton: {
    borderRadius: 36,
    backgroundColor: COLORS.slate[100],
    borderWidth: 2,
    borderColor: COLORS.slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  circleButtonSelected: { backgroundColor: COLORS.blue[50], borderColor: COLORS.blue[200] },
  circleButtonPartiallySelected: { borderColor: COLORS.blue[200] },
  circleButtonPlaceholder: { width: 44, height: 44 },
  splitImageContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  imageHalf: { overflow: 'hidden' },
  splitImageLeft: { marginLeft: 0 },
  splitImageRight: {},
  placeholderImage: { opacity: 0.4, tintColor: COLORS.slate[400] },
  labelContainer: { alignItems: 'center', justifyContent: 'center' },
  circleLabel: { fontSize: 13, textAlign: 'center', maxWidth: 120 },
  textSelected: { color: COLORS.slate[900], fontWeight: '500' },
  textPlaceholder: { color: COLORS.slate[400] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', padding: 20 },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    maxHeight: 400,
    overflow: 'visible',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'column',
  },
  modalContentInner: { overflow: 'visible' },
  previewContainer: { alignItems: 'center', justifyContent: 'flex-end', marginTop: -36, zIndex: 10, height: 48 },
  sideBySideContainer: { flexDirection: 'row', maxHeight: 320 },
  columnContainer: { flex: 1, borderRightWidth: 1, borderRightColor: COLORS.slate[200] },
  columnContainerLast: { borderRightWidth: 0 },
  columnHeader: {
    paddingRight: 16,
    paddingLeft: 52,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    backgroundColor: COLORS.slate[50],
    marginTop: -36,
  },
  columnHeaderFirst: { borderTopLeftRadius: 12 },
  columnHeaderLast: { borderTopRightRadius: 12 },
  columnHeaderText: { fontSize: 12, fontWeight: '700', color: COLORS.slate[500], letterSpacing: 0.5 },
  scrollableList: { maxHeight: 280 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  optionLast: { borderBottomWidth: 1 },
  iconPlaceholder: { width: 24, height: 24, marginRight: 12 },
  optionIcon: { width: 24, height: 24, marginRight: 12 },
  optionSelected: { backgroundColor: COLORS.blue[50] },
  optionText: { fontSize: 15, color: COLORS.slate[700], fontWeight: '500', flex: 1 },
  optionTextSelected: { color: COLORS.blue[600], fontWeight: '500' },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[100],
  },
  cancelButtonInRow: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.slate[300],
    borderRadius: 6,
    marginRight: 8,
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.slate[600] },
  doneButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blue[600],
    borderRadius: 6,
  },
  doneButtonText: { fontSize: 16, fontWeight: '600', color: COLORS.white },
});

export default StanceTypeWidthPicker;
