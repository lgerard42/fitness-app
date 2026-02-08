import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { X, Timer, Flame, Zap, Check, Layers, Plus, Square } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime, parseRestTimeInput } from '@/utils/workoutHelpers';
import { defaultPopupStyles } from '@/constants/defaultStyles';
import type { Exercise, Set, ExerciseCategory } from '@/types/workout';
import type { SetDragListItem, SetDragItem, DropSetHeaderItem, DropSetFooterItem } from '../hooks/useSetDragAndDrop';
import { TimerKeyboard } from '../Keyboards/timerKeyboardUtil';
import SwipeToDelete from '@/components/common/SwipeToDelete';

// Extended types for collapse functionality
interface CollapsibleSetDragItem extends SetDragItem {
    isCollapsed?: boolean;
}

interface CollapsibleDropSetHeaderItem extends DropSetHeaderItem {
    isCollapsed?: boolean;
}

interface CollapsibleDropSetFooterItem extends DropSetFooterItem {
    isCollapsed?: boolean;
}

type CollapsibleSetDragListItem = CollapsibleSetDragItem | CollapsibleDropSetHeaderItem | CollapsibleDropSetFooterItem;

interface SetDragModalProps {
    visible: boolean;
    exercise: Exercise | null;
    setDragItems: SetDragListItem[];
    onDragEnd: (params: { data: SetDragListItem[]; from: number; to: number }) => void;
    onCancel: () => void;
    onSave: () => void;
    onCreateDropset: (setId: string) => void;
    onUpdateSet: (setId: string, updates: Partial<Set>) => void;
    onAddSet: () => void;
    onUpdateRestTimer: (setId: string, restPeriodSeconds: number | undefined) => void;
    onUpdateRestTimerMultiple: (setIds: string[], restPeriodSeconds: number | undefined) => void;
}

