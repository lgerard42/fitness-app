import React, { useRef, useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
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
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const menuButtonRefs = useRef<Map<string, any>>(new Map());
  const screenWidth = Dimensions.get('window').width;

  const sections = useMemo(() => {
    return groupExercisesAlphabetically(exercises);
  }, [exercises]);

  const availableLetters = useMemo(() => {
    return sections.map(s => s.title);
  }, [sections]);

  // Memoized helper to get exercise instances - prevents stale closures during rapid selections
  const getExerciseInstances = useCallback((
    item: ExerciseLibraryItem,
    selectedIds: string[],
    selectedOrder: string[],
    exerciseSetGroups: Record<string, SetGroup[]>,
    exerciseInstanceSetGroups: Record<string, SetGroup[]>
  ) => {
    const isAlreadySelected = selectedIds.includes(item.id);
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
    // IMPORTANT: Find ALL occurrences, not just the first one, to handle multiple instances correctly
    if (exerciseInstances.length === 0 && isAlreadySelected) {
      // Find all occurrences of this exercise in selectedOrder
      selectedOrder.forEach((id, orderIndex) => {
        if (id === item.id) {
          const instanceKey = `${item.id}::${orderIndex}`;
          // Check if this instance already exists in exerciseInstanceSetGroups (might have been created by useEffect)
          const existingSetGroups = exerciseInstanceSetGroups[instanceKey];
          const setGroups = existingSetGroups || exerciseSetGroups[item.id] || [{
            id: `sg-${item.id}-${orderIndex}-default`,
            count: 1,
            isDropset: false,
          }];
          exerciseInstances.push({
            orderIndex,
            instanceKey,
            setGroups
          });
        }
      });
    }

    return exerciseInstances;
  }, []);

  // Memoized map of exercise instances - prevents expensive recalculations during rapid selections
  const exerciseInstancesMap = useMemo(() => {
    const map = new Map<string, Array<{ orderIndex: number; instanceKey: string; setGroups: SetGroup[] | undefined }>>();

    exercises.forEach(item => {
      const instances = getExerciseInstances(
        item,
        selectedIds,
        selectedOrder,
        exerciseSetGroups,
        exerciseInstanceSetGroups
      );
      map.set(item.id, instances);
    });

    return map;
  }, [exercises, selectedIds, selectedOrder, exerciseSetGroups, exerciseInstanceSetGroups, getExerciseInstances]);

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
            ref={(ref) => {
              if (ref) {
                menuButtonRefs.current.set(`${instanceKey}-${setGroup.id}`, ref);
              } else {
                menuButtonRefs.current.delete(`${instanceKey}-${setGroup.id}`);
              }
            }}
            onPress={() => {
              if (isMenuOpen) {
                setOpenMenuExerciseId(null);
                setOpenMenuSetGroupId(null);
                setMenuPosition(null);
              } else {
                setOpenMenuExerciseId(instanceKey);
                setOpenMenuSetGroupId(setGroup.id);
                // Measure button position with a delay to ensure ref is available
                const measureButton = () => {
                  const buttonRef = menuButtonRefs.current.get(`${instanceKey}-${setGroup.id}`);
                  if (buttonRef) {
                    buttonRef.measureInWindow((x: number, y: number, width: number, height: number) => {
                      const dropdownWidth = 180;
                      const padding = 16;
                      // Align dropdown to the right edge of the button
                      let menuX = x + width - dropdownWidth;
                      // Ensure dropdown doesn't go off the right edge
                      if (menuX + dropdownWidth > screenWidth - padding) {
                        menuX = screenWidth - dropdownWidth - padding;
                      }
                      // Ensure dropdown doesn't go off the left edge
                      if (menuX < padding) {
                        menuX = padding;
                      }
                      setMenuPosition({ x: menuX, y: y + height + 4 });
                    });
                  } else {
                    // Retry if ref not available yet
                    setTimeout(measureButton, 10);
                  }
                };
                setTimeout(measureButton, 0);
              }
            }}
            style={styles.setGroupButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MoreVertical size={14} color={COLORS.blue[600]} />
          </TouchableOpacity>
        </View>

        {/* Menu trigger - actual menu rendered in Modal at root level */}
      </View>
    );
  }, [openMenuExerciseId, openMenuSetGroupId, onIncrementSetGroup, onDecrementSetGroup, onToggleDropset, onToggleWarmup, onToggleFailure, onInsertRow, onDeleteRow]);

  const renderItem = useCallback(({ item }: { item: ExerciseLibraryItem }) => {
    // Capture item.id immediately to ensure we always use the correct item
    const itemId = item.id;
    const isAlreadySelected = selectedIds.includes(itemId);

    // Use memoized exercise instances map instead of recalculating on every render
    // This prevents stale closures and expensive recalculations during rapid selections
    // Always use itemId (captured from render props) to prevent stale closures
    const exerciseInstances = exerciseInstancesMap.get(itemId) || [];

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

      // Capture the instanceKey and setGroupId to prevent stale closures
      const currentInstanceKey = instance.instanceKey;
      const currentSetGroupId = setGroup.id;

      return (
        <View key={`inline-${itemId}`} style={styles.inlineExerciseContainer}>
          <TouchableOpacity
            onPress={() => {
              // Do nothing - clicking on selected exercises shouldn't toggle them
              // User should use the +/- buttons to modify sets
            }}
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
                onPress={() => onDecrementSetGroup?.(currentInstanceKey, currentSetGroupId)}
                style={styles.inlineSetGroupButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Minus size={14} color={COLORS.slate[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onIncrementSetGroup?.(currentInstanceKey, currentSetGroupId)}
                style={styles.inlineSetGroupButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Plus size={14} color={COLORS.slate[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                ref={(ref) => {
                  if (ref) {
                    menuButtonRefs.current.set(`${currentInstanceKey}-${currentSetGroupId}`, ref);
                  } else {
                    menuButtonRefs.current.delete(`${currentInstanceKey}-${currentSetGroupId}`);
                  }
                }}
                onPress={() => {
                  const isMenuOpen = openMenuExerciseId === currentInstanceKey && openMenuSetGroupId === currentSetGroupId;
                  if (isMenuOpen) {
                    setOpenMenuExerciseId(null);
                    setOpenMenuSetGroupId(null);
                    setMenuPosition(null);
                  } else {
                    setOpenMenuExerciseId(currentInstanceKey);
                    setOpenMenuSetGroupId(currentSetGroupId);
                    // Measure button position with a delay to ensure ref is available
                    const measureButton = () => {
                      const buttonRef = menuButtonRefs.current.get(`${currentInstanceKey}-${currentSetGroupId}`);
                      if (buttonRef) {
                        buttonRef.measureInWindow((x: number, y: number, width: number, height: number) => {
                          const dropdownWidth = 180;
                          const padding = 16;
                          // Align dropdown to the right edge of the button
                          let menuX = x + width - dropdownWidth;
                          // Ensure dropdown doesn't go off the right edge
                          if (menuX + dropdownWidth > screenWidth - padding) {
                            menuX = screenWidth - dropdownWidth - padding;
                          }
                          // Ensure dropdown doesn't go off the left edge
                          if (menuX < padding) {
                            menuX = padding;
                          }
                          setMenuPosition({ x: menuX, y: y + height + 4 });
                        });
                      } else {
                        // Retry if ref not available yet
                        setTimeout(measureButton, 10);
                      }
                    };
                    setTimeout(measureButton, 0);
                  }
                }}
                style={styles.inlineSetGroupButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MoreVertical size={14} color={COLORS.blue[600]} />
              </TouchableOpacity>
            </View>

            {/* Menu trigger - actual menu rendered in Modal at root level */}
          </View>
        </View>
      );
    }

    // If selected and has any expanded instance, show expanded view for all instances in one card
    if (isAlreadySelected && hasAnyExpandedInstance && exerciseInstances.length > 0) {
      return (
        <View key={`expanded-${itemId}`} style={styles.expandedExerciseContainer}>
          {/* Exercise header - shown once for all instances */}
          <TouchableOpacity
            onPress={() => {
              // Don't toggle selection - clicking on selected exercises shouldn't unselect them
              // The user should use the controls to modify the exercise
            }}
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
    // Wrap in View with explicit key to prevent React from reusing components incorrectly
    return (
      <View key={`list-item-${itemId}`}>
        <ExerciseListItem
          item={item}
          isSelected={isAlreadySelected}
          isLastSelected={false}
          onToggle={onToggleSelect}
          showAddMore={false}
          renderingSection="glossary"
        />
      </View>
    );
  }, [selectedIds, exerciseInstancesMap, renderSetGroupRow, openMenuExerciseId, openMenuSetGroupId, onToggleSelect, onIncrementSetGroup, onDecrementSetGroup, onToggleDropset, onToggleWarmup, onToggleFailure, onInsertRow]);

  // Helper to render menu content
  const renderMenuContent = useCallback((setGroup: SetGroup, instanceKey: string, isExpanded: boolean = false, canDeleteRow: boolean = false) => {
    return (
      <>
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

        {/* Delete Row - only show if there are multiple rows */}
        {canDeleteRow && (
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
      </>
    );
  }, [onToggleDropset, onToggleWarmup, onToggleFailure, onInsertRow, onDeleteRow]);

  // Find the currently open menu's setGroup data
  const openMenuData = useMemo(() => {
    if (!openMenuExerciseId || !openMenuSetGroupId) return null;

    if (exerciseInstanceSetGroups[openMenuExerciseId]) {
      const setGroups = exerciseInstanceSetGroups[openMenuExerciseId];
      const setGroup = setGroups.find(sg => sg.id === openMenuSetGroupId);
      if (setGroup) {
        // Determine if this is an expanded view (multiple rows or complex configuration)
        const hasMultipleRows = setGroups.length > 1 || (setGroups.length === 1 && (setGroups[0].count > 1 || setGroups[0].isDropset || setGroups[0].isWarmup || setGroups[0].isFailure));
        // Delete row should only be available when there are multiple setGroups (rows)
        const canDeleteRow = setGroups.length > 1;
        return { setGroup, instanceKey: openMenuExerciseId, isExpanded: hasMultipleRows, canDeleteRow };
      }
    }

    return null;
  }, [openMenuExerciseId, openMenuSetGroupId, exerciseInstanceSetGroups]);

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

      {/* Render popups in Modal to ensure they're on top */}
      <Modal
        visible={!!openMenuData}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          setOpenMenuExerciseId(null);
          setOpenMenuSetGroupId(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => {
            setOpenMenuExerciseId(null);
            setOpenMenuSetGroupId(null);
            setMenuPosition(null);
          }}
        >
          {openMenuData && menuPosition && (
            <View style={[styles.modalMenuContainer, { left: menuPosition.x, top: menuPosition.y }]}>
              <View style={styles.modalMenu}>
                {renderMenuContent(openMenuData.setGroup, openMenuData.instanceKey, openMenuData.isExpanded, openMenuData.canDeleteRow)}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
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
    overflow: 'visible',
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
    backgroundColor: COLORS.blue[200],
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.blue[200],
    overflow: 'visible',
  },
  setGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingLeft: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.blue[150],
    position: 'relative',
    zIndex: 1000,
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 99998,
    elevation: 99998,
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
    elevation: 99999,
    zIndex: 99999,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalMenuContainer: {
    position: 'absolute',
  },
  modalMenu: {
    backgroundColor: COLORS.slate[700],
    borderRadius: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 99999,
    overflow: 'hidden',
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
    overflow: 'visible',
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
    zIndex: 1,
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
    elevation: 99999,
    zIndex: 99999,
    overflow: 'hidden',
  },
});

export default SelectedInGlossary;
