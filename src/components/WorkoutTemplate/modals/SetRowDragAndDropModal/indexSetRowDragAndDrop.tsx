import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { X, Timer, TrendingDown, Plus, Flame, Zap, Trash2 } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime, parseRestTimeInput } from '@/utils/workoutHelpers';
import { defaultPopupStyles } from '@/constants/defaultStyles';
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

        // Close index popup if it was for this set
        if (indexPopup && indexPopup.setId === setId) {
            setIndexPopup(null);
        }

        // Close rest timer input if it was for this set
        if (restTimerInput && restTimerInput.setId === setId) {
            setRestTimerInput(null);
            setRestTimerInputString('');
        }
    }, [localDragItems, reconstructItemsFromSets, swipedItemId, indexPopup, restTimerInput, onDragEnd]);

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
        swipedItemId,
        setIndexPopup,
        setRestTimerInput,
        setRestTimerInputString,
        setRestTimerSelectedSetIds,
        setSwipedItemId,
        handleDeleteSet,
        closeTrashIcon,
        initiateDropsetDrag,
        badgeRefs,
        modalContainerRef,
        formatRestTime,
        parseRestTimeInput,
    });

    // Handle ungroup dropset - remove dropSetId from all sets in the dropset
    const handleUngroupDropset = useCallback((dropSetId: string) => {
        // Extract all current sets from localDragItems
        const currentSets: Set[] = [];
        localDragItems.forEach(item => {
            if (isSetDragItem(item)) {
                currentSets.push((item as unknown as SetDragItem).set);
            }
        });

        // Remove dropSetId from all sets in this dropset
        const updatedSets = currentSets.map(set => {
            if (set.dropSetId === dropSetId) {
                const { dropSetId: _, ...rest } = set;
                return rest as Set;
            }
            return set;
        });

        // Reconstruct items with headers/footers (no more dropset headers/footers for this group)
        const newItems = reconstructItemsFromSets(updatedSets);

        // Update local state
        setLocalDragItems(newItems);

        // Update parent state via onDragEnd which sets setDragItems in one atomic operation
        onDragEnd({
            data: newItems as SetDragListItem[],
            from: 0,
            to: 0,
        });

        // Close index popup
        if (indexPopup) {
            setIndexPopup(null);
        }
    }, [localDragItems, reconstructItemsFromSets, indexPopup, onDragEnd]);

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

    // Handle drag end - expand groups and reconstruct dropset structure
    const handleLocalDragEnd = useCallback(
        createHandleLocalDragEnd(
            collapsedDropsetId,
            setCollapsedDropsetId,
            setLocalDragItems,
            onDragEnd,
            pendingDragRef
        ),
        [collapsedDropsetId, onDragEnd]
    );

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
                                keyExtractor={dragKeyExtractor}
                                renderItem={renderDragItem}
                                onDragBegin={() => setIsDragging(true)}
                                onDragEnd={(params) => {
                                    setIsDragging(false);
                                    handleLocalDragEnd(params);
                                }}
                                containerStyle={styles.listContainer}
                                contentContainerStyle={[
                                    styles.listContent,
                                    restTimerInput && !addTimerMode && { paddingBottom: 200 }
                                ]}
                                ListFooterComponent={
                                    restTimerInput && !addTimerMode ? null : (
                                        <TouchableOpacity
                                            onPress={onAddSet}
                                            style={styles.addSetButton}
                                        >
                                            <Plus size={18} color={COLORS.blue[600]} />
                                            <Text style={styles.addSetButtonText}>Add set</Text>
                                        </TouchableOpacity>
                                    )
                                }
                            />
                        )}

                        {/* Index Popup Menu */}
                        {indexPopup && (() => {
                            const setItem = localDragItems.find((i) => isSetDragItem(i) && (i as any).id === indexPopup.setId) as SetDragItem | undefined;
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
                                            !set.dropSetId && defaultPopupStyles.borderBottomLast as any
                                        ]}>
                                            <TouchableOpacity
                                                style={[
                                                    defaultPopupStyles.toggleOption as any,
                                                    defaultPopupStyles.toggleOptionBorder as any,
                                                    set.isWarmup ? defaultPopupStyles.toggleOptionBackgroundActive as any : defaultPopupStyles.toggleOptionBackgroundInactive as any,
                                                    defaultPopupStyles.borderRadiusFirstLeft as any,
                                                    !set.dropSetId && defaultPopupStyles.borderRadiusLastLeft as any,
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
                                                    !set.dropSetId && defaultPopupStyles.borderRadiusLastRight as any,
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

                                        {/* Create Dropset / Delete Set Row */}
                                        {!set.dropSetId && (
                                            <View style={[
                                                defaultPopupStyles.optionRow as any,
                                                defaultPopupStyles.borderBottomLast as any,
                                            ]}>
                                                <TouchableOpacity
                                                    style={[
                                                        defaultPopupStyles.optionInRow as any,
                                                        defaultPopupStyles.optionBackground as any,
                                                        defaultPopupStyles.optionFlex as any,
                                                        defaultPopupStyles.optionRowWithBorder as any,
                                                        defaultPopupStyles.borderRadiusLastLeft as any,
                                                    ]}
                                                    onPress={() => {
                                                        onCreateDropset(set.id);
                                                        setIndexPopup(null);
                                                    }}
                                                >
                                                    <View style={defaultPopupStyles.optionContent as any}>
                                                        <TrendingDown size={18} color={COLORS.indigo[400]} />
                                                        <Text style={defaultPopupStyles.optionText as any}>Create dropset</Text>
                                                    </View>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[
                                                        defaultPopupStyles.iconOnlyOption as any,
                                                        defaultPopupStyles.optionInRow as any,
                                                        defaultPopupStyles.borderRadiusLastRight as any,
                                                    ]}
                                                    onPress={() => {
                                                        handleDeleteSet(set.id);
                                                        setIndexPopup(null);
                                                    }}
                                                >
                                                    <View style={defaultPopupStyles.optionContent as any}>
                                                        <Trash2 size={18} color={COLORS.white} />
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        {/* Ungroup Dropset / Delete Set Row */}
                                        {set.dropSetId && (
                                            <View style={[
                                                defaultPopupStyles.optionRow as any,
                                                defaultPopupStyles.borderBottomLast as any,
                                            ]}>
                                                <TouchableOpacity
                                                    style={[
                                                        defaultPopupStyles.optionInRow as any,
                                                        defaultPopupStyles.optionBackground as any,
                                                        defaultPopupStyles.optionFlex as any,
                                                        defaultPopupStyles.optionRowWithBorder as any,
                                                        defaultPopupStyles.borderRadiusLastLeft as any,
                                                    ]}
                                                    onPress={() => {
                                                        handleUngroupDropset(set.dropSetId!);
                                                        setIndexPopup(null);
                                                    }}
                                                >
                                                    <View style={defaultPopupStyles.optionContent as any}>
                                                        <TrendingDown size={18} color={COLORS.indigo[400]} />
                                                        <Text style={defaultPopupStyles.optionText as any}>
                                                            Ungroup dropset
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[
                                                        defaultPopupStyles.iconOnlyOption as any,
                                                        defaultPopupStyles.optionInRow as any,
                                                        defaultPopupStyles.borderRadiusLastRight as any,
                                                    ]}
                                                    onPress={() => {
                                                        handleDeleteSet(set.id);
                                                        setIndexPopup(null);
                                                    }}
                                                >
                                                    <View style={defaultPopupStyles.optionContent as any}>
                                                        <Trash2 size={18} color={COLORS.white} />
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </Pressable>
                                </Pressable>
                            );
                        })()}

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
                    showDisplayAtTop={true}
                    displayValue={restTimerInputString
                        ? formatRestTime(parseRestTimeInput(restTimerInputString))
                        : '0:00'
                    }
                    currentWorkout={{
                        id: '',
                        name: '',
                        startedAt: Date.now(),
                        exercises: exercise ? [{
                            ...exercise,
                            sets: (() => {
                                // Use sets from localDragItems instead of exercise.sets
                                // to ensure IDs match what's actually in the modal
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
                                return setsFromDragItems.length > 0 ? setsFromDragItems : exercise.sets.map((s: Set) => ({
                                    ...s,
                                    restPeriodSeconds: s.id === restTimerInput?.setId && restTimerInputString
                                        ? parseRestTimeInput(restTimerInputString) > 0
                                            ? parseRestTimeInput(restTimerInputString)
                                            : undefined
                                        : s.restPeriodSeconds,
                                }));
                            })(),
                        }] : [],
                        date: new Date().toISOString(),
                    }}
                    handleWorkoutUpdate={(workout: any) => {
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
                    onSetSelectionMode={(enabled: boolean) => {
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
                    }}
                    selectedSetIds={restTimerSelectedSetIds}
                    onToggleSetSelection={(exerciseId: string, setId: string) => {
                        // Toggle set selection while keyboard is open
                        const newSet = new globalThis.Set(restTimerSelectedSetIds);
                        if (newSet.has(setId)) {
                            newSet.delete(setId);
                        } else {
                            newSet.add(setId);
                        }
                        setRestTimerSelectedSetIds(newSet);
                    }}
                    onApplyToSelectedSets={(setIds: string[], seconds: number) => {
                        // Apply rest timer to selected sets when "Apply to" is clicked
                        onUpdateRestTimerMultiple(setIds, seconds);
                    }}
                    onRemoveTimersFromSelectedSets={(setIds: string[]) => {
                        // Remove rest timers from selected sets when "Remove" is clicked
                        onUpdateRestTimerMultiple(setIds, undefined);
                    }}
                    initialSelectionMode={initialAddTimerMode && initialSelectedSetIds.length > 0 || (!!restTimerInput && restTimerSelectedSetIds.size > 0)}
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
