import React, { useRef, useCallback, useMemo } from 'react';
import { View, Text, SectionList, TouchableOpacity, StyleSheet } from 'react-native';
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
        animated: true,
      });
    }
    
    setHighlightedLetter(letter);
    setTimeout(() => setHighlightedLetter(null), 500);
  }, [sections, setHighlightedLetter]);

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
      
      {/* Letter Index - each letter is a TouchableOpacity */}
      <View style={styles.letterIndex}>
        {LETTERS.map(letter => {
          const hasExercises = availableLetters.includes(letter);
          return (
            <TouchableOpacity
              key={letter}
              onPress={() => hasExercises && scrollToLetter(letter)}
              style={styles.letterButton}
              activeOpacity={hasExercises ? 0.5 : 1}
            >
              <Text
                style={[
                  styles.letterText,
                  !hasExercises && styles.letterTextDisabled,
                  highlightedLetter === letter && styles.letterTextHighlighted,
                ]}
              >
                {letter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
