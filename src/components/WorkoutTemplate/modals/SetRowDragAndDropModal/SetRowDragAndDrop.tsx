import React, { useCallback, useMemo, useRef, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { RenderItemParams } from 'react-native-draggable-flatlist';
import { GripVertical, Timer, TrendingDown, Check, Square } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import SwipeToDelete from '@/components/common/SwipeToDelete';
import type { SetDragListItem, SetDragItem, DropSetHeaderItem, DropSetFooterItem } from '../../hooks/useSetDragAndDrop';
import type { Set, Exercise } from '@/types/workout';

// Extended types for collapse functionality
export interface CollapsibleSetDragItem extends SetDragItem {
    isCollapsed?: boolean;
}

export interface CollapsibleDropSetHeaderItem extends DropSetHeaderItem {
    isCollapsed?: boolean;
}

export interface CollapsibleDropSetFooterItem extends DropSetFooterItem {
    isCollapsed?: boolean;
}

export type CollapsibleSetDragListItem = CollapsibleSetDragItem | CollapsibleDropSetHeaderItem | CollapsibleDropSetFooterItem;

// Determine which selection mode is active for simpler prop passing
type SelectionMode = 'restTimer' | 'warmup' | 'failure' | 'dropset' | null;

// Props for the memoized row component - use primitive/stable types for effective memoization
interface SetRowItemProps {
    set: Set;
    setId: string;
    displayIndexText: string;
    isSubIndex: boolean;
    isActive: boolean;
    isDragging: boolean;
    category: string;
    weightUnit: string;
    hasRestTimer: boolean;
    // Selection state - primitives only
    selectionMode: SelectionMode;
    isSelected: boolean;
    isUngroupedSet: boolean;
    // Trash state
    showTrash: boolean;
    // Timer preview (only set for the row being edited)
    timerPreviewFormatted: string | null;
    // Drag function
    drag: () => void;
    // Stable callbacks (must be memoized via useRef in parent)
    onDelete: () => void;
    onShowTrash: () => void;
    onCloseTrash: () => void;
    onToggleSelection: () => void;
    onCycleSetType: () => void;
    onOpenRestTimerInput: () => void;
    onToggleDropset: () => void;
    // Badge ref callback
    onBadgeRef: (ref: View | null) => void;
}

// Memoized row component - only re-renders when its specific props change
const SetRowItem = memo(function SetRowItem({
    set,
    setId,
    displayIndexText,
    isSubIndex,
    isActive,
    isDragging,
    category,
    weightUnit,
    hasRestTimer,
    selectionMode,
    isSelected,
    isUngroupedSet,
    showTrash,
    timerPreviewFormatted,
    drag,
    onDelete,
    onShowTrash,
    onCloseTrash,
    onToggleSelection,
    onCycleSetType,
    onOpenRestTimerInput,
    onToggleDropset,
    onBadgeRef,
}: SetRowItemProps) {
    const isInSelectionMode = selectionMode !== null;
    
    // Determine checkbox color based on mode
    const getCheckboxColor = () => {
        switch (selectionMode) {
            case 'restTimer': return COLORS.blue[600];
            case 'warmup': return COLORS.orange[600];
            case 'failure': return COLORS.red[600];
            case 'dropset': return COLORS.indigo[600];
            default: return COLORS.blue[600];
        }
    };

    // Timer display value
    const getTimerDisplayValue = () => {
        if (timerPreviewFormatted && isSelected) {
            return timerPreviewFormatted;
        }
        if (hasRestTimer && set.restPeriodSeconds) {
            // Format inline - caller should provide formatted value ideally
            const mins = Math.floor(set.restPeriodSeconds / 60);
            const secs = set.restPeriodSeconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
        return 'rest';
    };

    const hasPreviewValue = timerPreviewFormatted !== null && isSelected;
    const showTimerIcon = hasPreviewValue || hasRestTimer;

    return (
        <SwipeToDelete
            onDelete={onDelete}
            disabled={isActive || isInSelectionMode || isDragging}
            itemId={setId}
            isTrashVisible={showTrash}
            onShowTrash={onShowTrash}
            onCloseTrash={onCloseTrash}
            trashBackgroundColor={COLORS.red[500]}
            trashIconColor="#ffffff"
        >
            <TouchableOpacity
                onLongPress={drag}
                delayLongPress={100}
                disabled={isActive}
                activeOpacity={1}
                onPress={isInSelectionMode ? onToggleSelection : undefined}
                style={[
                    styles.dragItem,
                    isActive && styles.dragItem__active,
                    isSelected && selectionMode === 'warmup' && styles.dragItem__selectedWarmup,
                    isSelected && selectionMode === 'failure' && styles.dragItem__selectedFailure,
                    isSelected && selectionMode === 'dropset' && styles.dragItem__selectedDropset,
                    isSelected && selectionMode === 'restTimer' && styles.dragItem__selected,
                    set.dropSetId && styles.dragItem__dropset,
                ]}
            >
                <View ref={onBadgeRef}>
                    <TouchableOpacity
                        style={[
                            styles.setIndexBadge,
                            set.isWarmup && styles.setIndexBadge__warmup,
                            set.isFailure && styles.setIndexBadge__failure,
                        ]}
                        onPress={(e) => {
                            e.stopPropagation();
                            onCycleSetType();
                        }}
                    >
                        {isSubIndex ? (
                            <Text style={[
                                styles.setIndexText__groupSub,
                                set.isWarmup && styles.setIndexText__groupSub__warmup,
                                set.isFailure && styles.setIndexText__groupSub__failure,
                            ]}>
                                {displayIndexText}
                            </Text>
                        ) : (
                            <Text style={[
                                styles.setIndexText,
                                set.isWarmup && styles.setIndexText__warmup,
                                set.isFailure && styles.setIndexText__failure,
                            ]}>
                                {displayIndexText}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.setInfo}>
                    {category === 'Lifts' ? (
                        <Text style={styles.setInfoText}>
                            {set.weight || '-'} {weightUnit} × {set.reps || '-'}
                        </Text>
                    ) : category === 'Cardio' ? (
                        <Text style={styles.setInfoText}>
                            {set.duration || '-'} / {set.distance || '-'}
                        </Text>
                    ) : (
                        <Text style={styles.setInfoText}>
                            {set.reps || '-'} reps
                        </Text>
                    )}
                </View>

                {selectionMode === 'restTimer' ? (
                    <View style={styles.restTimerAndCheckboxContainer}>
                        <View
                            style={[
                                styles.restTimerBadge,
                                !hasRestTimer && styles.restTimerBadge__add,
                                hasRestTimer 
                                    ? styles.restTimerBadge__disabled__withTimer 
                                    : styles.restTimerBadge__disabled__noTimer
                            ]}
                        >
                            <Timer 
                                size={12} 
                                color={showTimerIcon ? COLORS.blue[500] : 'transparent'} 
                            />
                            <Text style={[
                                styles.restTimerText,
                                !hasRestTimer && !hasPreviewValue && styles.restTimerText__add,
                                (hasRestTimer || hasPreviewValue)
                                    ? styles.restTimerText__disabledWithTimer 
                                    : styles.restTimerText__disabled__noTimer
                            ]}>
                                {getTimerDisplayValue()}
                            </Text>
                        </View>
                        <View style={styles.checkboxContainer}>
                            {isSelected ? (
                                <Check size={20} color={COLORS.blue[600]} strokeWidth={3} />
                            ) : (
                                <Square size={20} color={COLORS.slate[400]} />
                            )}
                        </View>
                    </View>
                ) : selectionMode === 'warmup' || selectionMode === 'failure' || selectionMode === 'dropset' ? (
                    <View style={styles.checkboxContainer}>
                        {selectionMode === 'dropset' && !isUngroupedSet ? (
                            <View style={{ width: 20, height: 20 }} />
                        ) : isSelected ? (
                            <Check size={20} color={getCheckboxColor()} strokeWidth={3} />
                        ) : (
                            <Square size={20} color={COLORS.slate[400]} />
                        )}
                    </View>
                ) : (
                    <>
                        <TouchableOpacity
                            onPress={(e) => {
                                e.stopPropagation();
                                onToggleDropset();
                            }}
                            style={styles.dropsetIconButton}
                        >
                            <TrendingDown 
                                size={14} 
                                color={set.dropSetId ? COLORS.indigo[600] : COLORS.slate[400]} 
                            />
                        </TouchableOpacity>
                        {set.completed && (
                            <View style={styles.completedIndicatorWrapper}>
                                <Check size={14} color={COLORS.green[500]} />
                            </View>
                        )}

                        <TouchableOpacity
                            onPress={onOpenRestTimerInput}
                            style={[
                                styles.restTimerBadge,
                                !set.restPeriodSeconds && styles.restTimerBadge__add
                            ]}
                        >
                            <Timer size={12} color={set.restPeriodSeconds ? COLORS.blue[500] : COLORS.slate[400]} />
                            <Text style={[
                                styles.restTimerText,
                                !set.restPeriodSeconds && styles.restTimerText__add
                            ]}>
                                {getTimerDisplayValue()}
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                {set.dropSetId && !isActive && (
                    <View style={styles.dropSetIndicator} />
                )}
            </TouchableOpacity>
        </SwipeToDelete>
    );
});

interface SetRowDragAndDropProps {
    localDragItems: CollapsibleSetDragListItem[];
    collapsedDropsetId: string | null;
    isDragging: boolean;
    exercise: Exercise | null;
    addTimerMode: boolean;
    restTimerInputOpen: boolean; // true when rest timer keyboard/popup is open (show selected styling for pre-selected sets)
    restTimerSelectedSetIds: globalThis.Set<string>;
    restTimerInputString: string; // current input value from the timer keyboard
    warmupMode: boolean;
    warmupSelectedSetIds: globalThis.Set<string>;
    failureMode: boolean;
    failureSelectedSetIds: globalThis.Set<string>;
    dropsetMode: boolean;
    dropsetSelectedSetIds: globalThis.Set<string>;
    swipedItemId: string | null;
    setRestTimerInput: (input: { setId: string; currentValue: string } | null) => void;
    setRestTimerInputString: (value: string) => void;
    setRestTimerSelectedSetIds: (ids: globalThis.Set<string>) => void;
    setWarmupSelectedSetIds: (ids: globalThis.Set<string>) => void;
    setFailureSelectedSetIds: (ids: globalThis.Set<string>) => void;
    setDropsetSelectedSetIds: (ids: globalThis.Set<string>) => void;
    setSwipedItemId: (id: string | null) => void;
    handleDeleteSet: (setId: string) => void;
    closeTrashIcon: () => void;
    initiateDropsetDrag: (dropsetId: string, drag: () => void) => void;
    onUpdateSet: (setId: string, updates: Partial<Set>) => void;
    handleUngroupDropset: (setId: string) => void;
    handleEnterDropsetMode: () => void;
    badgeRefs: React.MutableRefObject<Map<string, View>>;
    modalContainerRef: React.RefObject<View>;
    formatRestTime: (seconds: number) => string;
    parseRestTimeInput: (input: string) => number; // function to parse input string to seconds
}

export const useSetRowDragAndDrop = ({
    localDragItems,
    collapsedDropsetId,
    isDragging,
    exercise,
    addTimerMode,
    restTimerInputOpen,
    restTimerSelectedSetIds,
    restTimerInputString,
    warmupMode,
    warmupSelectedSetIds,
    failureMode,
    failureSelectedSetIds,
    dropsetMode,
    dropsetSelectedSetIds,
    swipedItemId,
    setRestTimerInput,
    setRestTimerInputString,
    setRestTimerSelectedSetIds,
    setWarmupSelectedSetIds,
    setFailureSelectedSetIds,
    setDropsetSelectedSetIds,
    setSwipedItemId,
    handleDeleteSet,
    closeTrashIcon,
    initiateDropsetDrag,
    onUpdateSet,
    handleUngroupDropset,
    handleEnterDropsetMode,
    badgeRefs,
    modalContainerRef,
    formatRestTime,
    parseRestTimeInput,
}: SetRowDragAndDropProps) => {
    // Type guard functions
    const isSetDragItem = (item: CollapsibleSetDragListItem): item is CollapsibleSetDragItem => {
        return 'type' in item && item.type === 'set';
    };

    const isDropSetHeaderItem = (item: CollapsibleSetDragListItem): item is CollapsibleDropSetHeaderItem => {
        return 'type' in item && item.type === 'dropset_header';
    };

    const isDropSetFooterItem = (item: CollapsibleSetDragListItem): item is CollapsibleDropSetFooterItem => {
        return 'type' in item && item.type === 'dropset_footer';
    };

    // Pre-compute display indices for all sets in a single O(n) pass
    // This avoids O(n^2) computation when each row computes its own index
    const displayIndexMap = useMemo(() => {
        const map = new Map<string, { displayIndexText: string; isSubIndex: boolean }>();
        const allSets = localDragItems.filter(isSetDragItem);
        
        // Track group numbers and dropset positions
        let groupNumber = 0;
        const seenDropSetIds = new Set<string>();
        const dropsetFirstGroupNumber = new Map<string, number>();
        const dropsetSetIndices = new Map<string, number>(); // count within each dropset
        
        for (let i = 0; i < allSets.length; i++) {
            const setItem = allSets[i];
            const set = setItem.set;
            
            if (set.dropSetId) {
                // Track which dropset we're in
                if (!seenDropSetIds.has(set.dropSetId)) {
                    seenDropSetIds.add(set.dropSetId);
                    groupNumber++;
                    dropsetFirstGroupNumber.set(set.dropSetId, groupNumber);
                    dropsetSetIndices.set(set.dropSetId, 0);
                }
                
                // Increment index within dropset
                const currentDropsetIndex = (dropsetSetIndices.get(set.dropSetId) ?? 0) + 1;
                dropsetSetIndices.set(set.dropSetId, currentDropsetIndex);
                
                const baseGroupNumber = dropsetFirstGroupNumber.get(set.dropSetId)!;
                
                if (currentDropsetIndex === 1) {
                    // First set in dropset: show primary index
                    map.set(set.id, { displayIndexText: baseGroupNumber.toString(), isSubIndex: false });
                } else {
                    // Subsequent sets: show subIndex with "."
                    map.set(set.id, { displayIndexText: `.${currentDropsetIndex}`, isSubIndex: true });
                }
            } else {
                // Not in a dropset
                groupNumber++;
                map.set(set.id, { displayIndexText: groupNumber.toString(), isSubIndex: false });
            }
        }
        
        return map;
    }, [localDragItems]);

    // Pre-compute timer preview so only the previewed row updates on keystroke
    const timerPreview = useMemo(() => {
        if (!restTimerInputString || !restTimerInputOpen) return null;
        const seconds = parseRestTimeInput(restTimerInputString);
        if (seconds <= 0) return null;
        return { seconds, formatted: formatRestTime(seconds) };
    }, [restTimerInputString, restTimerInputOpen, parseRestTimeInput, formatRestTime]);

    // Determine current selection mode as a stable value
    const currentSelectionMode: SelectionMode = useMemo(() => {
        if (addTimerMode || restTimerInputOpen) return 'restTimer';
        if (warmupMode) return 'warmup';
        if (failureMode) return 'failure';
        if (dropsetMode) return 'dropset';
        return null;
    }, [addTimerMode, restTimerInputOpen, warmupMode, failureMode, dropsetMode]);

    // Stable callback refs - update refs synchronously, create stable wrappers
    const handleDeleteSetRef = useRef(handleDeleteSet);
    handleDeleteSetRef.current = handleDeleteSet;
    
    const closeTrashIconRef = useRef(closeTrashIcon);
    closeTrashIconRef.current = closeTrashIcon;
    
    const setSwipedItemIdRef = useRef(setSwipedItemId);
    setSwipedItemIdRef.current = setSwipedItemId;
    
    const onUpdateSetRef = useRef(onUpdateSet);
    onUpdateSetRef.current = onUpdateSet;
    
    const handleUngroupDropsetRef = useRef(handleUngroupDropset);
    handleUngroupDropsetRef.current = handleUngroupDropset;
    
    const handleEnterDropsetModeRef = useRef(handleEnterDropsetMode);
    handleEnterDropsetModeRef.current = handleEnterDropsetMode;
    
    const setRestTimerInputRef = useRef(setRestTimerInput);
    setRestTimerInputRef.current = setRestTimerInput;
    
    const setRestTimerInputStringRef = useRef(setRestTimerInputString);
    setRestTimerInputStringRef.current = setRestTimerInputString;
    
    const setRestTimerSelectedSetIdsRef = useRef(setRestTimerSelectedSetIds);
    setRestTimerSelectedSetIdsRef.current = setRestTimerSelectedSetIds;
    
    const setWarmupSelectedSetIdsRef = useRef(setWarmupSelectedSetIds);
    setWarmupSelectedSetIdsRef.current = setWarmupSelectedSetIds;
    
    const setFailureSelectedSetIdsRef = useRef(setFailureSelectedSetIds);
    setFailureSelectedSetIdsRef.current = setFailureSelectedSetIds;
    
    const setDropsetSelectedSetIdsRef = useRef(setDropsetSelectedSetIds);
    setDropsetSelectedSetIdsRef.current = setDropsetSelectedSetIds;

    const renderDropSetHeader = useCallback((
        item: CollapsibleDropSetHeaderItem,
        drag?: () => void,
        isActive?: boolean
    ) => {
        const dropSetId = item.dropSetId;
        const isCollapsed = item.isCollapsed || collapsedDropsetId === dropSetId;
        const isDraggedDropset = collapsedDropsetId === dropSetId;
        const shouldRenderGhosts = isCollapsed && !isDraggedDropset;
        const isActivelyDragging = isActive && isDraggedDropset;

        // Get all sets in this dropset for ghost rendering
        const dropsetSets = localDragItems.filter(
            (i): i is CollapsibleSetDragItem => isSetDragItem(i) && i.set.dropSetId === dropSetId
        );

        return (
                <TouchableOpacity
                    onLongPress={() => initiateDropsetDrag(dropSetId, drag!)}
                    disabled={isActive}
                    delayLongPress={150}
                    activeOpacity={1}
                    style={[
                        styles.dropsetHeaderContainer,
                        isActive && styles.dropsetHeaderContainer__active,
                        isDraggedDropset && styles.dropsetHeaderContainer__collapsed,
                    ]}
                >
                    <View
                        style={[
                            styles.dropsetHeader,
                            isDragging && styles.dropsetHeader__dragging,
                            isDraggedDropset && styles.dropsetHeader__collapsed,
                            isActivelyDragging && styles.dropsetHeader__activelyDragging,
                            shouldRenderGhosts && styles.ghostDropsetHeader,
                        ]}
                    >
                        {!isDraggedDropset && <View style={styles.dropSetIndicatorHeader} />}
                        <View style={styles.dropsetHeaderContent}>
                            <View style={styles.dropsetHeaderLeft}>
                                <Text style={styles.dropsetHeaderText}>Dropset ({item.setCount} sets)</Text>
                            {isDraggedDropset && (
                                <View style={styles.dropsetHeaderLine} />
                            )}
                        </View>
                        {!isDraggedDropset && (
                            <GripVertical size={16} color={COLORS.indigo[700]} />
                        )}
                    </View>
                </View>

                {/* Render ghost items when collapsed but not being dragged */}
                {shouldRenderGhosts && (
                    <View>
                        {dropsetSets.map((setItem, index) => {
                            const indexInfo = displayIndexMap.get(setItem.set.id) ?? { displayIndexText: '·', isSubIndex: false };
                            return (
                            <View
                                key={setItem.id}
                                style={[
                                    styles.ghostItem,
                                    index === 0 && styles.ghostItem__first,
                                    index === dropsetSets.length - 1 && styles.ghostItem__last,
                                ]}
                            >
                                <View style={styles.dropSetIndicator} />
                                <View style={styles.ghostItemContent}>
                                    <View style={styles.setIndexBadge}>
                                        <Text style={indexInfo.isSubIndex ? styles.setIndexText__groupSub : styles.setIndexText}>
                                            {indexInfo.displayIndexText}
                                        </Text>
                                    </View>
                                    <Text style={styles.ghostItemText}>
                                        {setItem.set.weight || '-'} × {setItem.set.reps || '-'}
                                    </Text>
                                </View>
                            </View>
                            );
                        })}
                        {/* Ghost footer */}
                        <View style={[styles.dropsetFooter, styles.ghostDropsetFooter]}>
                            <View style={styles.dropSetIndicatorFooter} />
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [isDragging, collapsedDropsetId, localDragItems, initiateDropsetDrag, displayIndexMap]);

    const renderDropSetFooter = useCallback((item: CollapsibleDropSetFooterItem) => {
        const dropSetId = item.dropSetId;
        const isCollapsed = item.isCollapsed || collapsedDropsetId === dropSetId;

        // If collapsed, don't render (it's shown in the header ghost)
        if (isCollapsed) {
            return <View style={styles.hiddenItem} />;
        }

        return (
            <View
                style={[
                    styles.dropsetFooter,
                    isDragging && styles.dropsetFooter__dragging
                ]}
                pointerEvents="box-none"
            >
                <View style={styles.dropSetIndicatorFooter} />
            </View>
        );
    }, [isDragging, collapsedDropsetId]);

    const renderDragItem = useCallback(({ item, drag, isActive }: RenderItemParams<CollapsibleSetDragListItem>) => {
        // Handle dropset headers - now draggable
        if (isDropSetHeaderItem(item)) {
            return renderDropSetHeader(item, drag, isActive);
        }
        if (isDropSetFooterItem(item)) {
            return renderDropSetFooter(item);
        }

        // Handle regular sets - TypeScript now knows this is a CollapsibleSetDragItem
        if (!isSetDragItem(item)) {
            return null;
        }

        // At this point, TypeScript knows item is CollapsibleSetDragItem
        const setItemData: CollapsibleSetDragItem = item;

        // Handle collapsed sets - render hidden
        const isCollapsed = setItemData.isCollapsed || (setItemData.set.dropSetId && collapsedDropsetId === setItemData.set.dropSetId);
        if (isCollapsed) {
            return <View style={styles.hiddenItem} />;
        }

        const set = setItemData.set;
        const setId = set.id;
        const category = exercise?.category || 'Lifts';
        const weightUnit = exercise?.weightUnit || 'lbs';

        // Use pre-computed display index from useMemo (O(1) lookup vs O(n) computation)
        const indexInfo = displayIndexMap.get(setId) ?? { displayIndexText: '?', isSubIndex: false };

        // Compute selection state for this specific row
        const isSelected = currentSelectionMode === 'restTimer' && restTimerSelectedSetIds.has(setId)
            || currentSelectionMode === 'warmup' && warmupSelectedSetIds.has(setId)
            || currentSelectionMode === 'failure' && failureSelectedSetIds.has(setId)
            || currentSelectionMode === 'dropset' && dropsetSelectedSetIds.has(setId);

        const showTrash = swipedItemId === setId;
        const isUngroupedSet = !set.dropSetId;

        // Timer preview - only applies to selected sets in rest timer mode
        const showTimerPreview = currentSelectionMode === 'restTimer' && isSelected && timerPreview;

        // Create stable callbacks using refs (these never change reference)
        const handleDelete = () => handleDeleteSetRef.current(setId);
        const handleShowTrash = () => setSwipedItemIdRef.current(setId);
        const handleCloseTrash = () => closeTrashIconRef.current();
        
        const handleToggleSelection = () => {
            // Close trash if visible
            if (swipedItemId) {
                closeTrashIconRef.current();
            }
            
            // Handle selection based on current mode
            if (currentSelectionMode === 'restTimer') {
                const newSet = new globalThis.Set(restTimerSelectedSetIds);
                if (newSet.has(setId)) {
                    newSet.delete(setId);
                } else {
                    newSet.add(setId);
                }
                setRestTimerSelectedSetIdsRef.current(newSet);
            } else if (currentSelectionMode === 'warmup') {
                const newSet = new globalThis.Set(warmupSelectedSetIds);
                if (newSet.has(setId)) {
                    newSet.delete(setId);
                } else {
                    newSet.add(setId);
                }
                setWarmupSelectedSetIdsRef.current(newSet);
            } else if (currentSelectionMode === 'failure') {
                const newSet = new globalThis.Set(failureSelectedSetIds);
                if (newSet.has(setId)) {
                    newSet.delete(setId);
                } else {
                    newSet.add(setId);
                }
                setFailureSelectedSetIdsRef.current(newSet);
            } else if (currentSelectionMode === 'dropset' && isUngroupedSet) {
                const newSet = new globalThis.Set(dropsetSelectedSetIds);
                if (newSet.has(setId)) {
                    newSet.delete(setId);
                } else {
                    newSet.add(setId);
                }
                setDropsetSelectedSetIdsRef.current(newSet);
            }
        };

        const handleCycleSetType = () => {
            if (set.isWarmup) {
                onUpdateSetRef.current(setId, { isWarmup: false, isFailure: true });
            } else if (set.isFailure) {
                onUpdateSetRef.current(setId, { isFailure: false, isWarmup: false });
            } else {
                onUpdateSetRef.current(setId, { isWarmup: true, isFailure: false });
            }
        };

        const handleOpenRestTimerInput = () => {
            const currentValue = set.restPeriodSeconds ? set.restPeriodSeconds.toString() : '';
            setRestTimerInputStringRef.current(currentValue);
            setRestTimerInputRef.current({ setId, currentValue });
        };

        const handleToggleDropset = () => {
            if (set.dropSetId) {
                handleUngroupDropsetRef.current(setId);
            } else {
                const newSet = new globalThis.Set<string>();
                newSet.add(setId);
                setDropsetSelectedSetIdsRef.current(newSet);
                handleEnterDropsetModeRef.current();
            }
        };

        const handleBadgeRef = (ref: View | null) => {
            if (ref) {
                badgeRefs.current.set(setId, ref);
            } else {
                badgeRefs.current.delete(setId);
            }
        };

        return (
            <SetRowItem
                set={set}
                setId={setId}
                displayIndexText={indexInfo.displayIndexText}
                isSubIndex={indexInfo.isSubIndex}
                isActive={isActive}
                isDragging={isDragging}
                category={category}
                weightUnit={weightUnit}
                hasRestTimer={!!set.restPeriodSeconds}
                selectionMode={currentSelectionMode}
                isSelected={isSelected}
                isUngroupedSet={isUngroupedSet}
                showTrash={showTrash}
                timerPreviewFormatted={showTimerPreview ? timerPreview.formatted : null}
                drag={drag}
                onDelete={handleDelete}
                onShowTrash={handleShowTrash}
                onCloseTrash={handleCloseTrash}
                onToggleSelection={handleToggleSelection}
                onCycleSetType={handleCycleSetType}
                onOpenRestTimerInput={handleOpenRestTimerInput}
                onToggleDropset={handleToggleDropset}
                onBadgeRef={handleBadgeRef}
            />
        );
    }, [
        // Minimal dependencies - only what's needed to compute row props
        exercise?.category, exercise?.weightUnit,
        displayIndexMap,
        renderDropSetHeader, renderDropSetFooter,
        currentSelectionMode,
        restTimerSelectedSetIds, warmupSelectedSetIds, failureSelectedSetIds, dropsetSelectedSetIds,
        collapsedDropsetId,
        swipedItemId,
        isDragging,
        timerPreview,
        badgeRefs,
    ]);

    const keyExtractor = useCallback((item: CollapsibleSetDragListItem) => {
        if (isSetDragItem(item) || isDropSetHeaderItem(item) || isDropSetFooterItem(item)) {
            return item.id;
        }
        return '';
    }, []);

    return {
        renderDragItem,
        renderDropSetHeader,
        renderDropSetFooter,
        keyExtractor,
    };
};

// Type guard functions for helper functions
const isSetDragItemHelper = (item: CollapsibleSetDragListItem): item is CollapsibleSetDragItem => {
    return 'type' in item && item.type === 'set';
};

const isDropSetHeaderItemHelper = (item: CollapsibleSetDragListItem): item is CollapsibleDropSetHeaderItem => {
    return 'type' in item && item.type === 'dropset_header';
};

const isDropSetFooterItemHelper = (item: CollapsibleSetDragListItem): item is CollapsibleDropSetFooterItem => {
    return 'type' in item && item.type === 'dropset_footer';
};

// Export helper functions for drag-and-drop operations
export const collapseDropset = (items: CollapsibleSetDragListItem[], dropsetId: string): CollapsibleSetDragListItem[] => {
    return items.map(item => {
        if (isSetDragItemHelper(item) && item.set.dropSetId === dropsetId) {
            return { ...item, isCollapsed: true };
        }
        if (isDropSetHeaderItemHelper(item) && item.dropSetId === dropsetId) {
            return { ...item, isCollapsed: true };
        }
        if (isDropSetFooterItemHelper(item) && item.dropSetId === dropsetId) {
            return { ...item, isCollapsed: true };
        }
        return item;
    });
};

export const collapseAllOtherDropsets = (items: CollapsibleSetDragListItem[], draggedDropsetId: string): CollapsibleSetDragListItem[] => {
    const otherDropsetIds = new globalThis.Set<string>();
    items.forEach(item => {
        if (isSetDragItemHelper(item) && item.set.dropSetId && item.set.dropSetId !== draggedDropsetId) {
            otherDropsetIds.add(item.set.dropSetId);
        }
    });

    return items.map(item => {
        if (isSetDragItemHelper(item) && item.set.dropSetId && otherDropsetIds.has(item.set.dropSetId)) {
            return { ...item, isCollapsed: true };
        }
        if (isDropSetHeaderItemHelper(item) && otherDropsetIds.has(item.dropSetId)) {
            return { ...item, isCollapsed: true };
        }
        if (isDropSetFooterItemHelper(item) && otherDropsetIds.has(item.dropSetId)) {
            return { ...item, isCollapsed: true };
        }
        return item;
    });
};

export const expandAllDropsets = (items: CollapsibleSetDragListItem[]): CollapsibleSetDragListItem[] => {
    return items.map(item => {
        if ('isCollapsed' in item && item.isCollapsed) {
            const { isCollapsed, ...rest } = item;
            return rest as CollapsibleSetDragListItem;
        }
        return item;
    });
};

export const reconstructItemsFromSets = (sets: Set[]): CollapsibleSetDragListItem[] => {
    const items: CollapsibleSetDragListItem[] = [];
    const processedDropSetIds = new Set<string>();
    const processedFooterIds = new Set<string>();
    const seenSetIds = new Set<string>(); // Track seen set IDs to prevent duplicates

    // First pass: identify all dropset IDs and their end positions
    const dropsetEndPositions = new Map<string, number>();
    sets.forEach((set, index) => {
        if (set.dropSetId) {
            const isDropSetEnd = index === sets.length - 1 || sets[index + 1]?.dropSetId !== set.dropSetId;
            if (isDropSetEnd) {
                // Store the last end position for this dropset
                dropsetEndPositions.set(set.dropSetId, index);
            }
        }
    });

    sets.forEach((set, index) => {
        // Skip duplicate sets
        if (seenSetIds.has(set.id)) {
            return;
        }
        seenSetIds.add(set.id);

        // Check if this is the start of a new dropset
        const isDropSetStart = set.dropSetId &&
            (index === 0 || sets[index - 1]?.dropSetId !== set.dropSetId);

        // Check if this is the end of a dropset (use the stored end position to ensure uniqueness)
        const isDropSetEnd = set.dropSetId &&
            dropsetEndPositions.has(set.dropSetId) &&
            dropsetEndPositions.get(set.dropSetId) === index;

        // Add dropset header if this is the start
        if (isDropSetStart && set.dropSetId && !processedDropSetIds.has(set.dropSetId)) {
            // Count sets in this dropset
            const dropSetSets = sets.filter(s => s.dropSetId === set.dropSetId);
            const headerItem: CollapsibleDropSetHeaderItem = {
                id: `dropset-header-${set.dropSetId}`,
                type: 'dropset_header',
                dropSetId: set.dropSetId,
                setCount: dropSetSets.length,
            };
            items.push(headerItem);
            processedDropSetIds.add(set.dropSetId);
        }

        // Add the set itself
        const setItem: CollapsibleSetDragItem = {
            id: set.id,
            type: 'set',
            set,
            hasRestTimer: !!set.restPeriodSeconds,
        };
        items.push(setItem);

        // Add dropset footer if this is the end and we haven't added a footer for this dropset yet
        if (isDropSetEnd && set.dropSetId && !processedFooterIds.has(set.dropSetId)) {
            const footerItem: CollapsibleDropSetFooterItem = {
                id: `dropset-footer-${set.dropSetId}`,
                type: 'dropset_footer',
                dropSetId: set.dropSetId,
            };
            items.push(footerItem);
            processedFooterIds.add(set.dropSetId);
        }
    });

    return items;
};

export const createHandleLocalDragEnd = (
    collapsedDropsetId: string | null,
    setCollapsedDropsetId: (id: string | null) => void,
    setLocalDragItems: (items: CollapsibleSetDragListItem[]) => void,
    onDragEnd: (params: { data: SetDragListItem[]; from: number; to: number }) => void,
    pendingDragRef: React.MutableRefObject<(() => void) | null>,
    onDropsetDragComplete?: () => void
) => {
    return ({ data, from, to }: { data: CollapsibleSetDragListItem[]; from: number; to: number }) => {
        let updatedData = data;

        // If a dropset was collapsed (dragging a dropset as a group)
        if (collapsedDropsetId) {
            const draggedDropsetId = collapsedDropsetId;

            // Collect all items that belong to the dragged dropset (sets and footer)
            const dropsetSets = data.filter(
                (item): item is CollapsibleSetDragItem =>
                    isSetDragItemHelper(item) && item.set.dropSetId === draggedDropsetId
            );
            const dropsetFooter = data.find(
                (item): item is CollapsibleDropSetFooterItem =>
                    isDropSetFooterItemHelper(item) && item.dropSetId === draggedDropsetId
            );

            // Collect all OTHER items (not part of the dragged dropset, except the header which stays in place)
            const otherItems = data.filter(item => {
                if (isDropSetHeaderItemHelper(item) && item.dropSetId === draggedDropsetId) {
                    return true; // Keep header in its new position
                }
                if (isSetDragItemHelper(item) && item.set.dropSetId === draggedDropsetId) {
                    return false; // Remove sets (we'll re-insert them)
                }
                if (isDropSetFooterItemHelper(item) && item.dropSetId === draggedDropsetId) {
                    return false; // Remove footer (we'll re-insert it)
                }
                return true; // Keep all other items
            });

            // Find where the header is in the otherItems array
            const headerIndexInOthers = otherItems.findIndex(
                (item): item is CollapsibleDropSetHeaderItem =>
                    isDropSetHeaderItemHelper(item) && item.dropSetId === draggedDropsetId
            );

            // Insert sets right after header, then footer after sets
            const reconstructedData: CollapsibleSetDragListItem[] = [
                ...otherItems.slice(0, headerIndexInOthers + 1),
                ...dropsetSets,
                ...(dropsetFooter ? [dropsetFooter] : []),
                ...otherItems.slice(headerIndexInOthers + 1),
            ];

            // Now expand all collapsed items and clear the collapsed state
            updatedData = expandAllDropsets(reconstructedData);
            setCollapsedDropsetId(null);

            // For dropset drags, we DON'T recalculate dropset membership - 
            // the sets keep their original dropSetId
            // Extract all sets in their new order, preserving dropSetId
            const reorderedSets: Set[] = [];
            updatedData.forEach(item => {
                if (isSetDragItemHelper(item)) {
                    reorderedSets.push(item.set);
                }
            });

            // Reconstruct items with headers/footers from the sets
            const reconstructedItems = reconstructItemsFromSets(reorderedSets);
            setLocalDragItems(reconstructedItems);
            pendingDragRef.current = null;
            onDropsetDragComplete?.();

            // Pass the reconstructed data to parent
            onDragEnd({
                data: reconstructedItems as SetDragListItem[],
                from,
                to,
            });
            return;
        }

        // For non-dropset drags (individual sets), determine dropset membership based on position
        // Extract only the sets (filter out headers/footers)
        const reorderedSets: Set[] = [];
        updatedData.forEach(item => {
            if (isSetDragItemHelper(item)) {
                reorderedSets.push(item.set);
            }
        });

        // Determine dropset membership based on position between headers/footers
        const updatedSets = reorderedSets.map((set, setIndex) => {
            // Find the position of this set in the full data array
            let positionInFullArray = -1;
            let setCount = 0;
            for (let i = 0; i < updatedData.length; i++) {
                const item = updatedData[i];
                if (isSetDragItemHelper(item)) {
                    if (setCount === setIndex) {
                        positionInFullArray = i;
                        break;
                    }
                    setCount++;
                }
            }

            if (positionInFullArray === -1) {
                // Fallback: keep original dropSetId
                return { ...set };
            }

            // Look backwards to find the nearest dropset header
            let nearestHeader: CollapsibleDropSetHeaderItem | null = null;
            for (let i = positionInFullArray; i >= 0; i--) {
                const item = updatedData[i];
                if (isDropSetHeaderItemHelper(item)) {
                    nearestHeader = item;
                    break;
                }
                if (isDropSetFooterItemHelper(item)) {
                    // Hit a footer before a header, so we're outside a dropset
                    break;
                }
            }

            // Look forwards to find the nearest dropset footer
            let nearestFooter: CollapsibleDropSetFooterItem | null = null;
            for (let i = positionInFullArray; i < updatedData.length; i++) {
                const item = updatedData[i];
                if (isDropSetFooterItemHelper(item)) {
                    nearestFooter = item;
                    break;
                }
                if (isDropSetHeaderItemHelper(item)) {
                    // Hit a header before a footer, so we're outside a dropset
                    break;
                }
            }

            // If we're between a matching header and footer, we're in that dropset
            let newDropSetId: string | undefined = undefined;
            if (nearestHeader && nearestFooter &&
                nearestHeader.dropSetId === nearestFooter.dropSetId) {
                newDropSetId = nearestHeader.dropSetId;
            }

            return {
                ...set,
                dropSetId: newDropSetId,
            };
        });

        // Reconstruct items with headers/footers from the updated sets
        const reconstructedItems = reconstructItemsFromSets(updatedSets);
        setLocalDragItems(reconstructedItems);
        pendingDragRef.current = null;

        // Pass the reconstructed data to parent
        onDragEnd({
            data: reconstructedItems as SetDragListItem[],
            from,
            to,
        });
    };
};

const styles = StyleSheet.create({
    hiddenItem: {
        height: 0,
        overflow: 'hidden',
    },
    dropsetHeaderContainer: {
        // Container for draggable dropset header
    },
    dropsetHeaderContainer__active: {
        opacity: 0.9,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 20,
        zIndex: 9999,
        transform: [{ scale: 1.02 }],
    },
    dropsetHeaderContainer__collapsed: {
        overflow: 'visible',
    },
    dropsetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingLeft: 8,
        marginHorizontal: 12,
        marginTop: 8,
        marginBottom: 0,
        marginLeft: 12,
        paddingTop: 4,
        backgroundColor: 'transparent',
        borderLeftWidth: 1,
        borderColor: 'transparent',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 4,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 4,
        borderStyle: 'solid',
        position: 'relative',
    },
    dropsetHeader__dragging: {
    },
    dropsetHeader__collapsed: {
        borderBottomWidth: 2,
        borderStyle: 'dashed',
        borderColor: COLORS.indigo[300],
        marginBottom: 4,
        zIndex: 900,
        paddingTop: 12,
        paddingBottom: 12,
        borderWidth: 2,
        borderLeftWidth: 2,
        borderTopRightRadius: 6,
        borderTopLeftRadius: 6,
        borderBottomLeftRadius: 6,
        borderBottomRightRadius: 6,
        overflow: 'visible',
    },
    dropsetHeader__activelyDragging: {
        borderColor: COLORS.indigo[400],
        backgroundColor: COLORS.indigo[50],
        zIndex: 9999,
        elevation: 20,
        borderWidth: 2,
        borderRadius: 6,
    },
    ghostDropsetHeader: {
        backgroundColor: COLORS.indigo[50],
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomRightRadius: 0,
        borderTopWidth: 1,
        borderColor: COLORS.indigo[200],
    },
    dropsetHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
        gap: 8,
    },
    dropsetHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    dropsetHeaderText: {
        fontSize: 9,
        fontWeight: '700',
        color: COLORS.indigo[700],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dropsetHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.indigo[500],
    },
    dropsetFooter: {
        height: 1,
        marginHorizontal: 12,
        marginTop: 4,
        marginBottom: 4,
        marginLeft: 12,
        backgroundColor: 'transparent',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 1,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 1,
        borderLeftWidth: 1,
        borderColor: 'transparent',
        position: 'relative',
    },
    dropsetFooter__dragging: {
        backgroundColor: COLORS.indigo[500],
    },
    ghostDropsetFooter: {
        backgroundColor: COLORS.indigo[50],
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.indigo[200],
        height: 8,
        marginTop: 0,
    },
    dropSetIndicatorHeader: {
        position: 'absolute',
        left: -8,
        top: 0,
        bottom: -4,
        width: 4,
        backgroundColor: COLORS.indigo[500],
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    dropSetIndicatorFooter: {
        position: 'absolute',
        left: -8,
        top: -4,
        bottom: -1,
        width: 4,
        backgroundColor: COLORS.indigo[500],
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    dropSetIndicator: {
        position: 'absolute',
        left: -8,
        top: -5,
        bottom: -4,
        width: 4,
        backgroundColor: COLORS.indigo[500],
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    ghostItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.indigo[50],
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 12,
        marginLeft: 12,
        borderWidth: 1,
        marginTop: 0,
        borderColor: COLORS.indigo[200],
        borderTopWidth: 0,
        position: 'relative',
        overflow: 'visible',
    },
    ghostItem__first: {
    },
    ghostItem__last: {
        borderBottomColor: 'transparent',
    },
    ghostItemContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    ghostItemText: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.indigo[400],
    },
    dragItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        paddingVertical: 6,
        paddingHorizontal: 16,
        marginHorizontal: 12,
        marginTop: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.slate[200],
        position: 'relative',
        overflow: 'hidden',
    },
    dragItem__dropset: {
        marginLeft: 12,
        overflow: 'visible',
    },
    dragItem__active: {
        backgroundColor: COLORS.blue[50],
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: COLORS.blue[400],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        transform: [{ scale: 1.02 }],
    },
    dragItem__selected: {
        borderColor: COLORS.blue[600],
        borderWidth: 1,
        backgroundColor: COLORS.blue[100],
    },
    dragItem__selectedWarmup: {
        borderColor: COLORS.orange[600],
        borderWidth: 1,
        backgroundColor: COLORS.orange[100],
    },
    dragItem__selectedFailure: {
        borderColor: COLORS.red[600],
        borderWidth: 1,
        backgroundColor: COLORS.red[100],
    },
    dragItem__selectedDropset: {
        borderColor: COLORS.indigo[600],
        borderWidth: 1,
        backgroundColor: COLORS.indigo[100],
    },
    setIndexBadge: {
        width: 30,
        height: 26,
        borderRadius: 6,
        backgroundColor: COLORS.slate[100],
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    setIndexBadge__warmup: {
        backgroundColor: COLORS.orange[100],
    },
    setIndexBadge__failure: {
        backgroundColor: COLORS.red[100],
    },
    setIndexText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: COLORS.slate[600],
    },
    setIndexText__warmup: {
        color: COLORS.orange[600],
    },
    setIndexText__failure: {
        color: COLORS.red[600],
    },
    setIndexText__groupSub: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.slate[400],
    },
    setIndexText__groupSub__warmup: {
        color: COLORS.orange[350],
    },
    setIndexText__groupSub__failure: {
        color: COLORS.red[350],
    },
    setInfo: {
        flex: 1,
    },
    setInfoText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.slate[800],
    },
    setIndicators: {
        flexDirection: 'row',
        gap: 6,
        marginLeft: 24,
    },
    dropsetIconButton: {
        padding: 4,
        marginLeft: 8,
    },
    completedIndicatorWrapper: {
        backgroundColor: COLORS.green[150],
        borderRadius: 100,
        padding: 2,
    },
    restTimerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.blue[50],
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 8,
        minWidth: 56,
        justifyContent: 'center',
    },
    restTimerBadge__add: {
        backgroundColor: COLORS.slate[50],
        borderWidth: 1,
        borderColor: COLORS.slate[200],
        borderStyle: 'dashed',
    },
    restTimerBadge__disabled__noTimer: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
    },
    restTimerBadge__disabled__withTimer: {
        backgroundColor: 'transparent',
    },
    restTimerText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.blue[600],
    },
    restTimerText__add: {
        color: COLORS.slate[500],
    },
    restTimerText__disabledWithTimer: {
        color: COLORS.blue[600], // Keep blue color even when disabled if set has rest timer
        fontSize: 14,
    },
    restTimerText__disabled__noTimer: {
        color: 'transparent',
    },
    checkboxContainer: {
        padding: 0,
        marginLeft: 8,
    },
    restTimerAndCheckboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
