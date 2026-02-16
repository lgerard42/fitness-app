import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Image } from 'react-native';
import { COLORS } from '@/constants/colors';
import { buildGripTypesById, buildGripWidthsById } from '@/constants/data';
import { useGripTypes, useGripWidths } from '@/database/useExerciseConfig';
import { GripImages } from '@/constants/gripImages';

const PLACEHOLDER_GRIP_IMAGE = require('../../../assets/Equipment/UnselectedOrOtherGrip.png');

interface GripTypeWidthPickerProps {
  gripType: string;
  gripWidth: string;
  onGripTypeChange: (type: string) => void;
  onGripWidthChange: (width: string) => void;
  gripTypeOptions: string[];
  gripWidthOptions: string[];
  allowClear?: boolean;
}

// Width option id -> spacing multiplier for circle button
// Supports both legacy IDs and new database IDs
const WIDTH_SPACING: Record<string, number> = {
  // Legacy IDs
  extra_narrow: 0.1,
  narrow: 0.2,
  shoulder_width: 0.35,
  wide: 0.5,
  extra_wide: 0.65,
  // New database IDs
  WIDTH_EXTRA_NARROW: 0.1,
  WIDTH_NARROW: 0.2,
  WIDTH_SHOULDER: 0.35,
  WIDTH_WIDE: 0.5,
  WIDTH_EXTRA_WIDE: 0.65,
};

// Width option id -> gap between the two vertical lines (px)
// Supports both legacy IDs and new database IDs
const WIDTH_ICON_GAP: Record<string, number> = {
  // Legacy IDs
  extra_narrow: 2,
  narrow: 5,
  shoulder_width: 10,
  wide: 14,
  extra_wide: 18,
  // New database IDs
  WIDTH_EXTRA_NARROW: 2,
  WIDTH_NARROW: 5,
  WIDTH_SHOULDER: 10,
  WIDTH_WIDE: 14,
  WIDTH_EXTRA_WIDE: 18,
};

const LINE_WIDTH = 2;
const LINE_HEIGHT = 14;
const WIDTH_ICON_CONTAINER_SIZE = 24;

const WidthIcon: React.FC<{ widthOption: string }> = ({ widthOption }) => {
  const gap = WIDTH_ICON_GAP[widthOption] ?? WIDTH_ICON_GAP.shoulder_width;
  const totalInnerWidth = LINE_WIDTH * 2 + gap;
  return (
    <View style={[styles.widthIconContainer, { width: WIDTH_ICON_CONTAINER_SIZE, height: WIDTH_ICON_CONTAINER_SIZE }]}>
      <View style={[styles.widthIconInner, { width: totalInnerWidth, height: LINE_HEIGHT }]}>
        <View style={[styles.widthIconLine, { width: LINE_WIDTH, height: LINE_HEIGHT }]} />
        <View style={[styles.widthIconLine, { width: LINE_WIDTH, height: LINE_HEIGHT, marginLeft: gap }]} />
      </View>
    </View>
  );
};

