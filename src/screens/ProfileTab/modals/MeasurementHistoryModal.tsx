import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { X, Ruler } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import type { BodyMeasurement } from '@/types/workout';
import MeasurementHistoryItem from '../components/MeasurementHistoryItem';

interface MeasurementHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  measurements: BodyMeasurement[];
  onDeleteMeasurement: (id: string) => void;
}

const MeasurementHistoryModal: React.FC<MeasurementHistoryModalProps> = ({
  visible,
  onClose,
  measurements,
  onDeleteMeasurement,
}) => {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ruler size={20} color={COLORS.blue[600]} />
            <Text style={styles.headerTitle}>Measurement History</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={22} color={COLORS.slate[500]} />
          </TouchableOpacity>
        </View>

        {measurements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ruler size={40} color={COLORS.slate[300]} />
            <Text style={styles.emptyTitle}>No Measurements Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first measurement to start tracking progress.
            </Text>
          </View>
        ) : (
          <FlatList
            data={measurements}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <MeasurementHistoryItem
                measurement={item}
                onDelete={onDeleteMeasurement}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.slate[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate[900],
  },
  listContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.slate[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.slate[500],
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MeasurementHistoryModal;
