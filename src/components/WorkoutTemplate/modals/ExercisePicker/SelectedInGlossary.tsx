import React, { useRef, useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, Minus, MoreVertical, TrendingDown, Flame, XCircle, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { PADDING } from '@/constants/layout';
import { groupExercisesAlphabetically } from '@/utils/workoutHelpers';
import ExerciseListItem from './ExerciseListItem/ExerciseListItemIndex';
import ExerciseTags from './ExerciseListItem/ExerciseTags';
import UnselectedListScrollbar from './UnselectedListScrollbar';
import type { ExerciseLibraryItem } from '@/types/workout';
import type { SetGroup } from './DragAndDropModal';

interface SelectedInGlossaryProps {
  exercises: ExerciseLibraryItem[];
  onToggleSelect: (id: string) => void;
  highlightedLetter: string | null;
  setHighlightedLetter: (letter: string | null) => void;
  selectedIds?: string[];
  selectedOrder?: string[];
  onAddSet?: ((id: string) => void) | null;
  onRemoveSet?: ((id: string) => void) | null;
  blockDismissGestureRef?: any;
  exerciseSetGroups?: Record<string, SetGroup[]>;
  exerciseInstanceSetGroups?: Record<string, SetGroup[]>;
  onIncrementSetGroup?: ((instanceKey: string, setGroupId: string) => void) | null;
  onDecrementSetGroup?: ((instanceKey: string, setGroupId: string) => void) | null;
  onToggleDropset?: ((instanceKey: string, setGroupId: string) => void) | null;
  onToggleWarmup?: ((instanceKey: string, setGroupId: string) => void) | null;
  onToggleFailure?: ((instanceKey: string, setGroupId: string) => void) | null;
  onInsertRow?: ((instanceKey: string, setGroupId: string) => void) | null;
  onDeleteRow?: ((instanceKey: string, setGroupId: string) => void) | null;
}

interface Section {
  title: string;
  data: ExerciseLibraryItem[];
}

const SelectedInGlossary: React.FC<SelectedInGlossaryProps> = ({
  exercises,
  onToggleSelect,
  highlightedLetter,
  setHighlightedLetter,
  selectedIds = [],
  selectedOrder = [],
  onAddSet = null,
  onRemoveSet = null,
  blockDismissGestureRef = null,
  exerciseSetGroups = {},
  exerciseInstanceSetGroups = {},
  onIncrementSetGroup = null,
  onDecrementSetGroup = null,
  onToggleDropset = null,
  onToggleWarmup = null,
  onToggleFailure = null,
  onInsertRow = null,
  onDeleteRow = null,
}) => {
  const sectionListRef = useRef<SectionList<ExerciseLibraryItem, Section>>(null);
  const [openMenuExerciseId, setOpenMenuExerciseId] = useState<string | null>(null);
  const [openMenuSetGroupId, setOpenMenuSetGroupId] = useState<string | null>(null);

  const sections = useMemo(() => {
    return groupExercisesAlphabetically(exercises);
  }, [exercises]);

  const availableLetters = useMemo(() => {
    return sections.map(s => s.title);
  }, [sections]);

  const scrollToLetter = useCallback((letter: string) => {
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

  const renderSectionHeader = useCallback(({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  ), []);

  const renderSetGroupRow = useCallback((
    instanceKey: string,
    setGroup: SetGroup,
    setGroupIndex: number,
    totalSetGroups: number,
    isOnlyDefaultRow: boolean
  ) => {
    const isMenuOpen = openMenuExerciseId === instanceKey && openMenuSetGroupId === setGroup.id;
    const isFirstRow = setGroupIndex === 0;
    const isLastRow = setGroupIndex === totalSetGroups - 1;

    return (
      <View
        key={setGroup.id}
        style={[
          styles.setGroupRow,
          isFirstRow && styles.setGroupRowFirst,
          isLastRow && styles.setGroupRowLast,
        ]}
      >
        {/* Set count and type indicators */}
        <View style={styles.setGroupLeft}>
          {setGroup.isDropset && (
            <View style={styles.dropsetIndicator} />
          )}
          <Text style={[
            styles.setGroupCount,
            setGroup.isWarmup && { color: COLORS.orange[500] },
            setGroup.isFailure && { color: COLORS.red[500] },
          ]}>{setGroup.count}</Text>
          <Text style={styles.setGroupX}> x </Text>
        </View>

        {/* Controls */}
        <View style={styles.setGroupControls}>
          <TouchableOpacity
            onPress={() => onDecrementSetGroup?.(instanceKey, setGroup.id)}
            disabled={setGroup.count <= 1}
            style={[
              styles.setGroupButton,
              setGroup.count <= 1 && styles.setGroupButtonDisabled,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Minus size={14} color={setGroup.count <= 1 ? COLORS.slate[300] : COLORS.slate[600]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onIncrementSetGroup?.(instanceKey, setGroup.id)}
            style={styles.setGroupButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Plus size={14} color={COLORS.slate[600]} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (isMenuOpen) {
                setOpenMenuExerciseId(null);
                setOpenMenuSetGroupId(null);
              } else {
                setOpenMenuExerciseId(instanceKey);
                setOpenMenuSetGroupId(setGroup.id);
              }
            }}
            style={styles.setGroupButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={14} color={COLORS.blue[600]} />
          </TouchableOpacity>
        </View>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <>
            <TouchableOpacity
              style={styles.menuBackdrop}
              activeOpacity={1}
              onPress={() => {
                setOpenMenuExerciseId(null);
                setOpenMenuSetGroupId(null);
              }}
            />
            <View style={styles.setGroupMenu}>
              {/* Dropset */}
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  setGroup.isDropset && { backgroundColor: COLORS.indigo[500] }
                ]}
                onPress={() => {
                  onToggleDropset?.(instanceKey, setGroup.id);
                }}
              >
                <TrendingDown size={14} color={setGroup.isDropset ? COLORS.white : COLORS.indigo[400]} />
                <Text style={[styles.menuItemText, setGroup.isDropset && { color: COLORS.white }]}>Dropset</Text>
              </TouchableOpacity>

              {/* Warmup / Failure Row */}
              <View style={styles.menuItemRow}>
                <TouchableOpacity
                  style={[
                    styles.menuItemHalf,
                    setGroup.isWarmup && { backgroundColor: COLORS.orange[500] }
                  ]}
                  onPress={() => {
                    onToggleWarmup?.(instanceKey, setGroup.id);
                  }}
                >
                  <Flame size={14} color={setGroup.isWarmup ? COLORS.white : COLORS.orange[500]} />
                  <Text style={[styles.menuItemText, setGroup.isWarmup && { color: COLORS.white }]}>Warmup</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.menuItemHalf,
                    setGroup.isFailure && { backgroundColor: COLORS.red[500] }
                  ]}
                  onPress={() => {
                    onToggleFailure?.(instanceKey, setGroup.id);
                  }}
                >
                  <XCircle size={14} color={setGroup.isFailure ? COLORS.white : COLORS.red[500]} />
                  <Text style={[styles.menuItemText, setGroup.isFailure && { color: COLORS.white }]}>Failure</Text>
                </TouchableOpacity>
              </View>

              {/* Insert Row */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  onInsertRow?.(instanceKey, setGroup.id);
                  setOpenMenuExerciseId(null);
                  setOpenMenuSetGroupId(null);
                }}
              >
                <Plus size={14} color={COLORS.slate[200]} />
                <Text style={styles.menuItemText}>Insert Row</Text>
              </TouchableOpacity>

              {/* Delete Row */}
              {!isOnlyDefaultRow && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onDeleteRow?.(instanceKey, setGroup.id);
                    setOpenMenuExerciseId(null);
                    setOpenMenuSetGroupId(null);
                  }}
                >
                  <Trash2 size={14} color={COLORS.red[500]} />
                  <Text style={[styles.menuItemText, { color: COLORS.red[500] }]}>Delete Row</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    );
  }, [openMenuExerciseId, openMenuSetGroupId, onIncrementSetGroup, onDecrementSetGroup, onToggleDropset, onToggleWarmup, onToggleFailure, onInsertRow, onDeleteRow]);

  const renderItem = useCallback(({ item }: { item: ExerciseLibraryItem }) => {
    const isAlreadySelected = selectedIds.includes(item.id);
    const selectedCount = selectedOrder.filter(id => id === item.id).length;
    
    // Find all instances of this exercise by looking at exerciseInstanceSetGroups keys
    // Each key represents one card/instance from the drag and drop modal
    const exerciseInstances: Array<{ orderIndex: number; instanceKey: string; setGroups: SetGroup[] | undefined }> = [];
    
    // First, check exerciseInstanceSetGroups for instance-based entries
    Object.keys(exerciseInstanceSetGroups).forEach(instanceKey => {
      const [exerciseId, orderIndexStr] = instanceKey.split('::');
      if (exerciseId === item.id) {
        const orderIndex = parseInt(orderIndexStr, 10);
        const setGroups = exerciseInstanceSetGroups[instanceKey];
        exerciseInstances.push({ orderIndex, instanceKey, setGroups });
      }
    });
    
    // If no instance-based entries found, fall back to exerciseSetGroups or create default
    if (exerciseInstances.length === 0 && isAlreadySelected) {
      // Find the first occurrence in selectedOrder to use as the orderIndex
      const firstOrderIndex = selectedOrder.findIndex(id => id === item.id);
      if (firstOrderIndex !== -1) {
        const instanceKey = `${item.id}::${firstOrderIndex}`;
        // Use exerciseSetGroups if available, otherwise create a default setGroup
        const setGroups = exerciseSetGroups[item.id] || [{
          id: `sg-${item.id}-${firstOrderIndex}-default`,
          count: 1,
          isDropset: false,
        }];
        exerciseInstances.push({ 
          orderIndex: firstOrderIndex, 
          instanceKey, 
          setGroups 
        });
      }
    }

    // Check if any instance has multiple rows (but not if there's only 1 instance with 1 row)
    const hasAnyExpandedInstance = exerciseInstances.some(instance => {
      const setGroups = instance.setGroups;
      // Only consider it expanded if there are multiple rows, OR multiple instances
      return setGroups && setGroups.length > 1;
    });

    // Check if this is a simple case: 1 instance, 1 row (regardless of count or special properties)
    const isSimpleCase = isAlreadySelected && 
      exerciseInstances.length === 1 && 
      exerciseInstances[0].setGroups && 
      exerciseInstances[0].setGroups.length === 1;

    // If simple case, show inline controls in the regular list item
    if (isSimpleCase) {
      const instance = exerciseInstances[0];
      const setGroup = instance.setGroups![0];
      
      return (
        <View style={styles.inlineExerciseContainer}>
          <TouchableOpacity
            onPress={() => onToggleSelect(item.id)}
            style={styles.inlineExerciseContent}
          >
            <View style={styles.inlineExerciseInfo}>
              <Text style={styles.inlineExerciseName}>{item.name}</Text>
              <View style={styles.inlineTagsContainer}>
                <ExerciseTags
                  item={item}
                  isCollapsedGroup={false}
                  groupExercises={null}
                  showAddMore={false}
                  renderingSection={null}
                />
              </View>
            </View>
          </TouchableOpacity>
          
          {/* Inline controls where +/- button used to be */}
          <View style={styles.inlineControls}>
            {/* Set count and type indicators */}
            <View style={styles.inlineSetGroupLeft}>
              {setGroup.isDropset && (
                <View style={styles.inlineDropsetIndicator} />
              )}
              <Text style={[
                styles.inlineSetGroupCount,
                setGroup.isWarmup && { color: COLORS.orange[500] },
                setGroup.isFailure && { color: COLORS.red[500] },
              ]}>{setGroup.count}</Text>
              <Text style={styles.inlineSetGroupX}> x </Text>
            </View>

            {/* Controls */}
            <View style={styles.inlineSetGroupControls}>
              <TouchableOpacity
                onPress={() => onDecrementSetGroup?.(instance.instanceKey, setGroup.id)}
                disabled={setGroup.count <= 1}
                style={[
                  styles.inlineSetGroupButton,
                  setGroup.count <= 1 && styles.inlineSetGroupButtonDisabled,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Minus size={14} color={setGroup.count <= 1 ? COLORS.slate[300] : COLORS.slate[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onIncrementSetGroup?.(instance.instanceKey, setGroup.id)}
                style={styles.inlineSetGroupButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Plus size={14} color={COLORS.slate[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const isMenuOpen = openMenuExerciseId === instance.instanceKey && openMenuSetGroupId === setGroup.id;
                  if (isMenuOpen) {
                    setOpenMenuExerciseId(null);
                    setOpenMenuSetGroupId(null);
                  } else {
                    setOpenMenuExerciseId(instance.instanceKey);
                    setOpenMenuSetGroupId(setGroup.id);
                  }
                }}
                style={styles.inlineSetGroupButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MoreVertical size={14} color={COLORS.blue[600]} />
              </TouchableOpacity>
            </View>

            {/* Dropdown Menu */}
            {openMenuExerciseId === instance.instanceKey && openMenuSetGroupId === setGroup.id && (
              <>
                <TouchableOpacity
                  style={styles.menuBackdrop}
                  activeOpacity={1}
                  onPress={() => {
                    setOpenMenuExerciseId(null);
                    setOpenMenuSetGroupId(null);
                  }}
                />
                <View style={styles.inlineSetGroupMenu}>
                  {/* Dropset */}
                  <TouchableOpacity
                    style={[
                      styles.menuItem,
                      setGroup.isDropset && { backgroundColor: COLORS.indigo[500] }
                    ]}
                    onPress={() => {
                      onToggleDropset?.(instance.instanceKey, setGroup.id);
                    }}
                  >
                    <TrendingDown size={14} color={setGroup.isDropset ? COLORS.white : COLORS.indigo[400]} />
                    <Text style={[styles.menuItemText, setGroup.isDropset && { color: COLORS.white }]}>Dropset</Text>
                  </TouchableOpacity>

                  {/* Warmup / Failure Row */}
                  <View style={styles.menuItemRow}>
                    <TouchableOpacity
                      style={[
                        styles.menuItemHalf,
                        setGroup.isWarmup && { backgroundColor: COLORS.orange[500] }
                      ]}
                      onPress={() => {
                        onToggleWarmup?.(instance.instanceKey, setGroup.id);
                      }}
                    >
                      <Flame size={14} color={setGroup.isWarmup ? COLORS.white : COLORS.orange[500]} />
                      <Text style={[styles.menuItemText, setGroup.isWarmup && { color: COLORS.white }]}>Warmup</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.menuItemHalf,
                        setGroup.isFailure && { backgroundColor: COLORS.red[500] }
                      ]}
                      onPress={() => {
                        onToggleFailure?.(instance.instanceKey, setGroup.id);
                      }}
                    >
                      <XCircle size={14} color={setGroup.isFailure ? COLORS.white : COLORS.red[500]} />
                      <Text style={[styles.menuItemText, setGroup.isFailure && { color: COLORS.white }]}>Failure</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Insert Row */}
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      onInsertRow?.(instance.instanceKey, setGroup.id);
                      setOpenMenuExerciseId(null);
                      setOpenMenuSetGroupId(null);
                    }}
                  >
                    <Plus size={14} color={COLORS.slate[200]} />
                    <Text style={styles.menuItemText}>Insert Row</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      );
    }

    // If selected and has any expanded instance, show expanded view for all instances in one card
    if (isAlreadySelected && hasAnyExpandedInstance && exerciseInstances.length > 0) {
      return (
        <View style={styles.expandedExerciseContainer}>
          {/* Exercise header - shown once for all instances */}
          <TouchableOpacity
            onPress={() => onToggleSelect(item.id)}
            style={styles.expandedExerciseHeader}
          >
            <View style={styles.expandedExerciseInfo}>
              <Text style={styles.expandedExerciseName}>{item.name}</Text>
              <View style={styles.expandedTagsContainer}>
                <ExerciseTags
                  item={item}
                  isCollapsedGroup={false}
                  groupExercises={null}
                  showAddMore={false}
                  renderingSection={null}
                />
              </View>
            </View>
          </TouchableOpacity>

          {/* Each instance's setGroups in its own container */}
          {exerciseInstances.map((instance, instanceIndex) => {
            const setGroups = instance.setGroups;
            const hasMultipleRows = setGroups && (setGroups.length > 1 || (setGroups.length === 1 && (setGroups[0].count > 1 || setGroups[0].isDropset || setGroups[0].isWarmup || setGroups[0].isFailure)));
            
            if (!hasMultipleRows) return null;
            
            return (
              <View key={instance.instanceKey} style={styles.setGroupsContainer}>
                {setGroups.map((setGroup, index) => 
                  renderSetGroupRow(instance.instanceKey, setGroup, index, setGroups.length, setGroups.length === 1)
                )}
              </View>
            );
          })}
        </View>
      );
    }

    // For unselected exercises or simple selected exercises that don't meet the simple case criteria,
    // show the regular list item without the +/- buttons
    return (
      <ExerciseListItem
        item={item}
        isSelected={isAlreadySelected}
        isLastSelected={false}
        selectionOrder={null}
        onToggle={onToggleSelect}
        showAddMore={false}
        onAddMore={null}
        onRemoveSet={null}
        selectedCount={selectedCount}
        renderingSection="glossary"
      />
    );
  }, [onToggleSelect, selectedIds, selectedOrder, onAddSet, onRemoveSet, exerciseSetGroups, exerciseInstanceSetGroups, renderSetGroupRow, openMenuExerciseId, openMenuSetGroupId, onIncrementSetGroup, onDecrementSetGroup, onToggleDropset, onToggleWarmup, onToggleFailure, onInsertRow]);

  const keyExtractor = useCallback((item: ExerciseLibraryItem) => item.id, []);

  if (exercises.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No exercises found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList<ExerciseLibraryItem, Section>
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
        blockDismissGestureRef={blockDismissGestureRef}
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
    paddingHorizontal: PADDING.lg,
    paddingVertical: PADDING.sm,
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
  // Expanded exercise styles
  expandedExerciseContainer: {
    backgroundColor: COLORS.blue[100],
    marginHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  expandedExerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  expandedExerciseInfo: {
    flex: 1,
  },
  expandedExerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  expandedTagsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  setGroupsContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.slate[200],
    overflow: 'hidden',
  },
  setGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
    position: 'relative',
  },
  setGroupRowFirst: {},
  setGroupRowLast: {
    borderBottomWidth: 0,
  },
  setGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  dropsetIndicator: {
    width: 3,
    backgroundColor: COLORS.indigo[400],
    position: 'absolute',
    left: -12,
    top: -10,
    bottom: -10,
  },
  setGroupCount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  setGroupX: {
    fontSize: 15,
    color: COLORS.slate[500],
  },
  setGroupControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setGroupButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  setGroupButtonDisabled: {
    opacity: 0.5,
  },
  menuBackdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 998,
  },
  setGroupMenu: {
    position: 'absolute',
    right: 0,
    top: 40,
    backgroundColor: COLORS.slate[700],
    borderRadius: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[600],
  },
  menuItemRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[600],
  },
  menuItemHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  // Inline exercise styles (for simple case)
  inlineExerciseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomColor: COLORS.slate[100],
    backgroundColor: COLORS.blue[100],
  },
  inlineExerciseContent: {
    flex: 1,
  },
  inlineExerciseInfo: {
    flex: 1,
  },
  inlineExerciseName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  inlineTagsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  inlineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  inlineSetGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inlineDropsetIndicator: {
    width: 3,
    backgroundColor: COLORS.indigo[400],
    position: 'absolute',
    left: -12,
    top: -10,
    bottom: -10,
  },
  inlineSetGroupCount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.slate[900],
  },
  inlineSetGroupX: {
    fontSize: 15,
    color: COLORS.slate[500],
  },
  inlineSetGroupControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineSetGroupButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineSetGroupButtonDisabled: {
    opacity: 0.5,
  },
  inlineSetGroupMenu: {
    position: 'absolute',
    right: 0,
    top: 40,
    backgroundColor: COLORS.slate[700],
    borderRadius: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
    overflow: 'hidden',
  },
});

export default SelectedInGlossary;