const GripTypeWidthPicker: React.FC<GripTypeWidthPickerProps> = ({
  gripType,
  gripWidth,
  onGripTypeChange,
  onGripWidthChange,
  gripTypeOptions,
  gripWidthOptions,
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const gripTypes = useGripTypes();
  const GRIP_TYPES_BY_ID = useMemo(() => buildGripTypesById(gripTypes), [gripTypes]);
  const gripWidths = useGripWidths();
  const GRIP_WIDTHS_BY_ID = useMemo(() => buildGripWidthsById(gripWidths), [gripWidths]);

  const handleSelectType = (type: string) => {
    if (type === gripType) {
      onGripTypeChange('');
      setIsOpen(false);
    } else {
      onGripTypeChange(type);
    }
  };

  const handleSelectWidth = (width: string) => {
    if (width === gripWidth) {
      onGripWidthChange('');
    } else {
      onGripWidthChange(width);
    }
  };

  const renderCircleButton = (isPreview: boolean = false) => {
    const effectiveWidth = gripWidth || 'WIDTH_SHOULDER';
    const spacingMultiplier = WIDTH_SPACING[effectiveWidth] ?? WIDTH_SPACING.WIDTH_SHOULDER ?? WIDTH_SPACING.shoulder_width;
    const spacing = spacingMultiplier * 40;
    const buttonWidth = 72 + spacing;
    const buttonHeight = 72;
    const imageSize = 44;

    const gripImage = gripType ? GripImages[gripType] : null;
    const isPlaceholder = !gripType || !gripImage;
    const displayImage = gripImage || PLACEHOLDER_GRIP_IMAGE;

    const hasGripType = !!gripType;
    const hasGripWidth = !!gripWidth;
    const bothSelected = hasGripType && hasGripWidth;
    const oneSelected = (hasGripType || hasGripWidth) && !bothSelected;

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
              <Image
                source={displayImage}
                style={[styles.splitImageLeft, { width: imageSize, height: imageSize }, styles.placeholderImage]}
                resizeMode="contain"
              />
            </View>
            <View style={[styles.imageHalf, { marginLeft: spacing / 2, width: imageSize / 2, height: imageSize }]}>
              <Image
                source={displayImage}
                style={[styles.splitImageRight, { width: imageSize, height: imageSize, marginLeft: -imageSize / 2 }, styles.placeholderImage]}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={buttonStyle}>
        <View style={[styles.splitImageContainer, { height: imageSize }]}>
          <View style={[styles.imageHalf, { marginRight: spacing / 2, width: imageSize / 2, height: imageSize }]}>
            <Image
              source={gripImage}
              style={[styles.splitImageLeft, { width: imageSize, height: imageSize }]}
              resizeMode="contain"
            />
          </View>
          <View style={[styles.imageHalf, { marginLeft: spacing / 2, width: imageSize / 2, height: imageSize }]}>
            <Image
              source={gripImage}
              style={[styles.splitImageRight, { width: imageSize, height: imageSize, marginLeft: -imageSize / 2 }]}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        style={styles.triggerCircleWrapper}
        activeOpacity={0.7}
      >
        {renderCircleButton(false)}
        <View style={styles.labelContainer}>
          {gripType ? (
            <Text style={[styles.circleLabel, styles.textSelected]} numberOfLines={1}>
              {GRIP_TYPES_BY_ID[gripType]?.label ?? gripType} Grip
            </Text>
          ) : null}
          {gripWidth ? (
            <Text style={[styles.circleLabel, styles.textSelected]} numberOfLines={1}>
              {GRIP_WIDTHS_BY_ID[gripWidth]?.label ?? gripWidth}
            </Text>
          ) : null}
          {!gripType && !gripWidth && (
            <Text style={[styles.circleLabel, styles.textPlaceholder]} numberOfLines={1}>
              Grip
            </Text>
          )}
        </View>
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
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalContentInner}>
              <View style={styles.previewContainer}>
                {renderCircleButton(true)}
              </View>
              <View style={styles.sideBySideContainer}>
                <View style={styles.columnContainer}>
                  <View style={[styles.columnHeader, styles.columnHeaderFirst]}>
                    <Text style={styles.columnHeaderText}>Type</Text>
                  </View>
                  <FlatList
                    data={gripTypeOptions}
                    keyExtractor={(item) => item}
                    style={styles.scrollableList}
                    renderItem={({ item, index }) => {
                      const isSelected = gripType === item;
                      const icon = GripImages[item];
                      const isLastItem = index === gripTypeOptions.length - 1;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.option,
                            isSelected && styles.optionSelected,
                            isLastItem && styles.optionLast
                          ]}
                          onPress={() => handleSelectType(item)}
                        >
                          {icon ? (
                            <Image source={icon} style={styles.optionIcon} resizeMode="contain" />
                          ) : (
                            <View style={styles.iconPlaceholder} />
                          )}
                          <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                            {GRIP_TYPES_BY_ID[item]?.label ?? item}
                          </Text>
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
                    data={gripWidthOptions}
                    keyExtractor={(item) => item}
                    style={styles.scrollableList}
                    renderItem={({ item, index }) => {
                      const isSelected = gripWidth === item;
                      const isLastItem = index === gripWidthOptions.length - 1;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.option,
                            isSelected && styles.optionSelected,
                            isLastItem && styles.optionLast
                          ]}
                          onPress={() => handleSelectWidth(item)}
                        >
                          <WidthIcon widthOption={item} />
                          <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                            {GRIP_WIDTHS_BY_ID[item]?.label ?? item}
                          </Text>
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
  widthIconContainer: { alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  widthIconInner: { flexDirection: 'row', alignItems: 'center' },
  widthIconLine: { backgroundColor: COLORS.slate[600], borderRadius: 1 },
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

export default GripTypeWidthPicker;
