import React, { useRef, useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { COLORS } from '../../../../constants/colors';
import ExerciseListItem from './ExerciseListItem';

const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

const UnselectedExercisesList = ({
  exercises,
  onToggleSelect,
  highlightedLetter,
  setHighlightedLetter,
}) => {
  const sectionListRef = useRef(null);
  const [letterIndexHeight, setLetterIndexHeight] = useState(0);
  const lastActivatedLetter = useRef(null);

  // Group exercises by first letter into sections
  const sections = useMemo(() => {
    const grouped = {};
    
    exercises.forEach(ex => {
      const letter = ex.name.charAt(0).toUpperCase();
      if (!grouped[letter]) {
        grouped[letter] = [];
      }
      grouped[letter].push(ex);
    });

    // Convert to SectionList format, only include letters that have exercises
    return Object.keys(grouped)
      .sort()
      .map(letter => ({
        title: letter,
        data: grouped[letter],
      }));
  }, [exercises]);

  // Get list of letters that have exercises
  const availableLetters = useMemo(() => {
    return sections.map(s => s.title);
  }, [sections]);

  const scrollToLetter = useCallback((letter) => {
    const sectionIndex = sections.findIndex(s => s.title === letter);
    
    if (sectionIndex !== -1 && sectionListRef.current) {
      sectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        viewOffset: 0,
        viewPosition: 0,
        animated: false, // Instant scroll for scrubber
      });
    }
    
    setHighlightedLetter(letter);
  }, [sections, setHighlightedLetter]);

  // Get letter from Y position within the letter index
  const getLetterFromY = useCallback((y) => {
    console.log('[getLetterFromY] y:', y, 'letterIndexHeight:', letterIndexHeight);
    if (letterIndexHeight <= 0) {
      console.log('[getLetterFromY] letterIndexHeight is 0 or less, returning null');
      return null;
    }
    const letterHeight = letterIndexHeight / LETTERS.length;
    const index = Math.floor(y / letterHeight);
    const clampedIndex = Math.max(0, Math.min(index, LETTERS.length - 1));
    const letter = LETTERS[clampedIndex];
    console.log('[getLetterFromY] letterHeight:', letterHeight, 'index:', index, 'letter:', letter);
    return letter;
  }, [letterIndexHeight]);

  // Handle letter activation (only if it has exercises)
  const activateLetter = useCallback((letter) => {
    console.log('[activateLetter] letter:', letter, 'availableLetters:', availableLetters, 'lastActivated:', lastActivatedLetter.current);
    if (letter && availableLetters.includes(letter) && letter !== lastActivatedLetter.current) {
      console.log('[activateLetter] Activating letter:', letter);
      lastActivatedLetter.current = letter;
      scrollToLetter(letter);
    } else {
      console.log('[activateLetter] Skipped - letter:', letter, 'hasExercises:', availableLetters.includes(letter), 'sameAsLast:', letter === lastActivatedLetter.current);
    }
  }, [availableLetters, scrollToLetter]);

  // Pan gesture for the letter index scrubber
  const letterIndexGesture = useMemo(() => 
    Gesture.Pan()
      .onBegin((event) => {
        console.log('[Pan.onBegin] event.y:', event.y, 'event.x:', event.x);
        const letter = getLetterFromY(event.y);
        activateLetter(letter);
      })
      .onUpdate((event) => {
        console.log('[Pan.onUpdate] event.y:', event.y);
        const letter = getLetterFromY(event.y);
        activateLetter(letter);
      })
      .onEnd(() => {
        console.log('[Pan.onEnd]');
        lastActivatedLetter.current = null;
        setTimeout(() => setHighlightedLetter(null), 300);
      })
      .onFinalize(() => {
        console.log('[Pan.onFinalize]');
        lastActivatedLetter.current = null;
      })
      .minDistance(0) // Activate immediately without requiring movement
      .hitSlop({ left: 10, right: 10 }), // Easier to hit
    [getLetterFromY, activateLetter, setHighlightedLetter]
  );

  const renderSectionHeader = useCallback(({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  ), []);

  const renderItem = useCallback(({ item }) => (
    <ExerciseListItem
      item={item}
      isSelected={false}
      isLastSelected={false}
      selectionOrder={null}
      onToggle={onToggleSelect}
    />
  ), [onToggleSelect]);

  const keyExtractor = useCallback((item) => item.id, []);

  if (exercises.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No exercises found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        ref={sectionListRef}
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={keyExtractor}
        stickySectionHeadersEnabled={true}
        showsVerticalScrollIndicator={false}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={() => {}}
      />
      
      {/* Letter Index - gesture-based scrubber for quick navigation */}
      <GestureDetector gesture={letterIndexGesture}>
        <View 
          style={styles.letterIndex}
          onLayout={(event) => {
            console.log('[letterIndex onLayout] height:', event.nativeEvent.layout.height);
            setLetterIndexHeight(event.nativeEvent.layout.height);
          }}
        >
          {LETTERS.map(letter => {
            const hasExercises = availableLetters.includes(letter);
            return (
              <View key={letter} style={styles.letterButton}>
                <Text
                  style={[
                    styles.letterText,
                    !hasExercises && styles.letterTextDisabled,
                    highlightedLetter === letter && styles.letterTextHighlighted,
                  ]}
                >
                  {letter}
                </Text>
              </View>
            );
          })}
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: COLORS.slate[100],
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[200],
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.slate[600],
  },
  emptyContainer: {
    flex: 1,
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.slate[400],
    fontSize: 14,
  },
  letterIndex: {
    width: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  letterButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  letterText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.blue[500],
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

export default UnselectedExercisesList;
