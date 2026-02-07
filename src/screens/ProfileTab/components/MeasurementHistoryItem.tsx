import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';
import type { BodyMeasurement } from '@/types/workout';
import SwipeToDelete from '@/components/common/SwipeToDelete';

interface MeasurementHistoryItemProps {
  measurement: BodyMeasurement;
  onDelete: (id: string) => void;
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const MeasurementHistoryItem: React.FC<MeasurementHistoryItemProps> = ({ measurement, onDelete }) => {
  const weightLabel = measurement.weight
    ? `${measurement.weight} ${measurement.unit}`
    : '—';

  const bfLabel = measurement.bodyFatPercent
    ? `${measurement.bodyFatPercent}%`
    : '—';

  const circUnit = measurement.circumferenceUnit === 'cm' ? 'cm' : 'in';

  const circumferences: string[] = [];
  if (measurement.neck) circumferences.push(`Neck: ${measurement.neck}${circUnit}`);
  if (measurement.chest) circumferences.push(`Chest: ${measurement.chest}${circUnit}`);
  if (measurement.waist) circumferences.push(`Waist: ${measurement.waist}${circUnit}`);
  if (measurement.leftArm || measurement.rightArm) {
    const l = measurement.leftArm ?? '—';
    const r = measurement.rightArm ?? '—';
    circumferences.push(`Arms: L${l} / R${r}${circUnit}`);
  }
  if (measurement.leftThigh || measurement.rightThigh) {
    const l = measurement.leftThigh ?? '—';
    const r = measurement.rightThigh ?? '—';
    circumferences.push(`Thighs: L${l} / R${r}${circUnit}`);
  }

  return (
    <SwipeToDelete onDelete={() => onDelete(measurement.id)}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.date}>{formatDate(measurement.date)}</Text>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{weightLabel}</Text>
            </View>
            <View style={[styles.badge, styles.badgeBf]}>
              <Text style={styles.badgeText}>BF {bfLabel}</Text>
            </View>
          </View>
        </View>
        {circumferences.length > 0 && (
          <Text style={styles.circumferences}>{circumferences.join('  •  ')}</Text>
        )}
      </View>
    </SwipeToDelete>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.slate[700],
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    backgroundColor: COLORS.blue[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeBf: {
    backgroundColor: COLORS.amber[50],
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slate[700],
  },
  circumferences: {
    fontSize: 12,
    color: COLORS.slate[500],
    marginTop: 6,
  },
});

export default MeasurementHistoryItem;
