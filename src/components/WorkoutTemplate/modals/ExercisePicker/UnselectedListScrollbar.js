import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { COLORS } from '../../../../constants/colors';

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

const UnselectedListScrollbar = ({
  availableLetters,
  highlightedLetter,
  setHighlightedLetter,
  onScrollToLetter,
}) => {
  const letterIndexHeightRef = useRef(0);
  const lastActivatedLetter = useRef(null);

  const letterIndexGesture = Gesture.Pan()
    .onBegin((event) => {
      const height = letterIndexHeightRef.current;
      if (height <= 0) return;
      const letterHeight = height / LETTERS.length;
      const index = Math.floor(event.y / letterHeight);
      const clampedIndex = Math.max(0, Math.min(index, LETTERS.length - 1));
      const letter = LETTERS[clampedIndex];
      
      if (letter && availableLetters.includes(letter)) {
        lastActivatedLetter.current = letter;
        onScrollToLetter(letter);
      }
    })
    .onUpdate((event) => {
      const height = letterIndexHeightRef.current;
      if (height <= 0) return;
      const letterHeight = height / LETTERS.length;
      const index = Math.floor(event.y / letterHeight);
      const clampedIndex = Math.max(0, Math.min(index, LETTERS.length - 1));
      const letter = LETTERS[clampedIndex];
      
      if (letter && availableLetters.includes(letter) && letter !== lastActivatedLetter.current) {
        lastActivatedLetter.current = letter;
        onScrollToLetter(letter);
      }
    })
    .onEnd(() => {
      lastActivatedLetter.current = null;
      setTimeout(() => setHighlightedLetter(null), 300);
    })
    .minDistance(0)
    .hitSlop({ left: 10, right: 10 });

  return (
    <GestureDetector gesture={letterIndexGesture}>
      <View 
        style={styles.container}
        onLayout={(event) => {
          letterIndexHeightRef.current = event.nativeEvent.layout.height;
        }}
      >
        {LETTERS.map(letter => {
          const hasExercises = availableLetters.includes(letter);
          const isHighlighted = highlightedLetter === letter;
          
          const letterText_disabled = !hasExercises;
          const letterText_highlighted = isHighlighted;

          return (
            <View key={letter} style={styles.letterContainer}>
              <Text
                style={[
                  styles.letterText,
                  letterText_disabled && styles.letterTextDisabled,
                  letterText_highlighted && styles.letterTextHighlighted,
                ]}
              >
                {letter}
              </Text>
            </View>
          );
        })}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 24,
    backgroundColor: COLORS.slate[50],
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  letterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  letterText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.slate[500],
  },
  letterTextDisabled: {
    color: COLORS.slate[300],
  },
  letterTextHighlighted: {
    color: COLORS.blue[700],
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default UnselectedListScrollbar;
