import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';
import { PADDING, BORDER_RADIUS } from '@/constants/layout';

interface CancelWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const CancelWorkoutModal: React.FC<CancelWorkoutModalProps> = ({ visible, onClose, onConfirm }) => {
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
            <TouchableOpacity onPress={onConfirm} style={styles.modalFinish}>
              <Text style={styles.modalFinishText}>Yes, Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: PADDING.xxl,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: PADDING.xxl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    marginBottom: PADDING.md,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.slate[600],
    marginBottom: PADDING.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: PADDING.base,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: PADDING.base,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.transparent,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
  modalFinish: {
    flex: 1,
    paddingVertical: PADDING.base,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.red[600],
  },
  modalFinishText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default CancelWorkoutModal;
