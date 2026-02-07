import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useUserSettings } from '@/context/UserSettingsContext';
import type { BodyMeasurement } from '@/types/workout';

interface AddMeasurementModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (measurement: Omit<BodyMeasurement, 'id'>) => void;
}

const AddMeasurementModal: React.FC<AddMeasurementModalProps> = ({ visible, onClose, onSave }) => {
  const { settings } = useUserSettings();
  const weightUnit = settings.weightUnit;
  const circUnit = settings.distanceUnit === 'Metric' ? 'cm' : 'in';

  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [neck, setNeck] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [leftArm, setLeftArm] = useState('');
  const [rightArm, setRightArm] = useState('');
  const [leftThigh, setLeftThigh] = useState('');
  const [rightThigh, setRightThigh] = useState('');

  const resetForm = () => {
    setWeight('');
    setBodyFat('');
    setNeck('');
    setChest('');
    setWaist('');
    setLeftArm('');
    setRightArm('');
    setLeftThigh('');
    setRightThigh('');
  };

  const handleSave = () => {
    const measurement: Omit<BodyMeasurement, 'id'> = {
      date: new Date().toISOString(),
      unit: weightUnit,
      circumferenceUnit: circUnit,
      ...(weight ? { weight: parseFloat(weight) } : {}),
      ...(bodyFat ? { bodyFatPercent: parseFloat(bodyFat) } : {}),
      ...(neck ? { neck: parseFloat(neck) } : {}),
      ...(chest ? { chest: parseFloat(chest) } : {}),
      ...(waist ? { waist: parseFloat(waist) } : {}),
      ...(leftArm ? { leftArm: parseFloat(leftArm) } : {}),
      ...(rightArm ? { rightArm: parseFloat(rightArm) } : {}),
      ...(leftThigh ? { leftThigh: parseFloat(leftThigh) } : {}),
      ...(rightThigh ? { rightThigh: parseFloat(rightThigh) } : {}),
    };
    onSave(measurement);
    resetForm();
    onClose();
  };

  const hasAnyValue = weight || bodyFat || neck || chest || waist || leftArm || rightArm || leftThigh || rightThigh;

  const renderInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    unit: string,
  ) => (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          placeholder="—"
          placeholderTextColor={COLORS.slate[300]}
          keyboardType="decimal-pad"
        />
        <Text style={styles.inputUnit}>{unit}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Measurement</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={COLORS.slate[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Body Composition */}
            <Text style={styles.sectionTitle}>Body Composition</Text>
            {renderInput('Body Weight', weight, setWeight, weightUnit)}
            {renderInput('Body Fat', bodyFat, setBodyFat, '%')}

            {/* Circumferences */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Circumferences</Text>
            {renderInput('Neck', neck, setNeck, circUnit)}
            {renderInput('Chest', chest, setChest, circUnit)}
            {renderInput('Waist', waist, setWaist, circUnit)}
            {renderInput('Left Arm', leftArm, setLeftArm, circUnit)}
            {renderInput('Right Arm', rightArm, setRightArm, circUnit)}
            {renderInput('Left Thigh', leftThigh, setLeftThigh, circUnit)}
            {renderInput('Right Thigh', rightThigh, setRightThigh, circUnit)}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, !hasAnyValue && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!hasAnyValue}
            >
              <Text style={[styles.saveButtonText, !hasAnyValue && styles.saveButtonTextDisabled]}>
                Save Measurement
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate[900],
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.slate[700],
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    paddingHorizontal: 12,
    width: 130,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.slate[900],
    paddingVertical: 10,
    textAlign: 'right',
  },
  inputUnit: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.slate[400],
    marginLeft: 6,
    minWidth: 24,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate[100],
  },
  saveButton: {
    backgroundColor: COLORS.blue[600],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.slate[200],
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  saveButtonTextDisabled: {
    color: COLORS.slate[400],
  },
});

export default AddMeasurementModal;
