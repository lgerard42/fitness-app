import React, { useRef, useCallback, useMemo } from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { COLORS } from '../../../../constants/colors';
import ExerciseListItem from './ExerciseListItem';
import UnselectedListScrollbar from './UnselectedListScrollbar';

const SelectedInGlossary = ({
  exercises,
  onToggleSelect,
  highlightedLetter,
  setHighlightedLetter,
  selectedIds = [],
  selectedOrder = [],
  onAddSet = null,
  onRemoveSet = null,
}) => {
  const sectionListRef = useRef(null);

  const sections = useMemo(() => {
    const grouped = {};
    exercises.forEach(ex => {
      const letter = ex.name.charAt(0).toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(ex);
    });
    return Object.keys(grouped).sort().map(letter => ({ title: letter, data: grouped[letter] }));
  }, [exercises]);

  const availableLetters = useMemo(() => {
    return sections.map(s => s.title);
  }, [sections]);

  const scrollToLetter = useCallback((letter) => {
    const sectionIndex = sections.findIndex(s => s.title === letter);
    if (sectionIndex !== -1 && sectionListRef.current) {
      try {
        sectionListRef.current.scrollToLocation({
          sectionIndex,
          itemIndex: 1,
          animated: true,
          viewPosition: 0,
        });
      } catch (error) {
        console.log('[scrollToLetter] ERROR:', error);
      }
    }
    setHighlightedLetter(letter);
  }, [sections, setHighlightedLetter]);

  const renderSectionHeader = useCallback(({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  ), []);

  const renderItem = useCallback(({ item }) => {
    const isAlreadySelected = selectedIds.includes(item.id);
    const selectedCount = selectedOrder.filter(id => id === item.id).length;

    return (
      <ExerciseListItem
        item={item}
        isSelected={isAlreadySelected}
        isLastSelected={false}
        selectionOrder={null}
        onToggle={onToggleSelect}
        showAddMore={isAlreadySelected}
        onAddMore={onAddSet}
        onRemoveSet={onRemoveSet}
        selectedCount={selectedCount}
        renderingSection="glossary"
      />
    );
  }, [onToggleSelect, selectedIds, selectedOrder, onAddSet, onRemoveSet]);

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
        style={styles.sectionList}
        contentContainerStyle={styles.sectionListContent}
        onScrollToIndexFailed={(info) => {
          console.log('[SectionList] onScrollToIndexFailed:', info);
        }}
      />
      
      <UnselectedListScrollbar 
        availableLetters={availableLetters}
        highlightedLetter={highlightedLetter}
        setHighlightedLetter={setHighlightedLetter}
        onScrollToLetter={scrollToLetter}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sectionList: {
    flex: 1,
  },
  sectionListContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: COLORS.slate[50],
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[50],
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
});

export default SelectedInGlossary;
