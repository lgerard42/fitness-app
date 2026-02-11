import React, { useRef, useCallback, useMemo, useState } from 'react';
import { View, Text, SectionList, StyleSheet, TouchableOpacity, Modal, Dimensions, InteractionManager } from 'react-native';
import { Plus, Minus, MoreVertical, TrendingDown, Flame, Zap, Trash2, Edit } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { PADDING } from '@/constants/layout';
import { groupExercisesAlphabetically } from '@/utils/workoutHelpers';
import { defaultPopupStyles } from '@/constants/defaultStyles';
import ExerciseListItem from './ExerciseListItem/ExerciseListItemIndex';
import ExerciseTags from './ExerciseListItem/ExerciseTags';
import UnselectedListScrollbar from './UnselectedListScrollbar';
import type { ExerciseLibraryItem } from '@/types/workout';
import type { SetGroup } from '@/utils/workoutInstanceHelpers';

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
  onEditInstanceSets?: ((instanceKey: string, exerciseId: string) => void) | null;
  onDeleteInstance?: ((instanceKey: string) => void) | null;
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
  onEditInstanceSets = null,
  onDeleteInstance = null,
}) => {
  const sectionListRef = useRef<SectionList<ExerciseLibraryItem, Section>>(null);
  const [openMenuExerciseId, setOpenMenuExerciseId] = useState<string | null>(null);
  const [openMenuSetGroupId, setOpenMenuSetGroupId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [openSummaryPopupInstanceKey, setOpenSummaryPopupInstanceKey] = useState<string | null>(null);
  const [summaryPopupPosition, setSummaryPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const menuButtonRefs = useRef<Map<string, any>>(new Map());
  const summaryBadgeRefs = useRef<Map<string, any>>(new Map());
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

  // Helper to render set group badge items with indicators and colors
  const renderSetGroupBadgeItems = useCallback((setGroups: SetGroup[]) => {
    return setGroups.map((sg, index) => {
      const isLast = index === setGroups.length - 1;
      const textColor = sg.isWarmup
        ? COLORS.orange[500]
        : sg.isFailure
          ? COLORS.red[500]
          : COLORS.slate[900]; // Black/default

      return (
        <View key={sg.id} style={styles.summaryBadgeItem}>
          {sg.isDropset && (
            <View style={styles.summaryBadgeDropsetIndicator} />
          )}
          <Text style={[styles.summaryBadgeItemText, { color: textColor }]}>
            {sg.count}
          </Text>
        </View>
      );
    });
  }, []);

  const renderSetGroupRow = useCallback((
    instanceKey: string,
    setGroup: SetGroup,
    setGroupIndex: number,
    totalSetGroups: number,
    isOnlyDefaultRow: boolean,
    exerciseName: string
  ) => {
    const isMenuOpen = openMenuExerciseId === instanceKey && openMenuSetGroupId === setGroup.id;
    const isFirstRow = setGroupIndex === 0;
    const isLastRow = setGroupIndex === totalSetGroups - 1;

    return (
      <View
        key={setGroup.id}
        style={[
          styles.setGroupRow,
          isLastRow && styles.setGroupRowLast,
        ]}
      >
        {/* Exercise name */}
        <Text style={styles.setGroupExerciseName}>{exerciseName}</Text>

        {/* Right side content */}
        <View style={styles.setGroupRight}>
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
          <View style={styles.setGroupControlsContainer}>
            <View style={styles.setGroupControls}>
              <TouchableOpacity
                onPress={() => onDecrementSetGroup?.(instanceKey, setGroup.id)}
                disabled={setGroup.count <= 1}
                style={[
                  styles.setGroupControlButton,
                  setGroup.count <= 1 && styles.setGroupButtonDisabled,
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Minus size={14} color={setGroup.count <= 1 ? COLORS.slate[300] : COLORS.slate[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onIncrementSetGroup?.(instanceKey, setGroup.id)}
                style={styles.setGroupControlButton}
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
                style={styles.setGroupMenuButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MoreVertical size={14} color={COLORS.blue[600]} />
              </TouchableOpacity>
            </View>
          </View>
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
              // If there's only 1 set, clicking removes it and deselects the exercise
              if (setGroup.count === 1) {
                onDecrementSetGroup?.(currentInstanceKey, currentSetGroupId);
              }
              // Otherwise, do nothing - clicking on selected exercises shouldn't toggle them
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
                style={styles.inlineSetGroupControlButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Minus size={14} color={COLORS.slate[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onIncrementSetGroup?.(currentInstanceKey, currentSetGroupId)}
                style={styles.inlineSetGroupControlButton}
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
                style={styles.inlineSetGroupMenuButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MoreVertical size={18} color={COLORS.blue[600]} />
              </TouchableOpacity>
            </View>

            {/* Menu trigger - actual menu rendered in Modal at root level */}
          </View>
        </View>
      );
    }

    // Check if any instance has multiple rows (for single instance case)
    const hasAnyExpandedInstance = exerciseInstances.some(instance => {
      const setGroups = instance.setGroups;
      return setGroups && setGroups.length > 1;
    });

    // If selected and (has multiple instances OR has any instance with multiple rows), show summary badges
    if (isAlreadySelected && exerciseInstances.length > 0 && (exerciseInstances.length > 1 || hasAnyExpandedInstance)) {
      // Filter to instances that have setGroups (all instances should have setGroups, but filter for safety)
      const renderableBadgeInstances = exerciseInstances.filter(
        (inst) => inst.setGroups && inst.setGroups.length > 0,
      );

      // Only render summary badges if we have renderable instances
      if (renderableBadgeInstances.length > 0) {
        const hasThreeOrMoreBadges = renderableBadgeInstances.length >= 3;

        return (
          <View
            key={`summary-${itemId}`}
            style={[
              styles.summaryExerciseContainer,
              hasThreeOrMoreBadges && styles.summaryExerciseContainerTall,
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                // Don't toggle selection - clicking on selected exercises shouldn't unselect them
              }}
              style={styles.summaryExerciseContent}
            >
              <View style={styles.summaryExerciseInfo}>
                <Text style={styles.summaryExerciseName}>{item.name}</Text>
                <View style={styles.summaryTagsContainer}>
                  <ExerciseTags
                    item={item}
                    isCollapsedGroup={false}
                    groupExercises={null}
                  />
                </View>
              </View>
            </TouchableOpacity>

            {/* Summary badges stacked vertically - one per instance */}
            <View
              style={[
                styles.summaryBadgesContainer,
                hasThreeOrMoreBadges && styles.summaryBadgesContainerTall,
              ]}
            >
              {renderableBadgeInstances.map((instance, badgeIndex) => {
                const setGroups = instance.setGroups!;
                const isPopupOpen = openSummaryPopupInstanceKey === instance.instanceKey;
                const instanceKey = instance.instanceKey;
                const isFirstBadge = badgeIndex === 0;
                const isLastBadge = badgeIndex === renderableBadgeInstances.length - 1;
                const applyFirstLastMargins = hasThreeOrMoreBadges;

                return (
                  <TouchableOpacity
                    key={instanceKey}
                    ref={(ref) => {
                      if (ref) {
                        summaryBadgeRefs.current.set(instanceKey, ref);
                      } else {
                        summaryBadgeRefs.current.delete(instanceKey);
                      }
                    }}
                    onPress={() => {
                      const isCurrentlyOpen = openSummaryPopupInstanceKey === instanceKey;
                      if (isCurrentlyOpen) {
                        setOpenSummaryPopupInstanceKey(null);
                        setSummaryPopupPosition(null);
                      } else {
                        // Set state immediately for instant visual feedback
                        setOpenSummaryPopupInstanceKey(instanceKey);

                        // Defer heavy operations (Modal mount + measureInWindow) until after paint
                        // This allows the badge selected style to appear instantly
                        InteractionManager.runAfterInteractions(() => {
                          requestAnimationFrame(() => {
                            const measureBadge = () => {
                              const badgeRef = summaryBadgeRefs.current.get(instanceKey);
                              if (badgeRef) {
                                badgeRef.measureInWindow((x: number, y: number, width: number, height: number) => {
                                  const popupWidth = 180;
                                  const padding = 16;
                                  let popupX = x + width - popupWidth;
                                  if (popupX + popupWidth > screenWidth - padding) {
                                    popupX = screenWidth - popupWidth - padding;
                                  }
                                  if (popupX < padding) {
                                    popupX = padding;
                                  }
                                  setSummaryPopupPosition({ x: popupX, y: y + height + 4 });
                                });
                              } else {
                                // Retry on next frame if ref not ready
                                requestAnimationFrame(measureBadge);
                              }
                            };
                            measureBadge();
                          });
                        });
                      }
                    }}
                    style={[
                      isPopupOpen ? [styles.summaryBadge, styles.summaryBadgeSelected] : styles.summaryBadge,
                      applyFirstLastMargins && isFirstBadge && styles.summaryBadgeFirstOfMany,
                      applyFirstLastMargins && isLastBadge && styles.summaryBadgeLastOfMany,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.summaryBadgeContent}>
                      {renderSetGroupBadgeItems(setGroups)}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      }
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
  }, [selectedIds, exerciseInstancesMap, renderSetGroupRow, openMenuExerciseId, openMenuSetGroupId, openSummaryPopupInstanceKey, onToggleSelect, onIncrementSetGroup, onDecrementSetGroup, onToggleDropset, onToggleWarmup, onToggleFailure, onInsertRow, renderSetGroupBadgeItems, screenWidth]);

  // Helper to render menu content
  const renderMenuContent = useCallback((setGroup: SetGroup, instanceKey: string, isExpanded: boolean = false, canDeleteRow: boolean = false) => {
    const isWarmup = setGroup.isWarmup || false;
    const isFailure = setGroup.isFailure || false;

    return (
      <>
        {/* Warmup / Failure Toggle Row - at the top */}
        <View style={[
          styles.menuToggleRow,
          defaultPopupStyles.borderRadiusFirst,
        ]}>
          <View style={styles.menuToggleButtonsWrapper}>
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.menuToggleOption,
                styles.menuToggleOptionInactive,
                isWarmup && styles.menuToggleOptionActiveWarmup,
              ]}
              onPress={() => {
                onToggleWarmup?.(instanceKey, setGroup.id);
              }}
            >
              <View style={styles.menuToggleOptionContent}>
                <Flame
                  size={18}
                  color={isWarmup ? COLORS.white : COLORS.orange[500]}
                />
                <Text style={[
                  styles.menuToggleOptionText,
                  styles.menuToggleOptionTextInactive,
                  isWarmup && styles.menuToggleOptionTextActive,
                ]}>
                  Warmup
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={1}
              style={[
                styles.menuToggleOption,
                styles.menuToggleOptionInactive,
                isFailure && styles.menuToggleOptionActiveFailure,
              ]}
              onPress={() => {
                onToggleFailure?.(instanceKey, setGroup.id);
              }}
            >
              <View style={styles.menuToggleOptionContent}>
                <Zap
                  size={18}
                  color={isFailure ? COLORS.white : COLORS.red[500]}
                />
                <Text style={[
                  styles.menuToggleOptionText,
                  styles.menuToggleOptionTextInactive,
                  isFailure && styles.menuToggleOptionTextActive,
                ]}>
                  Failure
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dropset */}
        <TouchableOpacity
          style={[
            styles.menuItem,
            setGroup.isDropset && styles.menuItemActive,
          ]}
          onPress={() => {
            onToggleDropset?.(instanceKey, setGroup.id);
          }}
        >
          <View style={styles.menuItemContent}>
            <TrendingDown size={18} color={setGroup.isDropset ? COLORS.white : COLORS.indigo[400]} />
            <Text style={[styles.menuItemText, setGroup.isDropset && { color: COLORS.white }]}>Dropset</Text>
          </View>
        </TouchableOpacity>

        {/* Edit Sets */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            if (onEditInstanceSets) {
              const exerciseId = instanceKey.split('::')[0];
              onEditInstanceSets(instanceKey, exerciseId);
            }
            setOpenMenuExerciseId(null);
            setOpenMenuSetGroupId(null);
            setMenuPosition(null);
          }}
        >
          <View style={styles.menuItemContent}>
            <Edit size={18} color={defaultPopupStyles.optionText.color} />
            <Text style={styles.menuItemText}>Edit Sets</Text>
          </View>
        </TouchableOpacity>

        {/* Delete Row - only show if there are multiple rows */}
        {canDeleteRow && (
          <TouchableOpacity
            style={[styles.menuItem, defaultPopupStyles.borderRadiusLast, defaultPopupStyles.borderBottomLast]}
            onPress={() => {
              onDeleteRow?.(instanceKey, setGroup.id);
              setOpenMenuExerciseId(null);
              setOpenMenuSetGroupId(null);
              setMenuPosition(null);
            }}
          >
            <View style={styles.menuItemContent}>
              <Trash2 size={18} color={COLORS.red[500]} />
              <Text style={[styles.menuItemText, { color: COLORS.red[500] }]}>Delete Row</Text>
            </View>
          </TouchableOpacity>
        )}
      </>
    );
  }, [onToggleDropset, onToggleWarmup, onToggleFailure, onDeleteRow, onEditInstanceSets]);

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

      {/* Summary badge popup modal */}
      {/* Only render Modal when position is ready to avoid heavy mount during state update */}
      {openSummaryPopupInstanceKey && summaryPopupPosition && (
        <Modal
          visible={true}
          transparent={true}
          animationType="none"
          onRequestClose={() => {
            setOpenSummaryPopupInstanceKey(null);
            setSummaryPopupPosition(null);
          }}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setOpenSummaryPopupInstanceKey(null);
              setSummaryPopupPosition(null);
            }}
          >
            <View style={[styles.summaryPopupContainer, { left: summaryPopupPosition.x, top: summaryPopupPosition.y }]}>
              <View style={[styles.summaryPopupOptionRow, defaultPopupStyles.borderRadiusFirst, defaultPopupStyles.borderRadiusLast, defaultPopupStyles.borderBottomLast]}>
                <TouchableOpacity
                  style={[styles.summaryPopupOptionInRow, styles.summaryPopupOptionInRowFlex]}
                  onPress={() => {
                    console.log('Edit Set clicked, onEditInstanceSets:', !!onEditInstanceSets, 'instanceKey:', openSummaryPopupInstanceKey);
                    if (onEditInstanceSets && openSummaryPopupInstanceKey) {
                      // Find the exercise ID for this instance
                      const instanceKey = openSummaryPopupInstanceKey;
                      const exerciseId = instanceKey.split('::')[0];
                      console.log('Calling onEditInstanceSets with:', { instanceKey, exerciseId });
                      onEditInstanceSets(instanceKey, exerciseId);
                      setOpenSummaryPopupInstanceKey(null);
                      setSummaryPopupPosition(null);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.summaryPopupOptionContent}>
                    <Edit size={16} color={defaultPopupStyles.optionText.color} />
                    <Text style={styles.summaryPopupOptionText}>Edit Set</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.summaryPopupOptionInRow, styles.summaryPopupOptionInRowWithBorder, styles.summaryPopupOptionIconOnly]}
                  onPress={() => {
                    if (onDeleteInstance && openSummaryPopupInstanceKey) {
                      onDeleteInstance(openSummaryPopupInstanceKey);
                      setOpenSummaryPopupInstanceKey(null);
                      setSummaryPopupPosition(null);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={defaultPopupStyles.optionText.color} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
  summaryExerciseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.blue[100],
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomColor: COLORS.slate[100],
    overflow: 'visible',
  },
  summaryExerciseContainerTall: {
    alignItems: 'flex-start',
  },
  summaryExerciseContent: {
    flex: 1,
    marginRight: 8,
  },
  summaryExerciseInfo: {
    flex: 1,
  },
  summaryExerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.slate[900],
  },
  summaryTagsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  summaryBadgesContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    marginRight: 8,
    minWidth: 60,
    maxHeight: 48, // Limit height to prevent vertical expansion
  },
  summaryBadgesContainerTall: {
    maxHeight: 9999, // Allow height to grow for 3+ badges
  },
  summaryBadge: {
    backgroundColor: COLORS.blue[200],
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 4,
    maxWidth: 140,
    justifyContent: 'center',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: COLORS.blue[200],
  },
  summaryBadgeSelected: {
    backgroundColor: COLORS.blue[250],
    borderWidth: 1,
    borderColor: COLORS.blue[400],
  },
  summaryBadgeFirstOfMany: {
    marginTop: -4,
  },
  summaryBadgeLastOfMany: {
    marginBottom: -4,
  },
  summaryBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 1,
  },
  summaryBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 4,
  },
  summaryBadgeDropsetIndicator: {
    width: 2,
    height: 14,
    backgroundColor: COLORS.slate[500],
    borderRadius: 1,
  },
  summaryBadgeItemText: {
    fontSize: 14,
    fontWeight: '600',
    includeFontPadding: false,
  },
  summaryMenuButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -14, // Match inlineSetGroupMenuButton margin
  },
  setGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
    paddingLeft: 50,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.blue[150],
    position: 'relative',
    zIndex: 1000,
  },
  setGroupRowLast: {
    borderBottomWidth: 0,
  },
  setGroupExerciseName: {
    fontSize: 15,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: COLORS.slate[350],
  },
  setGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  dropsetIndicator: {
    width: 3,
    backgroundColor: COLORS.slate[500],
    position: 'absolute',
    left: -12,
    top: 0,
    bottom: 0,
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
  setGroupControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    zIndex: 1,
  },
  setGroupControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setGroupControlButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  setGroupMenuButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'transparent',
    marginRight: -6,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalMenuContainer: {
    position: 'absolute',
  },
  modalMenu: {
    backgroundColor: defaultPopupStyles.container.backgroundColor,
    borderRadius: defaultPopupStyles.container.borderRadius,
    minWidth: defaultPopupStyles.container.minWidth,
    shadowColor: defaultPopupStyles.container.shadowColor,
    shadowOffset: defaultPopupStyles.container.shadowOffset,
    shadowOpacity: defaultPopupStyles.container.shadowOpacity,
    shadowRadius: defaultPopupStyles.container.shadowRadius,
    elevation: defaultPopupStyles.container.elevation,
    zIndex: defaultPopupStyles.container.zIndex,
    borderWidth: defaultPopupStyles.container.borderWidth,
    borderColor: defaultPopupStyles.container.borderColor,
    overflow: 'hidden',
  },
  menuToggleRow: {
    flexDirection: defaultPopupStyles.optionToggleRow.flexDirection as 'row',
    padding: defaultPopupStyles.optionToggleRow.padding,
    margin: defaultPopupStyles.optionToggleRow.margin,
    borderRadius: defaultPopupStyles.optionToggleRow.borderRadius,
    borderBottomWidth: defaultPopupStyles.optionToggleRow.borderBottomWidth,
    borderBottomColor: defaultPopupStyles.optionToggleRow.borderBottomColor,
    flexShrink: defaultPopupStyles.optionToggleRow.flexShrink,
    flexWrap: defaultPopupStyles.optionToggleRow.flexWrap as 'nowrap',
    opacity: defaultPopupStyles.optionToggleRow.opacity,
  },
  menuToggleButtonsWrapper: {
    flexDirection: defaultPopupStyles.optionToggleButtonsWrapper.flexDirection as 'row',
    backgroundColor: defaultPopupStyles.optionToggleButtonsWrapper.backgroundColor,
    padding: defaultPopupStyles.optionToggleButtonsWrapper.padding,
    margin: defaultPopupStyles.optionToggleButtonsWrapper.margin,
    flex: defaultPopupStyles.optionToggleButtonsWrapper.flex,
    width: defaultPopupStyles.optionToggleButtonsWrapper.width as '100%',
    borderRadius: defaultPopupStyles.optionToggleButtonsWrapper.borderRadius,
    opacity: defaultPopupStyles.optionToggleButtonsWrapper.opacity,
  },
  menuToggleOption: {
    flex: defaultPopupStyles.optionToggleButton.flex,
    paddingVertical: defaultPopupStyles.optionToggleButton.paddingVertical,
    alignItems: defaultPopupStyles.optionToggleButton.alignItems as 'center',
    justifyContent: defaultPopupStyles.optionToggleButton.justifyContent as 'center',
    borderRadius: defaultPopupStyles.optionToggleButton.borderRadius,
    minHeight: defaultPopupStyles.optionToggleButton.minHeight,
  },
  menuToggleOptionInactive: {
    ...defaultPopupStyles.optionToggleButtonUnselected,
  },
  menuToggleOptionActiveWarmup: {
    ...defaultPopupStyles.optionToggleButtonSelected,
    ...defaultPopupStyles.optionToggleButtonSelectedWarmup,
  },
  menuToggleOptionActiveFailure: {
    ...defaultPopupStyles.optionToggleButtonSelected,
    ...defaultPopupStyles.optionToggleButtonSelectedFailure,
  },
  menuToggleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuToggleOptionText: {
    fontSize: defaultPopupStyles.optionToggleText.fontSize,
    fontWeight: 'bold' as const,
    flexShrink: defaultPopupStyles.optionToggleText.flexShrink,
  },
  menuToggleOptionTextInactive: {
    ...defaultPopupStyles.optionToggleTextUnselected,
  },
  menuToggleOptionTextActive: {
    ...defaultPopupStyles.optionToggleTextSelected,
  },
  menuItem: {
    ...defaultPopupStyles.option,
    ...defaultPopupStyles.optionBackground,
  },
  menuItemActive: {
    ...defaultPopupStyles.optionBackgroundActive,
  },
  menuItemText: {
    fontSize: defaultPopupStyles.optionText.fontSize,
    fontWeight: '600' as const,
    color: defaultPopupStyles.optionText.color,
    flexShrink: defaultPopupStyles.optionText.flexShrink,
  },
  menuItemContent: {
    flexDirection: defaultPopupStyles.optionContent.flexDirection as 'row',
    alignItems: defaultPopupStyles.optionContent.alignItems as 'center',
    gap: defaultPopupStyles.optionContent.gap,
    flexShrink: defaultPopupStyles.optionContent.flexShrink,
    flexWrap: defaultPopupStyles.optionContent.flexWrap as 'nowrap',
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
    backgroundColor: COLORS.slate[500],
    position: 'absolute',
    left: -6,
    top: -1,
    bottom: -1,
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
    gap: 4,
  },
  inlineSetGroupControlButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineSetGroupMenuButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'transparent',
    marginRight: -14,
    alignItems: 'center',
    justifyContent: 'center',
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
  summaryPopupContainer: {
    position: 'absolute',
    backgroundColor: defaultPopupStyles.container.backgroundColor,
    borderRadius: defaultPopupStyles.container.borderRadius,
    minWidth: defaultPopupStyles.container.minWidth,
    shadowColor: defaultPopupStyles.container.shadowColor,
    shadowOffset: defaultPopupStyles.container.shadowOffset,
    shadowOpacity: defaultPopupStyles.container.shadowOpacity,
    shadowRadius: defaultPopupStyles.container.shadowRadius,
    elevation: defaultPopupStyles.container.elevation,
    zIndex: defaultPopupStyles.container.zIndex,
    borderWidth: defaultPopupStyles.container.borderWidth,
    borderColor: defaultPopupStyles.container.borderColor,
    overflow: 'hidden',
  },
  summaryPopupOptionRow: {
    flexDirection: defaultPopupStyles.optionRow.flexDirection as 'row',
    alignItems: defaultPopupStyles.optionRow.alignItems as 'stretch',
    padding: defaultPopupStyles.optionRow.padding,
    borderBottomWidth: defaultPopupStyles.optionRow.borderBottomWidth,
    borderBottomColor: defaultPopupStyles.optionRow.borderBottomColor,
    flexShrink: defaultPopupStyles.optionRow.flexShrink,
    flexWrap: defaultPopupStyles.optionRow.flexWrap as 'nowrap',
  },
  summaryPopupOptionInRow: {
    ...defaultPopupStyles.optionInRow,
    ...defaultPopupStyles.optionBackground,
  },
  summaryPopupOptionInRowFlex: {
    ...defaultPopupStyles.optionFlex,
  },
  summaryPopupOptionInRowWithBorder: {
    ...defaultPopupStyles.optionRowWithBorder,
  },
  summaryPopupOptionIconOnly: {
    ...defaultPopupStyles.iconOnlyOption,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryPopupOptionContent: {
    flexDirection: defaultPopupStyles.optionContent.flexDirection as 'row',
    alignItems: defaultPopupStyles.optionContent.alignItems as 'center',
    gap: defaultPopupStyles.optionContent.gap,
    flexShrink: defaultPopupStyles.optionContent.flexShrink,
    flexWrap: defaultPopupStyles.optionContent.flexWrap as 'nowrap',
  },
  summaryPopupOptionText: {
    fontSize: defaultPopupStyles.optionText.fontSize,
    fontWeight: '600' as const,
    color: defaultPopupStyles.optionText.color,
    flexShrink: defaultPopupStyles.optionText.flexShrink,
  },
});

export default SelectedInGlossary;
