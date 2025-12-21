import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { COLORS } from '../constants/colors';

const WorkoutSetRow = ({ set, index, category, onUpdate, onToggle }) => {
  const isLift = category === "Lifts";
  const isCardio = category === "Cardio";

  return (
    <View style={[styles.container, set.completed && styles.completedContainer]}>
      <View style={styles.indexContainer}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{index + 1}</Text>
        </View>
      </View>

      <View style={styles.inputsContainer}>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={isLift ? "kg" : "min:sec"}
            placeholderTextColor={COLORS.slate[400]}
            keyboardType={isLift ? "decimal-pad" : "default"} 
            value={isLift ? (set.weight || "") : (set.duration || "")}
            onChangeText={(text) => onUpdate({ ...set, [isLift ? 'weight' : 'duration']: text })}
          />
          <Text style={styles.unitText}>
            {isLift ? "kg" : "time"}
          </Text>
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={isLift ? "reps" : isCardio ? "km" : "reps"}
            placeholderTextColor={COLORS.slate[400]}
            keyboardType="decimal-pad"
            value={isLift ? (set.reps || "") : isCardio ? (set.distance || "") : (set.reps || "")}
            onChangeText={(text) => onUpdate({ ...set, [isLift || !isCardio ? 'reps' : 'distance']: text })}
          />
          <Text style={styles.unitText}>
            {isLift ? "reps" : isCardio ? "km" : "reps"}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        onPress={onToggle}
        style={[styles.checkButton, set.completed ? styles.checkButtonCompleted : styles.checkButtonIncomplete]}
      >
        <Check size={16} color={set.completed ? COLORS.white : COLORS.slate[400]} strokeWidth={3} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  completedContainer: {
    backgroundColor: COLORS.green[50],
  },
  indexContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[500],
  },
  inputsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 12,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
  },
  input: {
    width: '100%',
    backgroundColor: COLORS.slate[50],
    borderRadius: 8,
    paddingVertical: 6,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  unitText: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -6, // Half of font size roughly
    fontSize: 10,
    color: COLORS.slate[400],
  },
  checkButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonCompleted: {
    backgroundColor: COLORS.green[500],
  },
  checkButtonIncomplete: {
    backgroundColor: COLORS.slate[200],
  },
});

export default WorkoutSetRow;
