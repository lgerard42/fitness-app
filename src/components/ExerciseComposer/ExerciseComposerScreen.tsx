import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useExerciseComposer } from "./hooks/useExerciseComposer";
import { ModifierSelector } from "./ModifierSelector";
import { ActivationBar } from "./ActivationBar";
import type { ComposerDataContext } from "./hooks/useExerciseComposer";

interface ExerciseComposerScreenProps {
  data: ComposerDataContext;
  initialMotionId?: string;
  onComplete?: (config: Record<string, string>) => void;
}

const MODIFIER_TABLE_LABELS: Record<string, string> = {
  motionPaths: "Motion Path",
  torsoAngles: "Torso Angle",
  torsoOrientations: "Torso Orientation",
  resistanceOrigin: "Resistance Origin",
  grips: "Grip Type",
  gripWidths: "Grip Width",
  elbowRelationship: "Elbow Relationship",
  executionStyles: "Execution Style",
  footPositions: "Foot Position",
  stanceWidths: "Stance Width",
  stanceTypes: "Stance Type",
  loadPlacement: "Load Placement",
  supportStructures: "Support Structure",
  loadingAids: "Loading Aid",
  rangeOfMotion: "Range of Motion",
};

/**
 * The mobile exercise composer screen.
 * Constraint-driven UI with live muscle activation visualization.
 */
export function ExerciseComposerScreen({
  data,
  initialMotionId,
  onComplete,
}: ExerciseComposerScreenProps) {
  const {
    state,
    constraints,
    activation,
    setModifier,
  } = useExerciseComposer(data);

  React.useEffect(() => {
    if (initialMotionId) {
      // Auto-select motion (handled by parent or through useExerciseComposer)
    }
  }, [initialMotionId]);

  const modifierTableKeys = Object.keys(MODIFIER_TABLE_LABELS);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Motion info */}
        {state.selectedMotion && data.motions[state.selectedMotion] && (
          <View style={styles.section}>
            <Text style={styles.motionLabel}>
              {data.motions[state.selectedMotion].label}
            </Text>
            <Text style={styles.motionDesc}>
              {data.motions[state.selectedMotion].short_description}
            </Text>
          </View>
        )}

        {/* Modifier selectors */}
        {constraints && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuration</Text>
            {modifierTableKeys.map((tableKey) => {
              const constraint = constraints.modifiers[tableKey];
              if (!constraint) return null;

              const tableData = data.modifierTables[tableKey];
              if (!tableData) return null;

              const rows = Object.values(tableData).filter(
                (r) => r.is_active !== false
              );

              return (
                <ModifierSelector
                  key={tableKey}
                  tableKey={tableKey}
                  label={MODIFIER_TABLE_LABELS[tableKey] ?? tableKey}
                  rows={rows}
                  selectedRowId={state.selectedModifiers[tableKey] ?? null}
                  constraint={constraint}
                  onSelect={(rowId) => setModifier(tableKey, rowId)}
                />
              );
            })}
          </View>
        )}

        {/* Live activation visualization */}
        {activation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Muscle Activation</Text>
            {Object.entries(activation.finalScores)
              .sort(([, a], [, b]) => b - a)
              .filter(([, score]) => score > 0)
              .map(([muscleId, score]) => (
                <ActivationBar
                  key={muscleId}
                  muscleId={muscleId}
                  label={muscleId.replace(/_/g, " ")}
                  score={score}
                  baseScore={activation.baseScores[muscleId]}
                />
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  motionLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 4,
  },
  motionDesc: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
});
