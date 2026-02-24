import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface ActivationBarProps {
  muscleId: string;
  label: string;
  score: number;
  maxScore?: number;
  baseScore?: number;
}

/**
 * Horizontal bar showing muscle activation level.
 * Green fill grows with score; amber highlight when above base.
 */
export function ActivationBar({
  muscleId,
  label,
  score,
  maxScore = 5,
  baseScore,
}: ActivationBarProps) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const delta = baseScore !== undefined ? score - baseScore : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label || muscleId}</Text>
        <Text style={styles.score}>
          {score.toFixed(2)}
          {delta !== 0 && (
            <Text
              style={{
                color: delta > 0 ? "#10B981" : "#EF4444",
                fontSize: 11,
              }}
            >
              {" "}
              {delta > 0 ? "+" : ""}
              {delta.toFixed(2)}
            </Text>
          )}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${pct}%` as any,
              backgroundColor: delta > 0 ? "#F59E0B" : "#10B981",
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  score: {
    fontSize: 12,
    color: "#333",
    fontWeight: "600",
  },
  track: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
