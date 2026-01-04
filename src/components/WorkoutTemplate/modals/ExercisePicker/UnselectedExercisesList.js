import React, { useRef, useCallback, useMemo } from 'react';
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
  const letterIndexHeightRef = useRef(0);
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
    
    console.log('[scrollToLetter] letter:', letter, 'sectionIndex:', sectionIndex, 'ref exists:', !!sectionListRef.current);
    
    if (sectionIndex !== -1 && sectionListRef.current) {
      try {
        // Use itemIndex: 1 instead of 0 - workaround for SectionList bug
        // itemIndex 0 can sometimes fail, 1 scrolls to first actual item
        sectionListRef.current.scrollToLocation({
          sectionIndex,
          itemIndex: 1,
          animated: true,
          viewPosition: 0,
        });
        console.log('[scrollToLetter] scrollToLocation called for section', sectionIndex);
      } catch (error) {
        console.log('[scrollToLetter] ERROR:', error);
      }
    }
    
    setHighlightedLetter(letter);
  }, [sections, setHighlightedLetter]);

  // Pan gesture for the letter index scrubber
  const letterIndexGesture = Gesture.Pan()
    .onBegin((event) => {
      const height = letterIndexHeightRef.current;
      console.log('[onBegin] height:', height, 'event.y:', event.y);
      if (height <= 0) return;
      const letterHeight = height / LETTERS.length;
      const index = Math.floor(event.y / letterHeight);
      const clampedIndex = Math.max(0, Math.min(index, LETTERS.length - 1));
      const letter = LETTERS[clampedIndex];
      console.log('[onBegin] calculated letter:', letter, 'availableLetters:', availableLetters);
      if (letter && availableLetters.includes(letter)) {
        lastActivatedLetter.current = letter;
        scrollToLetter(letter);
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
        console.log('[onUpdate] switching to letter:', letter);
        lastActivatedLetter.current = letter;
        scrollToLetter(letter);
      }
    })
    .onEnd(() => {
      lastActivatedLetter.current = null;
      setTimeout(() => setHighlightedLetter(null), 300);
    })
    .minDistance(0)
    .hitSlop({ left: 10, right: 10 });

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
        onScrollToIndexFailed={(info) => {
          console.log('[SectionList] onScrollToIndexFailed:', info);
        }}
      />
      
      {/* Letter Index - gesture-based scrubber for quick navigation */}
      <GestureDetector gesture={letterIndexGesture}>
        <View 
          style={styles.letterIndex}
          onLayout={(event) => {
            letterIndexHeightRef.current = event.nativeEvent.layout.height;
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
    backgroundColor: COLORS.slate[50],
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  sectionHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.slate[500],
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
    backgroundColor: COLORS.slate[50],
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

export default UnselectedExercisesList;