const SetDragModal: React.FC<SetDragModalProps> = ({
    visible,
    exercise,
    setDragItems,
    onDragEnd,
    onCancel,
    onSave,
    onCreateDropset,
    onUpdateSet,
    onAddSet,
    onUpdateRestTimer,
    onUpdateRestTimerMultiple,
}) => {
    const [indexPopup, setIndexPopup] = useState<{ setId: string; top: number; left: number } | null>(null);
    const [restTimerInput, setRestTimerInput] = useState<{ setId: string; currentValue: string } | null>(null);
    const [restTimerInputString, setRestTimerInputString] = useState<string>('');
    const [addTimerMode, setAddTimerMode] = useState<boolean>(false);
    const [restTimerSelectedSetIds, setRestTimerSelectedSetIds] = useState<globalThis.Set<string>>(new globalThis.Set());
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [collapsedDropsetId, setCollapsedDropsetId] = useState<string | null>(null);
    const [localDragItems, setLocalDragItems] = useState<CollapsibleSetDragListItem[]>([]);
    const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
    const pendingDragRef = useRef<(() => void) | null>(null);
    const badgeRefs = useRef<Map<string, View>>(new Map());
    const modalContainerRef = useRef<View>(null);

    // Sync local drag items with parent when not in collapsed state
    useEffect(() => {
        if (!collapsedDropsetId) {
            setLocalDragItems(setDragItems as CollapsibleSetDragListItem[]);
        }
    }, [setDragItems, collapsedDropsetId]);

    // Reset swipe state when modal closes
    useEffect(() => {
        if (!visible) {
            setSwipedItemId(null);
        }
    }, [visible]);

    // Effect to fire pending drag after collapse
    useEffect(() => {
        if (collapsedDropsetId && pendingDragRef.current) {
            const timeoutId = setTimeout(() => {
                if (pendingDragRef.current) {
                    pendingDragRef.current();
                    pendingDragRef.current = null;
                }
            }, 50);
            return () => clearTimeout(timeoutId);
        }
    }, [collapsedDropsetId, localDragItems]);

    // Helper: Collapse a dropset (mark items as collapsed)
    const collapseDropset = useCallback((items: CollapsibleSetDragListItem[], dropsetId: string): CollapsibleSetDragListItem[] => {
        return items.map(item => {
            if (item.type === 'set' && item.set.dropSetId === dropsetId) {
                return { ...item, isCollapsed: true };
            }
            if (item.type === 'dropset_header' && item.dropSetId === dropsetId) {
                return { ...item, isCollapsed: true };
            }
            if (item.type === 'dropset_footer' && item.dropSetId === dropsetId) {
                return { ...item, isCollapsed: true };
            }
            return item;
        });
    }, []);

    // Helper: Collapse all dropsets except the one being dragged
    const collapseAllOtherDropsets = useCallback((items: CollapsibleSetDragListItem[], draggedDropsetId: string): CollapsibleSetDragListItem[] => {
        const otherDropsetIds = new globalThis.Set<string>();
        items.forEach(item => {
            if (item.type === 'set' && item.set.dropSetId && item.set.dropSetId !== draggedDropsetId) {
                otherDropsetIds.add(item.set.dropSetId);
            }
        });

        return items.map(item => {
            if (item.type === 'set' && item.set.dropSetId && otherDropsetIds.has(item.set.dropSetId)) {
                return { ...item, isCollapsed: true };
            }
            if (item.type === 'dropset_header' && otherDropsetIds.has(item.dropSetId)) {
                return { ...item, isCollapsed: true };
            }
            if (item.type === 'dropset_footer' && otherDropsetIds.has(item.dropSetId)) {
                return { ...item, isCollapsed: true };
            }
            return item;
        });
    }, []);

    // Helper: Expand all collapsed items
    const expandAllDropsets = useCallback((items: CollapsibleSetDragListItem[]): CollapsibleSetDragListItem[] => {
        return items.map(item => {
            if ('isCollapsed' in item && item.isCollapsed) {
                const { isCollapsed, ...rest } = item;
                return rest as CollapsibleSetDragListItem;
            }
            return item;
        });
    }, []);

    // Helper: Reconstruct items from sets (for after deletion)
    const reconstructItemsFromSets = useCallback((sets: Set[]): CollapsibleSetDragListItem[] => {
        const items: CollapsibleSetDragListItem[] = [];
        const processedDropSetIds = new Set<string>();

        sets.forEach((set, index) => {
            // Check if this is the start of a new dropset
            const isDropSetStart = set.dropSetId &&
                (index === 0 || sets[index - 1].dropSetId !== set.dropSetId);

            // Check if this is the end of a dropset
            const isDropSetEnd = set.dropSetId &&
                (index === sets.length - 1 || sets[index + 1]?.dropSetId !== set.dropSetId);

            // Add dropset header if this is the start
            if (isDropSetStart && set.dropSetId && !processedDropSetIds.has(set.dropSetId)) {
                // Count sets in this dropset
                const dropSetSets = sets.filter(s => s.dropSetId === set.dropSetId);
                items.push({
                    id: `dropset-header-${set.dropSetId}`,
                    type: 'dropset_header',
                    dropSetId: set.dropSetId,
                    setCount: dropSetSets.length,
                });
                processedDropSetIds.add(set.dropSetId);
            }

            // Add the set itself
            items.push({
                id: set.id,
                type: 'set',
                set,
                hasRestTimer: !!set.restPeriodSeconds,
            });

            // Add dropset footer if this is the end
            if (isDropSetEnd && set.dropSetId) {
                items.push({
                    id: `dropset-footer-${set.dropSetId}`,
                    type: 'dropset_footer',
                    dropSetId: set.dropSetId,
                });
            }
        });

        return items;
    }, []);

    // Handle delete set
    const handleDeleteSet = useCallback((setId: string) => {
        // Extract all current sets
        const currentSets: Set[] = [];
        localDragItems.forEach(item => {
            if (item.type === 'set') {
                currentSets.push(item.set);
            }
        });

        // Remove the deleted set
        const updatedSets = currentSets.filter(s => s.id !== setId);

        // Reconstruct items with headers/footers
        const newItems = reconstructItemsFromSets(updatedSets);
        setLocalDragItems(newItems);

        // Close trash if this item was swiped
        if (swipedItemId === setId) {
            setSwipedItemId(null);
        }

        // Close index popup if it was for this set
        if (indexPopup && indexPopup.setId === setId) {
            setIndexPopup(null);
        }

        // Close rest timer input if it was for this set
        if (restTimerInput && restTimerInput.setId === setId) {
            setRestTimerInput(null);
            setRestTimerInputString('');
        }
    }, [localDragItems, reconstructItemsFromSets, swipedItemId, indexPopup, restTimerInput]);

    // Helper: Close trash icon
    const closeTrashIcon = useCallback(() => {
        setSwipedItemId(null);
    }, []);

    // Initiate dropset drag - collapse group and prepare for drag
    const initiateDropsetDrag = useCallback((dropsetId: string, drag: () => void) => {
        // Collapse this dropset and all others
        let collapsed = collapseDropset(localDragItems, dropsetId);
        collapsed = collapseAllOtherDropsets(collapsed, dropsetId);

        setLocalDragItems(collapsed);
        setCollapsedDropsetId(dropsetId);
        pendingDragRef.current = drag;
    }, [localDragItems, collapseDropset, collapseAllOtherDropsets]);

    // Memoize restPeriodSetInfo to prevent unnecessary effect re-fires in TimerKeyboard
    const restPeriodSetInfoMemo = useMemo(() => {
        if (exercise && restTimerInput) {
            return {
                exerciseId: exercise.instanceId,
                setId: restTimerInput.setId,
            };
        }
        return null;
    }, [exercise?.instanceId, restTimerInput?.setId]);

    const renderDropSetHeader = useCallback((
        item: CollapsibleDropSetHeaderItem,
        drag?: () => void,
        isActive?: boolean
    ) => {
        const isCollapsed = item.isCollapsed || collapsedDropsetId === item.dropSetId;
        const isDraggedDropset = collapsedDropsetId === item.dropSetId;
        const shouldRenderGhosts = isCollapsed && !isDraggedDropset;
        const isActivelyDragging = isActive && isDraggedDropset;

        // Get all sets in this dropset for ghost rendering
        const dropsetSets = localDragItems.filter(
            (i): i is CollapsibleSetDragItem => i.type === 'set' && i.set.dropSetId === item.dropSetId
        );

        return (
            <TouchableOpacity
                onLongPress={() => initiateDropsetDrag(item.dropSetId, drag!)}
                disabled={isActive}
                delayLongPress={150}
                activeOpacity={1}
                style={[
                    styles.dropsetHeaderContainer,
                    isActive && styles.dropsetHeaderContainer__active,
                ]}
            >
                <View
                    style={[
                        styles.dropsetHeader,
                        isDragging && styles.dropsetHeader__dragging,
                        isDraggedDropset && styles.dropsetHeader__collapsed,
                        isActivelyDragging && styles.dropsetHeader__activelyDragging,
                    ]}
                >
                    <View style={styles.dropSetIndicatorHeader} />
                    <View style={styles.dropsetHeaderContent}>
                        <Text style={styles.dropsetHeaderText}>Dropset ({item.setCount} sets)</Text>
                        {isDragging && (
                            <View style={styles.dropsetHeaderLine} />
                        )}
                    </View>
                </View>

                {/* Render ghost items when collapsed but not being dragged */}
                {shouldRenderGhosts && (
                    <View>
                        {dropsetSets.map((setItem, index) => (
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
                                        <Text style={styles.setIndexText}>·</Text>
                                    </View>
                                    <Text style={styles.ghostItemText}>
                                        {setItem.set.weight || '-'} × {setItem.set.reps || '-'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                        {/* Ghost footer */}
                        <View style={styles.dropsetFooter}>
                            <View style={styles.dropSetIndicatorFooter} />
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [isDragging, collapsedDropsetId, localDragItems, initiateDropsetDrag]);

    const renderDropSetFooter = useCallback((item: CollapsibleDropSetFooterItem) => {
        const isCollapsed = item.isCollapsed || collapsedDropsetId === item.dropSetId;

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

    const renderDragItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<CollapsibleSetDragListItem>) => {
        // Handle dropset headers - now draggable
        if (item.type === 'dropset_header') {
            return renderDropSetHeader(item as CollapsibleDropSetHeaderItem, drag, isActive);
        }
        if (item.type === 'dropset_footer') {
            return renderDropSetFooter(item as CollapsibleDropSetFooterItem);
        }

        // Handle regular sets
        const setItemData = item as CollapsibleSetDragItem;

        // Handle collapsed sets - render hidden
        const isCollapsed = setItemData.isCollapsed || (setItemData.set.dropSetId && collapsedDropsetId === setItemData.set.dropSetId);
        if (isCollapsed) {
            return <View style={styles.hiddenItem} />;
        }

        const set = setItemData.set;
        const category = exercise?.category || 'Lifts';
        const weightUnit = exercise?.weightUnit || 'lbs';

        // Get the position in the full array (including headers/footers)
        const fullArrayIndex = getIndex() ?? 0;

        // Count how many sets come before this position (excluding headers/footers)
        let setCountBefore = 0;
        for (let i = 0; i < fullArrayIndex; i++) {
            if (localDragItems[i]?.type === 'set') {
                setCountBefore++;
            }
        }

        // Get all sets in order for dropset calculations
        const allSets = localDragItems.filter((i): i is CollapsibleSetDragItem => i.type === 'set');
        const currentSetIndex = setCountBefore;

        // Calculate display index based on dropset logic (matching SetRow.tsx)
        let displayIndexText: string;
        let isSubIndex = false;

        if (set.dropSetId) {
            // Find all sets in this dropset
            const dropSetSets = allSets.filter(s => s.set.dropSetId === set.dropSetId);
            const indexInDropSet = dropSetSets.findIndex(s => s.id === item.id) + 1;

            // Count group number: iterate through sets before this one, counting dropsets as single units
            let groupNumber = 0;
            const seenDropSetIds = new Set<string>();

            for (let i = 0; i < currentSetIndex; i++) {
                const prevSet = allSets[i].set;
                if (prevSet.dropSetId) {
                    if (!seenDropSetIds.has(prevSet.dropSetId)) {
                        seenDropSetIds.add(prevSet.dropSetId);
                        groupNumber++;
                    }
                } else {
                    groupNumber++;
                }
            }

            // Check if this dropset was already counted
            if (!seenDropSetIds.has(set.dropSetId)) {
                groupNumber++;
            }

            if (indexInDropSet === 1) {
                // First set in dropset: show only primary index
                displayIndexText = groupNumber.toString();
            } else {
                // Subsequent sets: show only subIndex with "."
                displayIndexText = `.${indexInDropSet}`;
                isSubIndex = true;
            }
        } else {
            // Not in a dropset - count all sets (treating dropsets as single units)
            let overallSetNumber = 0;
            const seenDropSetIds = new Set<string>();

            for (let i = 0; i < currentSetIndex; i++) {
                const prevSet = allSets[i].set;
                if (prevSet.dropSetId) {
                    if (!seenDropSetIds.has(prevSet.dropSetId)) {
                        seenDropSetIds.add(prevSet.dropSetId);
                        overallSetNumber++;
                    }
                } else {
                    overallSetNumber++;
                }
            }
            overallSetNumber++;
            displayIndexText = overallSetNumber.toString();
        }

        const isSelected = addTimerMode && restTimerSelectedSetIds.has(set.id);
        const showTrash = swipedItemId === set.id;

        return (
            <SwipeToDelete
                onDelete={() => handleDeleteSet(set.id)}
                disabled={isActive || addTimerMode || isDragging}
                itemId={set.id}
                isTrashVisible={showTrash}
                onShowTrash={() => setSwipedItemId(set.id)}
                onCloseTrash={closeTrashIcon}
                trashBackgroundColor={COLORS.red[500]}
                trashIconColor="#ffffff"
            >
                <TouchableOpacity
                    onLongPress={drag}
                    delayLongPress={100}
                    disabled={isActive}
                    activeOpacity={1}
                    onPress={addTimerMode ? () => {
                        // Close trash if visible
                        if (swipedItemId) {
                            closeTrashIcon();
                        }
                        const newSet = new globalThis.Set(restTimerSelectedSetIds);
                        if (newSet.has(set.id)) {
                            newSet.delete(set.id);
                        } else {
                            newSet.add(set.id);
                        }
                        setRestTimerSelectedSetIds(newSet);
                    } : undefined}
                    style={[
                        styles.dragItem,
                        isActive && styles.dragItem__active,
                        isSelected && styles.dragItem__selected,
                        set.dropSetId && styles.dragItem__dropset,
                    ]}
                >
                    <View
                        ref={(ref) => {
                            if (ref) {
                                badgeRefs.current.set(set.id, ref);
                            } else {
                                badgeRefs.current.delete(set.id);
                            }
                        }}
                    >
                        <TouchableOpacity
                            style={[
                                styles.setIndexBadge,
                                set.isWarmup && styles.setIndexBadge__warmup,
                                set.isFailure && styles.setIndexBadge__failure,
                            ]}
                            onPress={(e) => {
                                e.stopPropagation();
                                const badgeRef = badgeRefs.current.get(set.id);
                                if (badgeRef && modalContainerRef.current) {
                                    // Measure badge position relative to window
                                    badgeRef.measureInWindow((badgeX, badgeY, badgeWidth, badgeHeight) => {
                                        // Measure modal container position relative to window
                                        modalContainerRef.current?.measureInWindow((containerX, containerY) => {
                                            // Calculate position relative to modal container
                                            const relativeX = badgeX - containerX;
                                            const relativeY = badgeY - containerY;

                                            // Position popup below the badge, aligned to the left edge
                                            setIndexPopup({
                                                setId: set.id,
                                                top: relativeY + badgeHeight + 4,
                                                left: relativeX,
                                            });
                                        });
                                    });
                                }
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

                    {addTimerMode ? (
                        <View style={styles.checkboxContainer}>
                            {restTimerSelectedSetIds.has(set.id) ? (
                                <Check size={20} color={COLORS.blue[600]} strokeWidth={3} />
                            ) : (
                                <Square size={20} color={COLORS.slate[400]} />
                            )}
                        </View>
                    ) : (
                        <>
                            <View style={styles.setIndicators}>
                                {set.isWarmup && (
                                    <Flame size={14} color={COLORS.orange[500]} />
                                )}
                                {set.isFailure && (
                                    <Zap size={14} color={COLORS.red[500]} />
                                )}
                                {set.completed && (
                                    <Check size={14} color={COLORS.green[500]} />
                                )}
                            </View>

                            <TouchableOpacity
                                onPress={() => {
                                    const currentValue = set.restPeriodSeconds
                                        ? set.restPeriodSeconds.toString()
                                        : '';
                                    setRestTimerInputString(currentValue);
                                    setRestTimerInput({
                                        setId: set.id,
                                        currentValue,
                                    });
                                }}
                                style={[
                                    styles.restTimerBadge,
                                    !setItemData.hasRestTimer && styles.restTimerBadge__add
                                ]}
                            >
                                <Timer size={12} color={setItemData.hasRestTimer ? COLORS.blue[500] : COLORS.slate[400]} />
                                <Text style={[
                                    styles.restTimerText,
                                    !setItemData.hasRestTimer && styles.restTimerText__add
                                ]}>
                                    {setItemData.hasRestTimer
                                        ? formatRestTime(set.restPeriodSeconds!)
                                        : '+ rest'
                                    }
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
    }, [exercise, localDragItems, renderDropSetHeader, renderDropSetFooter, addTimerMode, restTimerSelectedSetIds, collapsedDropsetId, swipedItemId, handleDeleteSet, closeTrashIcon, isDragging]);

    const keyExtractor = useCallback((item: CollapsibleSetDragListItem) => item.id, []);

    // Handle drag end - expand groups and pass to parent
    const handleLocalDragEnd = useCallback(({ data, from, to }: { data: CollapsibleSetDragListItem[]; from: number; to: number }) => {
        let updatedData = data;

        // If a dropset was collapsed, expand all groups
        if (collapsedDropsetId) {
            updatedData = expandAllDropsets(data);
            setCollapsedDropsetId(null);
        }

        setLocalDragItems(updatedData);
        pendingDragRef.current = null;

        // Pass the expanded data to parent
        onDragEnd({
            data: updatedData as SetDragListItem[],
            from,
            to,
        });
    }, [collapsedDropsetId, expandAllDropsets, onDragEnd]);

    if (!visible || !exercise) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onCancel}
        >
            <GestureHandlerRootView style={styles.gestureRoot}>
                <View style={styles.overlay}>
                    <View
                        ref={modalContainerRef}
                        style={styles.modalContainer}
                    >
                        <View style={styles.header}>
                            <View style={styles.headerContent}>
                                <Text style={styles.title}>Reorder Sets</Text>
                                <Text style={styles.subtitle}>{exercise.name}</Text>
                            </View>
                            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                                <X size={24} color={COLORS.slate[600]} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.instructions}>
                            <Text style={styles.instructionsText}>
                                Hold and drag sets to reorder them
                            </Text>
                        </View>

                        {localDragItems.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No sets to reorder</Text>
                            </View>
                        ) : (
                            <DraggableFlatList
                                data={localDragItems}
                                keyExtractor={keyExtractor}
                                renderItem={renderDragItem}
                                onDragBegin={() => setIsDragging(true)}
                                onDragEnd={(params) => {
                                    setIsDragging(false);
                                    handleLocalDragEnd(params);
                                }}
                                containerStyle={styles.listContainer}
                                contentContainerStyle={styles.listContent}
                                ListFooterComponent={
                                    <TouchableOpacity
                                        onPress={onAddSet}
                                        style={styles.addSetButton}
                                    >
                                        <Plus size={18} color={COLORS.blue[600]} />
                                        <Text style={styles.addSetButtonText}>Add set</Text>
                                    </TouchableOpacity>
                                }
                            />
                        )}

                        {/* Index Popup Menu */}
                        {indexPopup && (() => {
                            const setItem = localDragItems.find((i): i is CollapsibleSetDragItem => i.type === 'set' && i.id === indexPopup.setId);
                            const set = setItem?.set;
                            if (!set) return null;

                            return (
                                <Pressable
                                    onPress={() => setIndexPopup(null)}
                                    style={defaultPopupStyles.backdrop as any}
                                >
                                    <Pressable
                                        onPress={(e) => e.stopPropagation()}
                                        style={[
                                            defaultPopupStyles.container as any,
                                            {
                                                position: 'absolute' as const,
                                                top: indexPopup.top,
                                                left: indexPopup.left,
                                            }
                                        ]}
                                    >
                                        {/* Warmup/Failure Toggle Row */}
                                        <View style={[
                                            defaultPopupStyles.toggleRow as any,
                                            set.dropSetId && defaultPopupStyles.borderBottomLast as any
                                        ]}>
                                            <TouchableOpacity
                                                style={[
                                                    defaultPopupStyles.toggleOption as any,
                                                    defaultPopupStyles.toggleOptionBorder as any,
                                                    set.isWarmup ? defaultPopupStyles.toggleOptionBackgroundActive as any : defaultPopupStyles.toggleOptionBackgroundInactive as any,
                                                    defaultPopupStyles.borderRadiusFirstLeft as any,
                                                    set.dropSetId && defaultPopupStyles.borderRadiusLastLeft as any,
                                                ]}
                                                onPress={() => {
                                                    const newIsWarmup = !set.isWarmup;
                                                    onUpdateSet(set.id, {
                                                        isWarmup: newIsWarmup,
                                                        isFailure: newIsWarmup ? false : set.isFailure,
                                                    });
                                                    setIndexPopup(null);
                                                }}
                                            >
                                                <View style={defaultPopupStyles.optionContent as any}>
                                                    <Flame size={18} color={set.isWarmup ? COLORS.white : COLORS.orange[500]} />
                                                    <Text style={[
                                                        defaultPopupStyles.toggleOptionText as any,
                                                        set.isWarmup ? defaultPopupStyles.toggleOptionTextActive as any : defaultPopupStyles.toggleOptionTextInactive as any
                                                    ]}>
                                                        Warmup
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={[
                                                    defaultPopupStyles.toggleOption as any,
                                                    set.isFailure ? defaultPopupStyles.toggleOptionBackgroundActive as any : defaultPopupStyles.toggleOptionBackgroundInactive as any,
                                                    defaultPopupStyles.borderRadiusFirstRight as any,
                                                    set.dropSetId && defaultPopupStyles.borderRadiusLastRight as any,
                                                ]}
                                                onPress={() => {
                                                    const newIsFailure = !set.isFailure;
                                                    onUpdateSet(set.id, {
                                                        isFailure: newIsFailure,
                                                        isWarmup: newIsFailure ? false : set.isWarmup,
                                                    });
                                                    setIndexPopup(null);
                                                }}
                                            >
                                                <View style={defaultPopupStyles.optionContent as any}>
                                                    <Zap size={18} color={set.isFailure ? COLORS.white : COLORS.red[500]} />
                                                    <Text style={[
                                                        defaultPopupStyles.toggleOptionText as any,
                                                        set.isFailure ? defaultPopupStyles.toggleOptionTextActive as any : defaultPopupStyles.toggleOptionTextInactive as any
                                                    ]}>
                                                        Failure
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Create Dropset Option */}
                                        {!set.dropSetId && (
                                            <TouchableOpacity
                                                style={[
                                                    defaultPopupStyles.option as any,
                                                    defaultPopupStyles.optionBackground as any,
                                                    defaultPopupStyles.borderBottomLast as any,
                                                    defaultPopupStyles.borderRadiusLast as any,
                                                ]}
                                                onPress={() => {
                                                    onCreateDropset(set.id);
                                                    setIndexPopup(null);
                                                }}
                                            >
                                                <View style={defaultPopupStyles.optionContent as any}>
                                                    <Layers size={18} color={COLORS.indigo[400]} />
                                                    <Text style={defaultPopupStyles.optionText as any}>Create dropset</Text>
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                    </Pressable>
                                </Pressable>
                            );
                        })()}

                        {/* Rest Timer Input Popup - Shows parsed time while keyboard is open */}
                        {restTimerInput && (
                            <Pressable
                                onPress={() => {
                                    // Don't close if in addTimerMode - let user select sets
                                    if (addTimerMode) return;
                                    setRestTimerInput(null);
                                    setRestTimerInputString('');
                                    setRestTimerSelectedSetIds(new globalThis.Set());
                                }}
                                style={styles.restTimerInputOverlay}
                            >
                                <Pressable
                                    onPress={(e) => e.stopPropagation()}
                                    style={styles.restTimerInputContainer}
                                >
                                    <View style={styles.restTimerInputHeader}>
                                        <Text style={styles.restTimerInputTitle}>
                                            {localDragItems.find((i): i is CollapsibleSetDragItem => i.type === 'set' && i.id === restTimerInput.setId)?.set.restPeriodSeconds
                                                ? 'Update Rest Timer'
                                                : 'Add Rest Timer'
                                            }
                                        </Text>
                                    </View>
                                    <View style={styles.restTimerInputContent}>
                                        <View style={styles.restTimerInputDisplay}>
                                            <Text style={styles.restTimerInputDisplayText}>
                                                {restTimerInputString
                                                    ? formatRestTime(parseRestTimeInput(restTimerInputString))
                                                    : '0:00'
                                                }
                                            </Text>
                                        </View>
                                    </View>
                                </Pressable>
                            </Pressable>
                        )}

                        <View style={styles.footer}>
                            {addTimerMode ? (
                                <View style={styles.footerButtonsRow}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setAddTimerMode(false);
                                            setRestTimerSelectedSetIds(new globalThis.Set());
                                            setRestTimerInput(null);
                                            setRestTimerInputString('');
                                        }}
                                        style={styles.cancelButton}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (restTimerSelectedSetIds.size > 0 && restTimerInputString) {
                                                const seconds = parseRestTimeInput(restTimerInputString);
                                                if (seconds > 0) {
                                                    const selectedIdsArray = Array.from(restTimerSelectedSetIds);
                                                    onUpdateRestTimerMultiple(selectedIdsArray, seconds);
                                                }
                                            }
                                            setAddTimerMode(false);
                                            setRestTimerSelectedSetIds(new globalThis.Set());
                                            setRestTimerInput(null);
                                            setRestTimerInputString('');
                                        }}
                                        style={[
                                            styles.saveButton,
                                            (restTimerSelectedSetIds.size === 0 || !restTimerInputString) && styles.saveButton__disabled
                                        ]}
                                        disabled={restTimerSelectedSetIds.size === 0 || !restTimerInputString}
                                    >
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={onSave} style={styles.doneButton}>
                                    <Text style={styles.doneButtonText}>Done</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>

                {/* Timer Keyboard - Rendered outside modalContainer to appear from bottom of screen with highest z-index */}
                <TimerKeyboard
                    visible={!!restTimerInput && !addTimerMode}
                    onClose={() => {
                        setRestTimerInput(null);
                        setRestTimerInputString('');
                        setRestTimerSelectedSetIds(new globalThis.Set());
                    }}
                    restTimerInput={restTimerInputString}
                    setRestTimerInput={setRestTimerInputString}
                    restPeriodSetInfo={restPeriodSetInfoMemo}
                    currentWorkout={{
                        id: '',
                        name: '',
                        startedAt: Date.now(),
                        exercises: exercise ? [{
                            ...exercise,
                            sets: exercise.sets.map((s: Set) => ({
                                ...s,
                                restPeriodSeconds: s.id === restTimerInput?.setId && restTimerInputString
                                    ? parseRestTimeInput(restTimerInputString) > 0
                                        ? parseRestTimeInput(restTimerInputString)
                                        : undefined
                                    : s.restPeriodSeconds,
                            })),
                        }] : [],
                        date: new Date().toISOString(),
                    }}
                    handleWorkoutUpdate={(workout) => {
                        // Only handle single-set auto-updates as the user types
                        if (!restTimerInput || addTimerMode) return;
                        const exerciseItem = workout.exercises[0];
                        if (exerciseItem && exerciseItem.type === 'exercise') {
                            const updatedSet = exerciseItem.sets.find((s: Set) => s.id === restTimerInput.setId);
                            if (updatedSet) {
                                onUpdateRestTimer(restTimerInput.setId, updatedSet.restPeriodSeconds);
                            }
                        }
                    }}
                    onAddRestPeriod={() => {
                        // When keyboard's "Save" is pressed (not "Start Timer"), just save the value
                        if (restTimerInput && restTimerInputString) {
                            const seconds = parseRestTimeInput(restTimerInputString);
                            if (seconds > 0) {
                                onUpdateRestTimer(restTimerInput.setId, seconds);
                            }
                        }
                        setRestTimerInput(null);
                        setRestTimerInputString('');
                        setRestTimerSelectedSetIds(new globalThis.Set());
                    }}
                    setActiveRestTimer={() => { }}
                    setRestTimerPopupOpen={() => { }}
                    onSetSelectionMode={(enabled) => {
                        if (enabled) {
                            // Enter addTimerMode: close keyboard and popup, enter selection mode
                            // Auto-select the original set before closing
                            if (restTimerInput) {
                                const newSet = new globalThis.Set<string>();
                                newSet.add(restTimerInput.setId);
                                setRestTimerSelectedSetIds(newSet);
                            }
                            // Enter addTimerMode and close both keyboard and popup
                            setAddTimerMode(true);
                            setRestTimerInput(null); // This closes both keyboard and popup
                        }
                    }}
                    selectedSetIds={restTimerSelectedSetIds}
                    onToggleSetSelection={(exerciseId, setId) => {
                        // Not used - selection handled in set cards when in addTimerMode
                        // This callback is only used by TimerKeyboard's internal selection UI,
                        // which is not shown since we close the keyboard when entering addTimerMode
                    }}
                />
            </GestureHandlerRootView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    gestureRoot: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        width: '100%',
        minHeight: '80%',
        overflow: 'hidden',
        flexDirection: 'column',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[200],
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.slate[900],
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.slate[500],
        marginTop: 2,
    },
    closeButton: {
        padding: 4,
    },
    instructions: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: COLORS.slate[50],
    },
    instructionsText: {
        fontSize: 13,
        color: COLORS.slate[500],
        textAlign: 'center',
    },
    listContainer: {
        flex: 1,
        minHeight: 100,
    },
    listContent: {
        paddingVertical: 8,
    },
    emptyContainer: {
        flex: 1,
        minHeight: 100,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.slate[400],
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
        marginLeft: 12, // Indent to make room for the indicator line (4px line + 4px gap)
        overflow: 'visible', // Allow indicator to extend beyond border radius
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
        borderWidth: 2,
        backgroundColor: COLORS.blue[100],
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
    restTimerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.blue[50],
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginLeft: 8,
    },
    restTimerBadge__add: {
        backgroundColor: COLORS.slate[50],
        borderWidth: 1,
        borderColor: COLORS.slate[200],
        borderStyle: 'dashed',
    },
    restTimerText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.blue[600],
    },
    restTimerText__add: {
        color: COLORS.slate[500],
    },
    dropSetIndicator: {
        position: 'absolute',
        left: -8, // Position at the left edge (before margin) to create indentation effect
        top: -5,
        bottom: -4,
        width: 4,
        backgroundColor: COLORS.indigo[500],
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
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
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.slate[200],
    },
    footerButtonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    doneButton: {
        backgroundColor: COLORS.blue[600],
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.slate[300],
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.slate[700],
    },
    saveButton: {
        flex: 1,
        backgroundColor: COLORS.blue[600],
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveButton__disabled: {
        backgroundColor: COLORS.slate[200],
        opacity: 0.5,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    checkboxContainer: {
        padding: 8,
        marginLeft: 8,
    },
    restTimerInputOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 998,
        elevation: 8,
    },
    restTimerInputContainer: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        width: '95%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
        maxHeight: '95%',
    },
    restTimerInputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[200],
    },
    restTimerInputTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.slate[800],
    },
    restTimerInputContent: {
        padding: 16,
    },
    restTimerInputDisplay: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        paddingHorizontal: 16,
        backgroundColor: COLORS.slate[50],
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.slate[200],
    },
    restTimerInputDisplayText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: COLORS.slate[900],
    },
    dropsetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingLeft: 8, // Indent to make room for the indicator line (4px line + 4px gap)
        marginHorizontal: 12, // Match dragItem marginHorizontal
        marginTop: 8,
        marginBottom: 0,
        marginLeft: 12,
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
    dropsetHeaderText: {
        fontSize: 9,
        fontWeight: '700',
        color: COLORS.indigo[700],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dropsetFooter: {
        height: 1,
        marginHorizontal: 12, // Match dragItem marginHorizontal
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
    dropsetHeader__dragging: {
    },
    dropsetHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    dropsetHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.indigo[500],
    },
    dropsetFooter__dragging: {
        backgroundColor: COLORS.indigo[500],
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
    dropsetHeader__collapsed: {
        borderBottomWidth: 2,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
        borderStyle: 'dashed',
        borderColor: COLORS.indigo[300],
        marginBottom: 4,
        zIndex: 900,
    },
    dropsetHeader__activelyDragging: {
        borderColor: COLORS.indigo[400],
        backgroundColor: COLORS.indigo[50],
        zIndex: 9999,
        elevation: 20,
    },
    hiddenItem: {
        height: 0,
        overflow: 'hidden',
    },
    ghostItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.indigo[50],
        paddingVertical: 4,
        paddingHorizontal: 16,
        marginHorizontal: 12,
        marginLeft: 12,
        borderWidth: 1,
        borderColor: COLORS.indigo[200],
        borderTopWidth: 0,
        position: 'relative',
        overflow: 'visible',
    },
    ghostItem__first: {
        borderTopWidth: 1,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    ghostItem__last: {
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
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
    addSetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 12,
        marginTop: 8,
        marginBottom: 8,
        backgroundColor: COLORS.blue[50],
        borderRadius: 10,
        borderWidth: 2,
        borderColor: COLORS.blue[200],
        borderStyle: 'dashed',
    },
    addSetButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.blue[600],
    },
});

export default SetDragModal;
