import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { X, Timer, TrendingDown, Plus, Trash2, Flame, Zap } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime, parseRestTimeInput } from '@/utils/workoutHelpers';
import type { Exercise, Set } from '@/types/workout';
import type { SetDragListItem, SetDragItem } from '../../hooks/useSetDragAndDrop';
import { TimerKeyboard } from '../../Keyboards/timerKeyboardUtil';
import {
    useSetRowDragAndDrop,
    collapseDropset,
    collapseAllOtherDropsets,
    expandAllDropsets,
    reconstructItemsFromSets,
    createHandleLocalDragEnd,
    type CollapsibleSetDragListItem,
    type CollapsibleSetDragItem,
} from './SetRowDragAndDrop';

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
    initialAddTimerMode?: boolean; // If true, open in addTimerMode with pre-selected sets
    initialSelectedSetIds?: string[]; // Set IDs to pre-select when opening in addTimerMode
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
    initialAddTimerMode = false,
    initialSelectedSetIds = [],
}) => {
    const [restTimerInput, setRestTimerInput] = useState<{ setId: string; currentValue: string } | null>(null);
    const [restTimerInputString, setRestTimerInputString] = useState<string>('');
    const [addTimerMode, setAddTimerMode] = useState<boolean>(false);
    const [restTimerSelectedSetIds, setRestTimerSelectedSetIds] = useState<globalThis.Set<string>>(new globalThis.Set());
    const [warmupMode, setWarmupMode] = useState<boolean>(false);
    const [warmupSelectedSetIds, setWarmupSelectedSetIds] = useState<globalThis.Set<string>>(new globalThis.Set());
    const [failureMode, setFailureMode] = useState<boolean>(false);
    const [failureSelectedSetIds, setFailureSelectedSetIds] = useState<globalThis.Set<string>>(new globalThis.Set());
    const [dropsetMode, setDropsetMode] = useState<boolean>(false);
    const [dropsetSelectedSetIds, setDropsetSelectedSetIds] = useState<globalThis.Set<string>>(new globalThis.Set());
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [collapsedDropsetId, setCollapsedDropsetId] = useState<string | null>(null);
    const [listLayoutKey, setListLayoutKey] = useState(0);
    const [localDragItems, setLocalDragItems] = useState<CollapsibleSetDragListItem[]>([]);
    const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
    const pendingDragRef = useRef<(() => void) | null>(null);
    const badgeRefs = useRef<Map<string, View>>(new Map());
    const modalContainerRef = useRef<View>(null as any);

    // Sync local drag items with parent when not in collapsed state
    // Don't sync while timer keyboard is open to prevent clearing input
    useEffect(() => {
        if (!collapsedDropsetId && !restTimerInput) {
            setLocalDragItems(setDragItems as CollapsibleSetDragListItem[]);
        }
    }, [setDragItems, collapsedDropsetId, restTimerInput]);

    // Reset swipe state when modal closes
    useEffect(() => {
        if (!visible) {
            setSwipedItemId(null);
            setAddTimerMode(false);
            setRestTimerSelectedSetIds(new globalThis.Set());
            setWarmupMode(false);
            setWarmupSelectedSetIds(new globalThis.Set());
            setFailureMode(false);
            setFailureSelectedSetIds(new globalThis.Set());
            setDropsetMode(false);
            setDropsetSelectedSetIds(new globalThis.Set());
        }
    }, [visible]);

    // Initialize addTimerMode when opening with initialAddTimerMode
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        if (visible && initialAddTimerMode && initialSelectedSetIds.length > 0 && localDragItems.length > 0 && !hasInitializedRef.current) {
            // Pre-select all sets from the setGroup immediately
            const selectedSetIds = new globalThis.Set<string>();
            initialSelectedSetIds.forEach(id => {
                // Verify the set exists in localDragItems
                if (localDragItems.some(item => 
                    isSetDragItem(item) && (item as any).id === id
                )) {
                    selectedSetIds.add(id);
                }
            });
            
            if (selectedSetIds.size > 0) {
                // Set the selected sets immediately
                setRestTimerSelectedSetIds(selectedSetIds);
                
                // Find the first set ID that exists in the drag items to open keyboard for
                const firstSetId = initialSelectedSetIds.find(setId => {
                    return localDragItems.some(item => 
                        isSetDragItem(item) && (item as any).id === setId
                    );
                });

                if (firstSetId) {
                    // Open timer keyboard for the first set in selection mode
                    setRestTimerInput({ setId: firstSetId, currentValue: '' });
                    setRestTimerInputString('');
                    // Note: Selection mode will be enabled via initialSelectionMode prop on TimerKeyboard
                }
            }
            hasInitializedRef.current = true;
        }
        
        // Reset the flag when modal closes
        if (!visible) {
            hasInitializedRef.current = false;
        }
    }, [visible, initialAddTimerMode, initialSelectedSetIds, localDragItems]);

    // Pre-select the set when opening rest timer keyboard normally (not from exercise picker)
    useEffect(() => {
        if (visible && restTimerInput && restTimerSelectedSetIds.size === 0 && !initialAddTimerMode) {
            // Pre-select the set that was clicked to open the timer keyboard
            const newSet = new globalThis.Set<string>();
            newSet.add(restTimerInput.setId);
            setRestTimerSelectedSetIds(newSet);
        }
    }, [visible, restTimerInput, restTimerSelectedSetIds.size, initialAddTimerMode]);

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

    // Type guard helper
    const isSetDragItem = (item: CollapsibleSetDragListItem): item is CollapsibleSetDragItem => {
        return (item as any).type === 'set' && 'set' in item;
    };

    // Handle delete set
    const handleDeleteSet = useCallback((setId: string) => {
        // Extract all current sets
        const currentSets: Set[] = [];
        localDragItems.forEach(item => {
            if (isSetDragItem(item)) {
                currentSets.push((item as unknown as SetDragItem).set);
            }
        });

        // Remove the deleted set
        const updatedSets = currentSets.filter(s => s.id !== setId);

        // Reconstruct items with headers/footers
        const newItems = reconstructItemsFromSets(updatedSets);
        setLocalDragItems(newItems);

        // Update parent state via onDragEnd (atomic operation)
        onDragEnd({
            data: newItems as SetDragListItem[],
            from: 0,
            to: 0,
        });

        // Close trash if this item was swiped
        if (swipedItemId === setId) {
            setSwipedItemId(null);
        }


        // Close rest timer input if it was for this set
        if (restTimerInput && restTimerInput.setId === setId) {
            setRestTimerInput(null);
            setRestTimerInputString('');
        }
    }, [localDragItems, reconstructItemsFromSets, swipedItemId, restTimerInput, onDragEnd]);

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
    }, [localDragItems]);

    // Handle entering Warmup mode - pre-select all warmup sets
    const handleEnterWarmupMode = useCallback(() => {
        const warmupSetIds = new globalThis.Set<string>();
        localDragItems.forEach(item => {
            if (isSetDragItem(item)) {
                const set = (item as unknown as SetDragItem).set;
                if (set.isWarmup) {
                    warmupSetIds.add(set.id);
                }
            }
        });
        setWarmupSelectedSetIds(warmupSetIds);
        setWarmupMode(true);
        setFailureMode(false);
        setDropsetMode(false);
        setAddTimerMode(false);
        setRestTimerInput(null);
        setRestTimerInputString('');
    }, [localDragItems]);

    // Handle entering Failure mode - pre-select all failure sets
    const handleEnterFailureMode = useCallback(() => {
        const failureSetIds = new globalThis.Set<string>();
        localDragItems.forEach(item => {
            if (isSetDragItem(item)) {
                const set = (item as unknown as SetDragItem).set;
                if (set.isFailure) {
                    failureSetIds.add(set.id);
                }
            }
        });
        setFailureSelectedSetIds(failureSetIds);
        setFailureMode(true);
        setWarmupMode(false);
        setDropsetMode(false);
        setAddTimerMode(false);
        setRestTimerInput(null);
        setRestTimerInputString('');
    }, [localDragItems]);

    // Handle entering Dropset mode - clear selection
    const handleEnterDropsetMode = useCallback(() => {
        setDropsetSelectedSetIds(new globalThis.Set());
        setDropsetMode(true);
        setWarmupMode(false);
        setFailureMode(false);
        setAddTimerMode(false);
        setRestTimerInput(null);
        setRestTimerInputString('');
    }, []);

    // Handle saving Warmup mode - apply warmup property to selected sets
    const handleSaveWarmupMode = useCallback(() => {
        // Extract all current sets
        const currentSets: Set[] = [];
        localDragItems.forEach(item => {
            if (isSetDragItem(item)) {
                currentSets.push((item as unknown as SetDragItem).set);
            }
        });

        // Update all sets: selected ones get warmup=true, failure=false; unselected ones lose warmup
        const updatedSets = currentSets.map(set => {
            if (warmupSelectedSetIds.has(set.id)) {
                // Selected: set warmup, clear failure
                return {
                    ...set,
                    isWarmup: true,
                    isFailure: false,
                };
            } else if (set.isWarmup) {
                // Not selected but currently warmup: remove warmup
                return {
                    ...set,
                    isWarmup: false,
                };
            }
            return set;
        });

        // Reconstruct items with headers/footers
        const newItems = reconstructItemsFromSets(updatedSets);
        setLocalDragItems(newItems);

        // Update parent state via onDragEnd (atomic operation)
        onDragEnd({
            data: newItems as SetDragListItem[],
            from: 0,
            to: 0,
        });

        setWarmupMode(false);
        setWarmupSelectedSetIds(new globalThis.Set());
    }, [warmupSelectedSetIds, localDragItems, reconstructItemsFromSets, onDragEnd]);

    // Handle saving Failure mode - apply failure property to selected sets
    const handleSaveFailureMode = useCallback(() => {
        // Extract all current sets
        const currentSets: Set[] = [];
        localDragItems.forEach(item => {
            if (isSetDragItem(item)) {
                currentSets.push((item as unknown as SetDragItem).set);
            }
        });

        // Update all sets: selected ones get failure=true, warmup=false; unselected ones lose failure
        const updatedSets = currentSets.map(set => {
            if (failureSelectedSetIds.has(set.id)) {
                // Selected: set failure, clear warmup
                return {
                    ...set,
                    isFailure: true,
                    isWarmup: false,
                };
            } else if (set.isFailure) {
                // Not selected but currently failure: remove failure
                return {
                    ...set,
                    isFailure: false,
                };
            }
            return set;
        });

        // Reconstruct items with headers/footers
        const newItems = reconstructItemsFromSets(updatedSets);
        setLocalDragItems(newItems);

        // Update parent state via onDragEnd (atomic operation)
        onDragEnd({
            data: newItems as SetDragListItem[],
            from: 0,
            to: 0,
        });

        setFailureMode(false);
        setFailureSelectedSetIds(new globalThis.Set());
    }, [failureSelectedSetIds, localDragItems, reconstructItemsFromSets, onDragEnd]);

    // Handle saving Dropset mode - group selected sets into a dropset
    const handleSaveDropsetMode = useCallback(() => {
        if (dropsetSelectedSetIds.size < 2) {
            // Need at least 2 sets for a dropset
            return;
        }

        // Extract all current sets
        const currentSets: Set[] = [];
        localDragItems.forEach(item => {
            if (isSetDragItem(item)) {
                currentSets.push((item as unknown as SetDragItem).set);
            }
        });

        // Find the index of the first selected set (that isn't already in a dropset)
        let firstSelectedIndex = -1;
        for (let i = 0; i < currentSets.length; i++) {
            if (dropsetSelectedSetIds.has(currentSets[i].id) && !currentSets[i].dropSetId) {
                firstSelectedIndex = i;
                break;
            }
        }

        if (firstSelectedIndex === -1) {
            // No valid sets found to group
            return;
        }

        // Separate selected sets (that aren't already in a dropset) from non-selected sets
        const selectedSets: Set[] = [];
        const nonSelectedSets: Set[] = [];
        
        currentSets.forEach(set => {
            if (dropsetSelectedSetIds.has(set.id) && !set.dropSetId) {
                selectedSets.push(set);
            } else {
                nonSelectedSets.push(set);
            }
        });

        // Reorder: place selected sets together at the position of the first selected set
        const reorderedSets: Set[] = [];
        
        // Add all non-selected sets that come before the first selected set
        for (let i = 0; i < firstSelectedIndex; i++) {
            const set = currentSets[i];
            if (!dropsetSelectedSetIds.has(set.id) || set.dropSetId) {
                reorderedSets.push(set);
            }
        }
        
        // Add all selected sets grouped together (with dropset ID)
        const newDropSetId = `dropset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        selectedSets.forEach(set => {
            reorderedSets.push({
                ...set,
                dropSetId: newDropSetId,
            });
        });
        
        // Add all remaining non-selected sets (those that came after the first selected set)
        for (let i = firstSelectedIndex; i < currentSets.length; i++) {
            const set = currentSets[i];
            if (!dropsetSelectedSetIds.has(set.id) || set.dropSetId) {
                reorderedSets.push(set);
            }
        }

        // Reconstruct items with headers/footers
        const newItems = reconstructItemsFromSets(reorderedSets);
        setLocalDragItems(newItems);

        // Update parent state via onDragEnd (atomic operation)
        onDragEnd({
            data: newItems as SetDragListItem[],
            from: 0,
            to: 0,
        });

        // Clear selection but stay in dropset mode for creating another dropset
        setDropsetSelectedSetIds(new globalThis.Set());
    }, [dropsetSelectedSetIds, localDragItems, reconstructItemsFromSets, onDragEnd]);

    // Handle canceling any mode
    const handleCancelMode = useCallback(() => {
        setWarmupMode(false);
        setWarmupSelectedSetIds(new globalThis.Set());
        setFailureMode(false);
        setFailureSelectedSetIds(new globalThis.Set());
        setDropsetMode(false);
        setDropsetSelectedSetIds(new globalThis.Set());
    }, []);

    // Handle removing a single set from its dropset
    const handleUngroupDropset = useCallback((setId: string) => {
        // Extract all sets
        const currentSets: Set[] = [];
        localDragItems.forEach(item => {
            if (isSetDragItem(item)) {
                currentSets.push((item as unknown as SetDragItem).set);
            }
        });

        // Find the set being removed and its dropSetId
        const setToRemove = currentSets.find(s => s.id === setId);
        if (!setToRemove || !setToRemove.dropSetId) {
            return;
        }

        const dropSetIdToRemove = setToRemove.dropSetId;

        // Find the index of the first set in the dropset (this is where we'll insert the removed set)
        let firstDropsetSetIndex = -1;
        for (let i = 0; i < currentSets.length; i++) {
            if (currentSets[i].dropSetId === dropSetIdToRemove) {
                firstDropsetSetIndex = i;
                break;
            }
        }

        if (firstDropsetSetIndex === -1) {
            return;
        }

        // Remove dropSetId from the specified set
        const removedSet: Set = (() => {
            const { dropSetId: _, ...rest } = setToRemove;
            return rest as Set;
        })();

        // Reorder: move the removed set before the first set of the dropset
        const reorderedSets: Set[] = [];

        // Add all sets before the dropset (excluding the set being removed)
        for (let i = 0; i < firstDropsetSetIndex; i++) {
            if (currentSets[i].id !== setId) {
                reorderedSets.push(currentSets[i]);
            }
        }

        // Add the removed set (without dropSetId) before the dropset
        reorderedSets.push(removedSet);

        // Add all remaining sets (excluding the set being removed, which is now at its new position)
        for (let i = firstDropsetSetIndex; i < currentSets.length; i++) {
            if (currentSets[i].id !== setId) {
                reorderedSets.push(currentSets[i]);
            }
        }

        // Reconstruct items with headers/footers
        const newItems = reconstructItemsFromSets(reorderedSets);

        // Update local state
        setLocalDragItems(newItems);

        // Update parent state via onDragEnd which sets setDragItems in one atomic operation
        onDragEnd({
            data: newItems as SetDragListItem[],
            from: 0,
            to: 0,
        });

    }, [localDragItems, reconstructItemsFromSets, onDragEnd, isSetDragItem]);

    // Use extracted drag-and-drop functionality
    const {
        renderDragItem,
        keyExtractor: dragKeyExtractor,
    } = useSetRowDragAndDrop({
        localDragItems,
        collapsedDropsetId,
        isDragging,
        exercise,
        addTimerMode,
        restTimerInputOpen: !!restTimerInput,
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
    });

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

    // Memoize currentWorkout for TimerKeyboard to prevent rebuilding on every render
    const timerKeyboardWorkout = useMemo(() => {
        if (!exercise || !restTimerInput) return null;
        
        // Build sets from localDragItems
        const setsFromDragItems: Set[] = [];
        localDragItems.forEach(item => {
            if (isSetDragItem(item)) {
                const set = (item as unknown as SetDragItem).set;
                setsFromDragItems.push({
                    ...set,
                    restPeriodSeconds: set.id === restTimerInput?.setId && restTimerInputString
                        ? parseRestTimeInput(restTimerInputString) > 0
                            ? parseRestTimeInput(restTimerInputString)
                            : undefined
                        : set.restPeriodSeconds,
                });
            }
        });
        
        const sets = setsFromDragItems.length > 0 
            ? setsFromDragItems 
            : exercise.sets.map((s: Set) => ({
                ...s,
                restPeriodSeconds: s.id === restTimerInput?.setId && restTimerInputString
                    ? parseRestTimeInput(restTimerInputString) > 0
                        ? parseRestTimeInput(restTimerInputString)
                        : undefined
                    : s.restPeriodSeconds,
            }));
        
        return {
            id: '',
            name: '',
            startedAt: Date.now(),
            exercises: [{
                ...exercise,
                sets,
            }],
            date: new Date().toISOString(),
        };
    }, [exercise, restTimerInput, localDragItems, restTimerInputString]);

    // Memoize TimerKeyboard display value
    const timerKeyboardDisplayValue = useMemo(() => {
        return restTimerInputString
            ? formatRestTime(parseRestTimeInput(restTimerInputString))
            : '0:00';
    }, [restTimerInputString]);

    // Memoize TimerKeyboard callbacks
    const handleTimerClose = useCallback(() => {
        setRestTimerInput(null);
        setRestTimerInputString('');
        setRestTimerSelectedSetIds(new globalThis.Set());
    }, []);

    const handleWorkoutUpdate = useCallback((workout: any) => {
        // Only handle auto-updates as the user types (when keyboard is open)
        // But don't apply changes if sets are selected - wait for "Apply to" button
        if (!restTimerInput || addTimerMode) return;
        
        // If sets are selected, don't apply changes automatically - wait for "Apply to"
        if (restTimerSelectedSetIds.size > 0) return;
        
        const exerciseItem = workout.exercises[0];
        if (exerciseItem && exerciseItem.type === 'exercise') {
            const updatedSet = exerciseItem.sets.find((s: Set) => s.id === restTimerInput.setId);
            if (updatedSet) {
                // Only update the single set (no selected sets means single set mode)
                onUpdateRestTimer(restTimerInput.setId, updatedSet.restPeriodSeconds);
            }
        }
    }, [restTimerInput, addTimerMode, restTimerSelectedSetIds.size, onUpdateRestTimer]);

    const handleAddRestPeriod = useCallback(() => {
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
    }, [restTimerInput, restTimerInputString, onUpdateRestTimer]);

    const handleSetSelectionMode = useCallback((enabled: boolean) => {
        // Enable/disable selection mode without closing keyboard
        // Sets can be toggled while keyboard is open
        if (enabled) {
            // If no sets are selected yet, select the current set
            if (restTimerSelectedSetIds.size === 0 && restTimerInput) {
                const newSet = new globalThis.Set<string>();
                newSet.add(restTimerInput.setId);
                setRestTimerSelectedSetIds(newSet);
            }
        }
    }, [restTimerSelectedSetIds.size, restTimerInput]);

    const handleToggleSetSelection = useCallback((exerciseId: string, setId: string) => {
        // Toggle set selection while keyboard is open
        const newSet = new globalThis.Set(restTimerSelectedSetIds);
        if (newSet.has(setId)) {
            newSet.delete(setId);
        } else {
            newSet.add(setId);
        }
        setRestTimerSelectedSetIds(newSet);
    }, [restTimerSelectedSetIds]);

    const handleApplyToSelectedSets = useCallback((setIds: string[], seconds: number) => {
        // Apply rest timer to selected sets when "Apply to" is clicked
        onUpdateRestTimerMultiple(setIds, seconds);
    }, [onUpdateRestTimerMultiple]);

    const handleRemoveTimersFromSelectedSets = useCallback((setIds: string[]) => {
        // Remove rest timers from selected sets when "Remove" is clicked
        onUpdateRestTimerMultiple(setIds, undefined);
    }, [onUpdateRestTimerMultiple]);

    // Memoize initial selection mode value
    const timerKeyboardInitialSelectionMode = useMemo(() => {
        return (initialAddTimerMode && initialSelectedSetIds.length > 0) || (!!restTimerInput && restTimerSelectedSetIds.size > 0);
    }, [initialAddTimerMode, initialSelectedSetIds.length, restTimerInput, restTimerSelectedSetIds.size]);

    // Save enabled when: (selection + timer value) OR (user unchecked some sets that had timers = remove timer from those)
    const canSaveAddTimerMode = useMemo(() => {
        return (restTimerSelectedSetIds.size > 0 && !!restTimerInputString) ||
            (initialSelectedSetIds.length > 0 && restTimerSelectedSetIds.size < initialSelectedSetIds.length);
    }, [restTimerSelectedSetIds.size, restTimerInputString, initialSelectedSetIds.length]);

    // Empty callbacks for unused props
    const noopCallback = useCallback(() => {}, []);

    // Handle drag end - expand groups and reconstruct dropset structure
    const handleLocalDragEnd = useCallback(
        createHandleLocalDragEnd(
            collapsedDropsetId,
            setCollapsedDropsetId,
            setLocalDragItems,
            onDragEnd,
            pendingDragRef,
            () => setListLayoutKey(k => k + 1)
        ),
        [collapsedDropsetId, onDragEnd]
    );

    // Stable callbacks for DraggableFlatList to prevent unnecessary re-renders
    const handleDragBegin = useCallback(() => setIsDragging(true), []);
    const handleDragEndWrapper = useCallback((params: { data: CollapsibleSetDragListItem[]; from: number; to: number }) => {
        setIsDragging(false);
        handleLocalDragEnd(params);
    }, [handleLocalDragEnd]);

    // Memoized ListFooterComponent to prevent re-creating JSX on every render
    const listFooter = useMemo(() => (
        restTimerInput && !addTimerMode ? null : (
            <TouchableOpacity
                onPress={onAddSet}
                style={styles.addSetButton}
            >
                <Plus size={18} color={COLORS.blue[600]} />
                <Text style={styles.addSetButtonText}>Add set</Text>
            </TouchableOpacity>
        )
    ), [restTimerInput, addTimerMode, onAddSet]);

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
                                <Text style={styles.title}>Edit Sets</Text>
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

                        {/* Mode Selection Buttons */}
                        {!addTimerMode && (
                            <View style={styles.modeButtonsContainer}>
                                <TouchableOpacity
                                    onPress={handleEnterWarmupMode}
                                    style={[
                                        styles.modeButton,
                                        styles.modeButton__warmup,
                                        warmupMode && styles.modeButton__activeWarmup
                                    ]}
                                >
                                    <Flame size={16} color={COLORS.orange[500]} />
                                    <Text style={styles.modeButtonText}>Warmup</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleEnterFailureMode}
                                    style={[
                                        styles.modeButton,
                                        styles.modeButton__failure,
                                        failureMode && styles.modeButton__activeFailure
                                    ]}
                                >
                                    <Zap size={16} color={COLORS.red[500]} />
                                    <Text style={styles.modeButtonText}>Failure</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleEnterDropsetMode}
                                    style={[
                                        styles.modeButton,
                                        styles.modeButton__dropset,
                                        dropsetMode && styles.modeButton__activeDropset
                                    ]}
                                >
                                    <TrendingDown size={16} color={COLORS.indigo[500]} />
                                    <Text style={styles.modeButtonText}>Dropset</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {localDragItems.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No sets to reorder</Text>
                            </View>
                        ) : (
                            <DraggableFlatList
                                key={listLayoutKey}
                                data={localDragItems}
                                keyExtractor={dragKeyExtractor}
                                renderItem={renderDragItem}
                                onDragBegin={handleDragBegin}
                                onDragEnd={handleDragEndWrapper}
                                containerStyle={styles.listContainer}
                                contentContainerStyle={[
                                    styles.listContent,
                                    restTimerInput && !addTimerMode && { paddingBottom: 250 }
                                ]}
                                ListFooterComponent={listFooter}
                                // Virtualization props for performance
                                initialNumToRender={10}
                                maxToRenderPerBatch={5}
                                windowSize={5}
                                // Keep removeClippedSubviews false for drag-and-drop compatibility
                                removeClippedSubviews={false}
                            />
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
                                            // Remove timer from sets that were initially selected but user unchecked
                                            const uncheckedIds = initialSelectedSetIds.filter(id => !restTimerSelectedSetIds.has(id));
                                            if (uncheckedIds.length > 0) {
                                                onUpdateRestTimerMultiple(uncheckedIds, undefined);
                                            }
                                            // Apply timer to currently selected sets
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
                                            !canSaveAddTimerMode && styles.saveButton__disabled
                                        ]}
                                        disabled={!canSaveAddTimerMode}
                                    >
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : warmupMode || failureMode ? (
                                <View style={styles.footerButtonsRow}>
                                    <TouchableOpacity
                                        onPress={handleCancelMode}
                                        style={styles.cancelButton}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={warmupMode ? handleSaveWarmupMode : handleSaveFailureMode}
                                        style={styles.saveButton}
                                    >
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : dropsetMode ? (
                                <View style={styles.footerButtonsRow}>
                                    <TouchableOpacity
                                        onPress={handleCancelMode}
                                        style={styles.cancelButton}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleSaveDropsetMode}
                                        style={[
                                            styles.saveButton,
                                            dropsetSelectedSetIds.size < 2 && styles.saveButton__disabled
                                        ]}
                                        disabled={dropsetSelectedSetIds.size < 2}
                                    >
                                        <Text style={styles.saveButtonText}>New</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (dropsetSelectedSetIds.size >= 2) {
                                                handleSaveDropsetMode();
                                            }
                                            handleCancelMode();
                                        }}
                                        style={[
                                            styles.saveButton,
                                            dropsetSelectedSetIds.size < 2 && styles.saveButton__disabled
                                        ]}
                                        disabled={dropsetSelectedSetIds.size < 2}
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
                {timerKeyboardWorkout && (
                    <TimerKeyboard
                        visible={!!restTimerInput && !addTimerMode}
                        onClose={handleTimerClose}
                        restTimerInput={restTimerInputString}
                        setRestTimerInput={setRestTimerInputString}
                        restPeriodSetInfo={restPeriodSetInfoMemo}
                        showDisplayAtTop={true}
                        displayValue={timerKeyboardDisplayValue}
                        currentWorkout={timerKeyboardWorkout}
                        handleWorkoutUpdate={handleWorkoutUpdate}
                        onAddRestPeriod={handleAddRestPeriod}
                        setActiveRestTimer={noopCallback}
                        setRestTimerPopupOpen={noopCallback}
                        onSetSelectionMode={handleSetSelectionMode}
                        selectedSetIds={restTimerSelectedSetIds}
                        onToggleSetSelection={handleToggleSetSelection}
                        onApplyToSelectedSets={handleApplyToSelectedSets}
                        onRemoveTimersFromSelectedSets={handleRemoveTimersFromSelectedSets}
                        initialSelectionMode={timerKeyboardInitialSelectionMode}
                    />
                )}
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
        minHeight: '85%',
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
        paddingVertical: 8,
        backgroundColor: COLORS.blue[50],
        borderBottomWidth: 1,
        borderColor: COLORS.blue[100],
    },
    instructionsText: {
        fontSize: 11,
        color: COLORS.blue[700],
        textAlign: 'center',
    },
    modeButtonsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 8,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[200],
    },
    modeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    modeButton__warmup: {
        backgroundColor: COLORS.orange[50],
        borderColor: COLORS.orange[200],
    },
    modeButton__failure: {
        backgroundColor: COLORS.red[50],
        borderColor: COLORS.red[200],
    },
    modeButton__dropset: {
        backgroundColor: COLORS.indigo[50],
        borderColor: COLORS.indigo[200],
    },
    modeButton__active: {
        borderWidth: 1,
        opacity: 1,
    },
    modeButton__activeWarmup: {
        borderWidth: 1,
        borderColor: COLORS.orange[250],
        backgroundColor: COLORS.orange[200],
        opacity: 1,
    },
    modeButton__activeFailure: {
        borderWidth: 1,
        borderColor: COLORS.red[250],
        backgroundColor: COLORS.red[200],
        opacity: 1,
    },
    modeButton__activeDropset: {
        borderWidth: 1,
        borderColor: COLORS.indigo[250],
        backgroundColor: COLORS.indigo[200],
        opacity: 1,
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.slate[700],
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
    // Drag-related styles (dragItem, setIndexBadge, etc.) moved to SetRowDragAndDrop.tsx
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
    // Drag-related styles moved to SetRowDragAndDrop.tsx
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
