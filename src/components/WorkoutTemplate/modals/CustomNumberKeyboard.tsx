import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { X, ChevronRight, Check, Delete } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';

interface CustomNumberKeyboardProps {
  visible: boolean;
  customKeyboardTarget: { field: 'weight' | 'reps'; exerciseId: string; setId: string } | null;
  customKeyboardValue: string;
  onInput: (key: string) => void;
  onNext: () => void;
  onClose: () => void;
  styles: any;
}

const CustomNumberKeyboard: React.FC<CustomNumberKeyboardProps> = ({
  visible,
  customKeyboardTarget,
  customKeyboardValue,
  onInput,
  onNext,
  onClose,
  styles,
}) => {
  if (!visible) return null;

  const handleInput = (key: string) => {
    onInput(key);
  };

  return (
    <View style={styles.customKeyboardContainer}>
      <View style={styles.customKeyboardHeader}>
        <View style={styles.customKeyboardValueContainer}>
          <Text style={styles.customKeyboardLabel}>
            {customKeyboardTarget?.field === 'weight' ? 'Weight' : 'Reps'}
          </Text>
          <Text style={styles.customKeyboardValue}>
            {customKeyboardValue || '0'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.customKeyboardCloseButton}
          onPress={onClose}
        >
          <X size={20} color={COLORS.slate[600]} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.customKeyboardGrid}>
        <View style={styles.customKeyboardRow}>
          {['1', '2', '3'].map(key => (
            <TouchableOpacity 
              key={key}
              style={styles.customKeyboardKey}
              onPress={() => handleInput(key)}
            >
              <Text style={styles.customKeyboardKeyText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.customKeyboardRow}>
          {['4', '5', '6'].map(key => (
            <TouchableOpacity 
              key={key}
              style={styles.customKeyboardKey}
              onPress={() => handleInput(key)}
            >
              <Text style={styles.customKeyboardKeyText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.customKeyboardRow}>
          {['7', '8', '9'].map(key => (
            <TouchableOpacity 
              key={key}
              style={styles.customKeyboardKey}
              onPress={() => handleInput(key)}
            >
              <Text style={styles.customKeyboardKeyText}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.customKeyboardRow}>
          <TouchableOpacity 
            style={styles.customKeyboardKey}
            onPress={() => handleInput('.')}
          >
            <Text style={styles.customKeyboardKeyText}>.</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.customKeyboardKey}
            onPress={() => handleInput('0')}
          >
            <Text style={styles.customKeyboardKeyText}>0</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.customKeyboardKey}
            onPress={() => handleInput('backspace')}
          >
            <Delete size={24} color={COLORS.slate[700]} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.customKeyboardActions}>
        <TouchableOpacity 
          style={styles.customKeyboardNextButton}
          onPress={onNext}
        >
          <Text style={styles.customKeyboardNextButtonText}>Next</Text>
          <ChevronRight size={18} color={COLORS.white} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.customKeyboardSubmitButton}
          onPress={onClose}
        >
          <Text style={styles.customKeyboardSubmitButtonText}>Done</Text>
          <Check size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CustomNumberKeyboard;
