import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { COLORS } from '../../../constants/colors';

const CancelWorkoutModal = ({ visible, onClose, onConfirm, styles }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Cancel Workout?</Text>
          <Text style={styles.modalSubtitle}>Are you sure you want to cancel? All progress will be lost.</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>No, Keep Going</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={[styles.modalFinish, { backgroundColor: COLORS.red[600] }]}>
              <Text style={styles.modalFinishText}>Yes, Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CancelWorkoutModal;
