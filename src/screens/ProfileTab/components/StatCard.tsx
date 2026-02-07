import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, title, value, subtitle, accentColor }) => {
  return (
    <View style={[styles.container, accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 3 } : null]}>
      <View style={styles.header}>
        {icon}
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.slate[100],
    minWidth: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.slate[900],
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.slate[500],
  },
});

export default StatCard;
