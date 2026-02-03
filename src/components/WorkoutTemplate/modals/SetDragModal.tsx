import React, { useCallback, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, TextInput, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { X, Timer, Flame, Zap, Check, Layers, Plus, Square } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime, parseRestTimeInput } from '@/utils/workoutHelpers';
import type { Exercise, Set, ExerciseCategory } from '@/types/workout';
import type { SetDragListItem, SetDragItem, DropSetHeaderItem, DropSetFooterItem } from '../hooks/useSetDragAndDrop';

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
    const [applyToMode, setApplyToMode] = useState<{ selectedSetIds: string[] } | null>(null);
    const badgeRefs = useRef<Map<string, View>>(new Map());
    const modalContainerRef = useRef<View>(null);
    const renderDropSetHeader = useCallback((item: DropSetHeaderItem) => {
        return (
            <View
                style={styles.dropsetHeader}
                pointerEvents="box-none"
            >
                <Text style={styles.dropsetHeaderText}>Dropset ({item.setCount} sets)</Text>
            </View>
        );
    }, []);

    const renderDropSetFooter = useCallback((item: DropSetFooterItem) => {
        return (
            <View
                style={styles.dropsetFooter}
                pointerEvents="box-none"
            />
        );
    }, []);

    const renderDragItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<SetDragListItem>) => {
        // Handle dropset headers and footers (non-draggable)
        if (item.type === 'dropset_header') {
            return renderDropSetHeader(item);
        }
        if (item.type === 'dropset_footer') {
            return renderDropSetFooter(item);
        }

        // Handle regular sets
        const setItem = item as SetDragItem;
        const set = setItem.set;
        const category = exercise?.category || 'Lifts';
        const weightUnit = exercise?.weightUnit || 'lbs';

        // Get the position in the full array (including headers/footers)
        const fullArrayIndex = getIndex() ?? 0;

        // Count how many sets come before this position (excluding headers/footers)
        let setCountBefore = 0;
        for (let i = 0; i < fullArrayIndex; i++) {
            if (setDragItems[i]?.type === 'set') {
                setCountBefore++;
            }
        }

        // Get all sets in order for dropset calculations
        const allSets = setDragItems.filter((i): i is SetDragItem => i.type === 'set');
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

        return (
            <TouchableOpacity
                onLongPress={drag}
                delayLongPress={100}
                disabled={isActive}
                activeOpacity={1}
                style={[
                    styles.dragItem,
                    isActive && styles.dragItem__active,
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
                        // Always reset to input mode when opening the modal
                        setApplyToMode(null);
                        setRestTimerInput({
                            setId: set.id,
                            currentValue,
                        });
                    }}
                    style={[
                        styles.restTimerBadge,
                        !setItem.hasRestTimer && styles.restTimerBadge__add
                    ]}
                >
                    <Timer size={12} color={setItem.hasRestTimer ? COLORS.blue[500] : COLORS.slate[400]} />
                    <Text style={[
                        styles.restTimerText,
                        !setItem.hasRestTimer && styles.restTimerText__add
                    ]}>
                        {setItem.hasRestTimer
                            ? formatRestTime(set.restPeriodSeconds!)
                            : '+ rest'
                        }
                    </Text>
                </TouchableOpacity>

                {set.dropSetId && (
                    <View style={styles.dropSetIndicator} />
                )}
            </TouchableOpacity>
        );
    }, [exercise, setDragItems, renderDropSetHeader, renderDropSetFooter]);

    const keyExtractor = useCallback((item: SetDragListItem) => item.id, []);

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

                        {setDragItems.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No sets to reorder</Text>
                            </View>
                        ) : (
                            <DraggableFlatList
                                data={setDragItems}
                                keyExtractor={keyExtractor}
                                renderItem={renderDragItem}
                                onDragEnd={onDragEnd}
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
                            const setItem = setDragItems.find((i): i is SetDragItem => i.type === 'set' && i.id === indexPopup.setId);
                            const set = setItem?.set;
                            if (!set) return null;

                            return (
                                <Pressable
                                    onPress={() => setIndexPopup(null)}
                                    style={styles.popupOverlay}
                                >
                                    <Pressable
                                        onPress={(e) => e.stopPropagation()}
                                        style={[
                                            styles.setPopupMenuContainer,
                                            {
                                                position: 'absolute',
                                                top: indexPopup.top,
                                                left: indexPopup.left,
                                                zIndex: 100,
                                                elevation: 10,
                                            }
                                        ]}
                                    >
                                        <TouchableOpacity
                                            style={styles.closeButton}
                                            onPress={() => setIndexPopup(null)}
                                        >
                                            <X size={16} color={COLORS.white} />
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.setPopupOptionItem}
                                            onPress={() => {
                                                const newIsWarmup = !set.isWarmup;
                                                onUpdateSet(set.id, {
                                                    isWarmup: newIsWarmup,
                                                    isFailure: newIsWarmup ? false : set.isFailure,
                                                });
                                                setIndexPopup(null);
                                            }}
                                        >
                                            <Flame size={18} color={COLORS.orange[500]} />
                                            <Text style={[
                                                styles.setPopupOptionText,
                                                set.isWarmup && styles.setPopupOptionText__warmup
                                            ]}>Warmup</Text>
                                            {set.isWarmup && <Check size={16} color={COLORS.orange[500]} strokeWidth={3} />}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.setPopupOptionItem}
                                            onPress={() => {
                                                const newIsFailure = !set.isFailure;
                                                onUpdateSet(set.id, {
                                                    isFailure: newIsFailure,
                                                    isWarmup: newIsFailure ? false : set.isWarmup,
                                                });
                                                setIndexPopup(null);
                                            }}
                                        >
                                            <Zap size={18} color={COLORS.red[500]} />
                                            <Text style={[
                                                styles.setPopupOptionText,
                                                set.isFailure && styles.setPopupOptionText__failure
                                            ]}>Failure</Text>
                                            {set.isFailure && <Check size={16} color={COLORS.red[500]} strokeWidth={3} />}
                                        </TouchableOpacity>

                                        {!set.dropSetId && (
                                            <TouchableOpacity
                                                style={[styles.setPopupOptionItem, { borderBottomWidth: 0 }]}
                                                onPress={() => {
                                                    onCreateDropset(set.id);
                                                    setIndexPopup(null);
                                                }}
                                            >
                                                <Layers size={18} color={COLORS.indigo[600]} />
                                                <Text style={styles.setPopupOptionText}>Create dropset</Text>
                                            </TouchableOpacity>
                                        )}
                                    </Pressable>
                                </Pressable>
                            );
                        })()}

                        {/* Rest Timer Input Modal */}
                        {restTimerInput && (
                            <Pressable
                                onPress={() => {
                                    setRestTimerInput(null);
                                    setApplyToMode(null);
                                }}
                                style={styles.restTimerInputOverlay}
                            >
                                <Pressable
                                    onPress={(e) => e.stopPropagation()}
                                    style={styles.restTimerInputContainer}
                                >
                                    <View style={styles.restTimerInputHeader}>
                                        <Text style={styles.restTimerInputTitle}>
                                            {setDragItems.find((i): i is SetDragItem => i.type === 'set' && i.id === restTimerInput.setId)?.set.restPeriodSeconds
                                                ? 'Update Rest Timer'
                                                : 'Add Rest Timer'
                                            }
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setRestTimerInput(null);
                                                setApplyToMode(null);
                                            }}
                                            style={styles.restTimerInputClose}
                                        >
                                            <X size={20} color={COLORS.slate[600]} />
                                        </TouchableOpacity>
                                    </View>

                                    {!applyToMode ? (
                                        <View style={styles.restTimerInputContent}>
                                            <Text style={styles.restTimerInputLabel}>
                                                Enter time (e.g., 90 for 1:30, 30 for 30 seconds)
                                            </Text>
                                            <TextInput
                                                style={styles.restTimerInput}
                                                value={restTimerInput.currentValue}
                                                onChangeText={(text) => {
                                                    // Only allow numbers
                                                    const numericText = text.replace(/[^0-9]/g, '');
                                                    setRestTimerInput({
                                                        ...restTimerInput,
                                                        currentValue: numericText,
                                                    });
                                                }}
                                                placeholder="e.g., 90"
                                                keyboardType="numeric"
                                                autoFocus
                                            />
                                        </View>
                                    ) : (
                                        <View style={styles.restTimerInputContent}>
                                            <ScrollView style={styles.setSelectionList}>
                                                {setDragItems
                                                    .filter((i): i is SetDragItem => i.type === 'set')
                                                    .map((item, itemIndex) => {
                                                        const isSelected = applyToMode.selectedSetIds.includes(item.id);
                                                        const set = item.set;
                                                        const category = exercise?.category || 'Lifts';
                                                        const weightUnit = exercise?.weightUnit || 'lbs';

                                                        // Get all sets in order for dropset calculations
                                                        const allSets = setDragItems.filter((i): i is SetDragItem => i.type === 'set');
                                                        const currentSetIndex = itemIndex;

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

                                                        return (
                                                            <TouchableOpacity
                                                                key={item.id}
                                                                style={[
                                                                    styles.setSelectionItem,
                                                                    isSelected && styles.setSelectionItem__selected,
                                                                    set.dropSetId && styles.setSelectionItem__dropset
                                                                ]}
                                                                onPress={() => {
                                                                    const newSelected = [...applyToMode.selectedSetIds];
                                                                    if (isSelected) {
                                                                        const index = newSelected.indexOf(item.id);
                                                                        if (index > -1) {
                                                                            newSelected.splice(index, 1);
                                                                        }
                                                                    } else {
                                                                        newSelected.push(item.id);
                                                                    }
                                                                    setApplyToMode({ selectedSetIds: newSelected });
                                                                }}
                                                            >
                                                                <View style={styles.setSelectionItemLeft}>
                                                                    {isSelected ? (
                                                                        <Check size={20} color={COLORS.blue[600]} strokeWidth={3} />
                                                                    ) : (
                                                                        <Square size={20} color={COLORS.slate[400]} />
                                                                    )}
                                                                    <View style={styles.setSelectionItemInfo}>
                                                                        <View style={styles.setSelectionItemHeader}>
                                                                            <Text style={[
                                                                                styles.setSelectionItemIndex,
                                                                                isSubIndex && styles.setSelectionItemIndex__subIndex
                                                                            ]}>
                                                                                {displayIndexText}
                                                                            </Text>
                                                                            <Text style={styles.setSelectionItemDetails}>
                                                                                {category === 'Lifts' ? (
                                                                                    `${set.weight || '-'} ${weightUnit} × ${set.reps || '-'}`
                                                                                ) : category === 'Cardio' ? (
                                                                                    `${set.duration || '-'} / ${set.distance || '-'}`
                                                                                ) : (
                                                                                    `${set.reps || '-'} reps`
                                                                                )}
                                                                            </Text>
                                                                            {set.dropSetId && (
                                                                                <View style={styles.setSelectionItemDropsetBadge}>
                                                                                    <Text style={styles.setSelectionItemDropsetText}>D</Text>
                                                                                </View>
                                                                            )}
                                                                            {set.isWarmup && (
                                                                                <View style={[styles.setSelectionItemTypeBadge, styles.setSelectionItemTypeBadge__warmup]}>
                                                                                    <Flame size={12} color={COLORS.orange[500]} />
                                                                                </View>
                                                                            )}
                                                                            {set.isFailure && (
                                                                                <View style={[styles.setSelectionItemTypeBadge, styles.setSelectionItemTypeBadge__failure]}>
                                                                                    <Zap size={12} color={COLORS.red[500]} />
                                                                                </View>
                                                                            )}
                                                                        </View>
                                                                    </View>
                                                                </View>
                                                                {set.restPeriodSeconds && (
                                                                    <View style={styles.setSelectionItemRestTimer}>
                                                                        <Timer size={14} color={COLORS.blue[500]} />
                                                                        <Text style={styles.setSelectionItemRestTimerText}>
                                                                            {formatRestTime(set.restPeriodSeconds)}
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                            </ScrollView>
                                        </View>
                                    )}

                                    <View style={styles.restTimerInputFooter}>
                                        {!applyToMode ? (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    if (restTimerInput.currentValue) {
                                                        const seconds = parseRestTimeInput(restTimerInput.currentValue);
                                                        if (seconds > 0) {
                                                            // Initialize with current set selected
                                                            const initialSelected = [restTimerInput.setId];
                                                            setApplyToMode({ selectedSetIds: initialSelected });
                                                        }
                                                    }
                                                }}
                                                style={[
                                                    styles.restTimerInputApplyToButton,
                                                    (!restTimerInput.currentValue || parseRestTimeInput(restTimerInput.currentValue) <= 0) && styles.restTimerInputApplyToButton__disabled
                                                ]}
                                                disabled={!restTimerInput.currentValue || parseRestTimeInput(restTimerInput.currentValue) <= 0}
                                            >
                                                <Text style={[
                                                    styles.restTimerInputApplyToText,
                                                    (!restTimerInput.currentValue || parseRestTimeInput(restTimerInput.currentValue) <= 0) && styles.restTimerInputApplyToText__disabled
                                                ]}>Apply to</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        setApplyToMode(null);
                                                    }}
                                                    style={styles.restTimerInputCancelButton}
                                                >
                                                    <Text style={styles.restTimerInputCancelText}>Back</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => {
                                                        if (restTimerInput.currentValue) {
                                                            const seconds = parseRestTimeInput(restTimerInput.currentValue);
                                                            if (seconds > 0 && applyToMode.selectedSetIds.length > 0) {
                                                                onUpdateRestTimerMultiple(
                                                                    applyToMode.selectedSetIds,
                                                                    seconds
                                                                );
                                                            }
                                                        }
                                                        setApplyToMode(null);
                                                        setRestTimerInput(null);
                                                    }}
                                                    style={[
                                                        styles.restTimerInputSaveButton,
                                                        applyToMode.selectedSetIds.length === 0 && styles.restTimerInputSaveButton__disabled
                                                    ]}
                                                    disabled={applyToMode.selectedSetIds.length === 0}
                                                >
                                                    <Text style={[
                                                        styles.restTimerInputSaveText,
                                                        applyToMode.selectedSetIds.length === 0 && styles.restTimerInputSaveText__disabled
                                                    ]}>
                                                        {(() => {
                                                            const seconds = restTimerInput.currentValue
                                                                ? parseRestTimeInput(restTimerInput.currentValue)
                                                                : 0;
                                                            const formattedTime = seconds > 0 ? formatRestTime(seconds) : '';
                                                            return `Apply ${formattedTime} to set(s)`;
                                                        })()}
                                                    </Text>
                                                </TouchableOpacity>
                                            </>
                                        )}
                                    </View>
                                </Pressable>
                            </Pressable>
                        )}

                        <View style={styles.footer}>
                            <TouchableOpacity onPress={onSave} style={styles.doneButton}>
                                <Text style={styles.doneButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
    dragItem__active: {
        backgroundColor: COLORS.slate[50],
        borderColor: COLORS.slate[400],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        transform: [{ scale: 1.02 }],
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
        marginLeft: 8,
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
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: COLORS.indigo[500],
        borderTopLeftRadius: 10,
        borderBottomLeftRadius: 10,
    },
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.slate[200],
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
    dropsetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 2,
        marginHorizontal: 18,
        marginTop: 8,
        marginBottom: 0,
        backgroundColor: COLORS.indigo[200],
        borderWidth: 2,
        borderColor: COLORS.indigo[200],
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderStyle: 'solid',
    },
    dropsetHeaderText: {
        fontSize: 9,
        fontWeight: '700',
        color: COLORS.indigo[700],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dropsetFooter: {
        height: 8,
        marginHorizontal: 18,
        marginTop: 4,
        marginBottom: 4,
        backgroundColor: COLORS.indigo[200],
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    popupOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99,
    },
    setPopupMenuContainer: {
        width: 200,
        backgroundColor: COLORS.white,
        borderRadius: 8,
        padding: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 1,
        borderColor: COLORS.slate[100],
    },
    setPopupOptionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[100],
    },
    setPopupOptionText: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.slate[700],
        flex: 1,
    },
    setPopupOptionText__warmup: {
        color: COLORS.orange[500],
        fontWeight: '700',
    },
    setPopupOptionText__failure: {
        color: COLORS.red[500],
        fontWeight: '700',
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
    restTimerInputOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        elevation: 10,
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
    restTimerInputClose: {
        padding: 4,
    },
    restTimerInputContent: {
        padding: 16,
    },
    restTimerInputLabel: {
        fontSize: 14,
        color: COLORS.slate[600],
        marginBottom: 12,
    },
    restTimerInput: {
        borderWidth: 1,
        borderColor: COLORS.slate[300],
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: COLORS.slate[800],
        backgroundColor: COLORS.white,
    },
    restTimerInputFooter: {
        flexDirection: 'row',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.slate[200],
        gap: 12,
    },
    restTimerInputSaveButton: {
        flex: 1,
        backgroundColor: COLORS.blue[600],
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    restTimerInputSaveText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    restTimerInputRemoveButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.red[300],
    },
    restTimerInputRemoveText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.red[600],
    },
    restTimerInputApplyToButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.blue[300],
        backgroundColor: COLORS.blue[600],
    },
    restTimerInputApplyToButton__disabled: {
        backgroundColor: COLORS.slate[200],
        borderColor: COLORS.slate[300],
    },
    restTimerInputApplyToText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    restTimerInputApplyToText__disabled: {
        color: COLORS.slate[400],
    },
    restTimerInputCancelButton: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.slate[300],
    },
    restTimerInputCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.slate[600],
    },
    restTimerInputSaveButton__disabled: {
        backgroundColor: COLORS.slate[200],
    },
    restTimerInputSaveText__disabled: {
        color: COLORS.slate[400],
    },
    setSelectionList: {
        marginTop: 8,
    },
    setSelectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 4,
        borderRadius: 8,
        backgroundColor: COLORS.slate[50],
        borderWidth: 1,
        borderColor: COLORS.slate[200],
    },
    setSelectionItem__selected: {
        backgroundColor: COLORS.blue[50],
        borderColor: COLORS.blue[300],
    },
    setSelectionItem__dropset: {
        borderLeftWidth: 3,
        borderLeftColor: COLORS.indigo[400],
    },
    setSelectionItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    setSelectionItemInfo: {
        flex: 1,
    },
    setSelectionItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    setSelectionItemIndex: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.slate[700],
    },
    setSelectionItemIndex__subIndex: {
        fontSize: 12,
        color: COLORS.slate[500],
    },
    setSelectionItemDropsetBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.indigo[50],
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    setSelectionItemDropsetText: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.indigo[700],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    setSelectionItemTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    setSelectionItemTypeBadge__warmup: {
        backgroundColor: COLORS.orange[50],
    },
    setSelectionItemTypeBadge__failure: {
        backgroundColor: COLORS.red[50],
    },
    setSelectionItemTypeText__warmup: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.orange[600],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    setSelectionItemTypeText__failure: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.red[600],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    setSelectionItemDetails: {
        fontSize: 12,
        color: COLORS.slate[500],
    },
    setSelectionItemRestTimer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.blue[50],
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    setSelectionItemRestTimerText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.blue[600],
    },
});

export default SetDragModal;
