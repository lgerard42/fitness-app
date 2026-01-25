import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';

interface FinishWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  onFinish: () => void;
  styles: any;
}

const FinishWorkoutModal: React.FC<FinishWorkoutModalProps> = ({ visible, onClose, onFinish, styles }) => {
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

export default FinishWorkoutModal;
