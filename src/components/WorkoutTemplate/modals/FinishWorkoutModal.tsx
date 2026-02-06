import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';
import { PADDING, BORDER_RADIUS } from '@/constants/layout';

interface FinishWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  onFinish: () => void;
}

const FinishWorkoutModal: React.FC<FinishWorkoutModalProps> = ({ visible, onClose, onFinish }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Finish Workout?</Text>
          <Text style={styles.modalSubtitle}>All sets will be saved to your history.</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onFinish} style={styles.modalFinish}>
              <Text style={styles.modalFinishText}>Finish</Text>
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
    backgroundColor: COLORS.blue[600],
  },
  modalFinishText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
});

export default FinishWorkoutModal;
