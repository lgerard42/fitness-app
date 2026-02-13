import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { GripImages } from '@/constants/gripImages';

interface GripTypeWidthPickerProps {
  gripType: string;
  gripWidth: string;
  onGripTypeChange: (type: string) => void;
  onGripWidthChange: (width: string) => void;
  gripTypeOptions: string[];
  gripWidthOptions: string[];
  allowClear?: boolean;
}

// Width spacing multipliers (relative to base circle button width)
const WIDTH_SPACING: Record<string, number> = {
  'Extra Narrow': 0.1,
  'Narrow': 0.2,
  'Shoulder Width': 0.35,
  'Wide': 0.5,
  'Extra Wide': 0.65,
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

  const handleSelectType = (type: string) => {
    if (type === gripType) {
      // If clicking the same type, unselect it
      onGripTypeChange('');
      setIsOpen(false);
    } else {
      onGripTypeChange(type);
      // Don't close modal - user can still select width
    }
  };

  const handleSelectWidth = (width: string) => {
    if (width === gripWidth) {
      // If clicking the same width, unselect it
      onGripWidthChange('');
    } else {
      onGripWidthChange(width);
    }
    setIsOpen(false);
  };

  const renderCircleButton = (isPreview: boolean = false) => {
    const effectiveWidth = gripWidth || 'Shoulder Width';
    const spacingMultiplier = WIDTH_SPACING[effectiveWidth] || WIDTH_SPACING['Shoulder Width'];
    const spacing = spacingMultiplier * 40; // Max spacing ~26px for Extra Wide
    const buttonWidth = 72 + spacing; // Base 72px + spacing adjustment
    const buttonHeight = 72; // Fixed height
    const imageSize = 44; // Fixed image size

    if (!gripType) {
      return (
        <View style={[styles.circleButton, { width: buttonWidth, height: buttonHeight }]}>
          <View style={[styles.circleButtonPlaceholder, { width: imageSize, height: imageSize }]} />
        </View>
      );
    }

    const gripImage = GripImages[gripType];
    if (!gripImage) {
      return (
        <View style={[styles.circleButton, { width: buttonWidth, height: buttonHeight }]}>
          <View style={[styles.circleButtonPlaceholder, { width: imageSize, height: imageSize }]} />
        </View>
      );
    }

    return (
      <View style={[styles.circleButton, styles.circleButtonSelected, { width: buttonWidth, height: buttonHeight }]}>
        <View style={[styles.splitImageContainer, { height: imageSize }]}>
          {/* Left half - shows left side of image */}
          <View style={[styles.imageHalf, { marginRight: spacing / 2, width: imageSize / 2, height: imageSize }]}>
            <Image 
              source={gripImage} 
              style={[styles.splitImageLeft, { width: imageSize, height: imageSize }]} 
              resizeMode="contain" 
            />
          </View>
          {/* Right half - shows right side of image */}
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
        <Text style={[styles.circleLabel, (gripType || gripWidth) ? styles.textSelected : styles.textPlaceholder]} numberOfLines={1}>
          Grip
        </Text>
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
              {/* Preview Circle Button */}
              <View style={styles.previewContainer}>
                {renderCircleButton(true)}
              </View>
              {/* Side-by-side containers */}
              <View style={styles.sideBySideContainer}>
                {/* Type Column */}
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
                            {item}
                          </Text>
                          {isSelected && <Check size={16} color={COLORS.blue[600]} />}
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>

                {/* Width Column */}
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
                          <View style={styles.iconPlaceholder} />
                          <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                            {item}
                          </Text>
                          {isSelected && <Check size={16} color={COLORS.blue[600]} />}
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>
              </View>
            </View>
            {/* Footer */}
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
  container: {
    width: '100%',
  },
  triggerCircleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  circleButtonSelected: {
    backgroundColor: COLORS.blue[50],
    borderColor: COLORS.blue[200],
  },
  circleButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  splitImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageHalf: {
    overflow: 'hidden',
  },
  splitImageLeft: {
    marginLeft: 0,
  },
  splitImageRight: {
    // marginLeft will be set dynamically based on size
  },
  circleLabel: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 120,
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
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    maxHeight: 400,
    overflow: 'visible',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    flexDirection: 'column',
  },
  modalContentInner: {
    overflow: 'visible',
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: -36, // Extend above the popup (half of 72px circle button height)
    zIndex: 10,
    height: 48,
  },
  sideBySideContainer: {
    flexDirection: 'row',
    maxHeight: 320,
  },
  columnContainer: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: COLORS.slate[200],
  },
  columnContainerLast: {
    borderRightWidth: 0,
  },
  columnHeader: {
    paddingRight: 16,
    paddingLeft: 52,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
    backgroundColor: COLORS.slate[50],
    marginTop: -36,
  },
  columnHeaderFirst: {
    borderTopLeftRadius: 12,
  },
  columnHeaderLast: {
    borderTopRightRadius: 12,
  },
  columnHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.slate[500],
    letterSpacing: 0.5,
  },
  scrollableList: {
    maxHeight: 280,
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
  optionLast: {
    borderBottomWidth: 1,
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  optionIcon: {
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
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.slate[600],
  },
  doneButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blue[600],
    borderRadius: 6,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default GripTypeWidthPicker;
