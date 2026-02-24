import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import type { ModifierTableConstraint, ModifierRow } from "@shared/types";

interface ModifierSelectorProps {
  tableKey: string;
  label: string;
  rows: ModifierRow[];
  selectedRowId: string | null;
  constraint: ModifierTableConstraint;
  onSelect: (rowId: string | null) => void;
}

/**
 * Constraint-aware modifier selector.
 * Shows/hides/disables options based on the constraint evaluator output.
 */
export function ModifierSelector({
  tableKey,
  label,
  rows,
  selectedRowId,
  constraint,
  onSelect,
}: ModifierSelectorProps) {
  if (constraint.tableState === "hidden") return null;

  const isDisabled = constraint.tableState === "disabled";
  const isSuppressed = constraint.tableState === "suppressed";
  const allowedValues = constraint.allowedValues;

  const filteredRows = allowedValues
    ? rows.filter((r) => allowedValues.includes(r.id))
    : rows;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, isDisabled && styles.labelDisabled]}>
          {label}
        </Text>
        {constraint.defaultValue && (
          <Text style={styles.defaultBadge}>
            default: {constraint.defaultValue}
          </Text>
        )}
        {isSuppressed && (
          <Text style={styles.suppressedBadge}>suppressed</Text>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {filteredRows.map((row) => {
          const isSelected = selectedRowId === row.id;
          return (
            <TouchableOpacity
              key={row.id}
              onPress={() => onSelect(isSelected ? null : row.id)}
              disabled={isDisabled}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                isDisabled && styles.chipDisabled,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {row.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelDisabled: {
    color: "#9CA3AF",
  },
  defaultBadge: {
    fontSize: 10,
    color: "#F59E0B",
    fontWeight: "500",
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  suppressedBadge: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipSelected: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
  },
  chipTextSelected: {
    color: "white",
  },
});
