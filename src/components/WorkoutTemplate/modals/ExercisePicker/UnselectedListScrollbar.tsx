import React, { useRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, runOnJS } from 'react-native-reanimated';
import { COLORS } from '@/constants/colors';
import { PADDING } from '@/constants/layout';

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

interface UnselectedListScrollbarProps {
  availableLetters: string[];
  highlightedLetter: string | null;
  setHighlightedLetter: (letter: string | null) => void;
  onScrollToLetter: (letter: string) => void;
  blockDismissGestureRef?: any;
}

const UnselectedListScrollbar: React.FC<UnselectedListScrollbarProps> = ({
  availableLetters,
  highlightedLetter,
  setHighlightedLetter,
  onScrollToLetter,
  blockDismissGestureRef = null,
}) => {
  const containerHeight = useSharedValue(0);
  const lastActivatedLetter = useSharedValue<string | null>(null);

  const clearHighlight = () => {
    setTimeout(() => setHighlightedLetter(null), 300);
  };

  const handleLetterChange = (letter: string) => {
    if (letter && availableLetters.includes(letter)) {
      onScrollToLetter(letter);
    }
  };

  const scrollbarGesture = useMemo(() => {
    let gesture = Gesture.Pan()
      .onTouchesDown((event, stateManager) => {
        'worklet';
        stateManager.activate();

        const height = containerHeight.value;
        if (height <= 0) return;

        const touch = event.allTouches[0];
        if (!touch) return;

        const clampedY = Math.max(0, Math.min(touch.y, height));
        const index = Math.floor((clampedY / height) * LETTERS.length);
        const safeIndex = Math.max(0, Math.min(index, LETTERS.length - 1));
        const letter = LETTERS[safeIndex];

        lastActivatedLetter.value = letter;
        runOnJS(handleLetterChange)(letter);
      })
      .onTouchesMove((event) => {
        'worklet';
        const height = containerHeight.value;
        if (height <= 0) return;

        const touch = event.allTouches[0];
        if (!touch) return;

        const clampedY = Math.max(0, Math.min(touch.y, height));
        const index = Math.floor((clampedY / height) * LETTERS.length);
        const safeIndex = Math.max(0, Math.min(index, LETTERS.length - 1));
        const letter = LETTERS[safeIndex];

        if (letter !== lastActivatedLetter.value) {
          lastActivatedLetter.value = letter;
          runOnJS(handleLetterChange)(letter);
        }
      })
      .onTouchesUp(() => {
        'worklet';
        lastActivatedLetter.value = null;
        runOnJS(clearHighlight)();
      })
      .onTouchesCancelled(() => {
        'worklet';
        lastActivatedLetter.value = null;
        runOnJS(clearHighlight)();
      })
      .shouldCancelWhenOutside(false)
      .hitSlop({ left: 10, right: 10 });

    if (blockDismissGestureRef) {
      gesture = gesture.blocksExternalGesture(blockDismissGestureRef);
    }

    return gesture;
  }, [availableLetters, blockDismissGestureRef]);

  return (
    <GestureDetector gesture={scrollbarGesture}>
      <Animated.View
        style={styles.container}
        collapsable={false}
        onLayout={(event) => {
          containerHeight.value = event.nativeEvent.layout.height;
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
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 24,
    backgroundColor: COLORS.slate[50],
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: PADDING.xs / 2,
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
