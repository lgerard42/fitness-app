import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { X, ChevronRight, Delete, Plus, Minus } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

interface CustomNumberKeyboardProps {
  visible: boolean;
  customKeyboardTarget: { field: 'weight' | 'weight2' | 'reps' | 'duration' | 'distance'; exerciseId: string; setId: string } | null;
  customKeyboardValue: string;
  onInput: (key: string) => void;
  onSetValue?: (value: string, shouldSelectAll?: boolean) => void;
  onNext: () => void;
  onClose: () => void;
}

const CustomNumberKeyboard: React.FC<CustomNumberKeyboardProps> = ({
  visible,
  customKeyboardTarget,
  customKeyboardValue,
  onInput,
  onSetValue,
  onNext,
  onClose,
}) => {
  if (!visible) return null;

  const handleInput = (key: string) => {
    onInput(key);
  };

  const handleIncrement = () => {
    const currentValue = parseFloat(customKeyboardValue || '0');
    const newValue = (currentValue + 1).toString();
    if (onSetValue) {
      // Select entire value after +/- operation
      onSetValue(newValue, true);
    } else {
      onInput(newValue);
    }
  };

  const handleDecrement = () => {
    const currentValue = parseFloat(customKeyboardValue || '0');
    const newValue = Math.max(0, currentValue - 1).toString();
    if (onSetValue) {
      // Select entire value after +/- operation
      onSetValue(newValue, true);
    } else {
      onInput(newValue);
    }
  };

  return (
    <View style={localStyles.customKeyboardContainer}>
      <View style={localStyles.customKeyboardGrid}>
        <View style={localStyles.customKeyboardRow}>
          {['1', '2', '3'].map(key => (
            <TouchableOpacity
              key={key}
              style={localStyles.customKeyboardKey}
              onPress={() => handleInput(key)}
            >
              <Text style={localStyles.customKeyboardKeyText}>{key}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={localStyles.customKeyboardCloseButton}
            onPress={onClose}
          >
            <X size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <View style={localStyles.customKeyboardRow}>
          {['4', '5', '6'].map(key => (
            <TouchableOpacity
              key={key}
              style={localStyles.customKeyboardKey}
              onPress={() => handleInput(key)}
            >
              <Text style={localStyles.customKeyboardKeyText}>{key}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={localStyles.customKeyboardIncrementButton}
            onPress={handleIncrement}
          >
            <Plus size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <View style={localStyles.customKeyboardRow}>
          {['7', '8', '9'].map(key => (
            <TouchableOpacity
              key={key}
              style={localStyles.customKeyboardKey}
              onPress={() => handleInput(key)}
            >
              <Text style={localStyles.customKeyboardKeyText}>{key}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={localStyles.customKeyboardDecrementButton}
            onPress={handleDecrement}
          >
            <Minus size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <View style={localStyles.customKeyboardRow}>
          <TouchableOpacity
            style={localStyles.customKeyboardKey}
            onPress={() => handleInput('.')}
          >
            <Text style={localStyles.customKeyboardKeyText}>.</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={localStyles.customKeyboardKey}
            onPress={() => handleInput('0')}
          >
            <Text style={localStyles.customKeyboardKeyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={localStyles.customKeyboardKey}
            onPress={() => handleInput('backspace')}
          >
            <Delete size={24} color={COLORS.slate[400]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={localStyles.customKeyboardNextButton}
            onPress={onNext}
          >
            <Text style={localStyles.customKeyboardNextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  customKeyboardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.slate[800],
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[800],
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  customKeyboardGrid: {
    paddingTop: 8,
  },
  customKeyboardRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  customKeyboardKey: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    height: 52,
    backgroundColor: COLORS.slate[600],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customKeyboardKeyText: {
    fontSize: 24,
    fontWeight: '500',
    color: COLORS.white,
  },
  customKeyboardCloseButton: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    height: 52,
    backgroundColor: COLORS.slate[800],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customKeyboardIncrementButton: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    height: 52,
    backgroundColor: COLORS.slate[750],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customKeyboardDecrementButton: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    height: 52,
    backgroundColor: COLORS.slate[750],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customKeyboardNextButton: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    maxWidth: '100%',
    height: 52,
    backgroundColor: COLORS.blue[600],
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customKeyboardNextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default CustomNumberKeyboard;
