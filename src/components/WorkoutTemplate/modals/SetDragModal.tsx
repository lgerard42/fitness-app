import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { GripVertical, X, Timer, Flame, Zap, Check } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { formatRestTime } from '@/utils/workoutHelpers';
import type { Exercise, Set, ExerciseCategory } from '@/types/workout';

interface SetDragItem {
    id: string;
    set: Set;
    hasRestTimer: boolean;
}

interface SetDragModalProps {
    visible: boolean;
    exercise: Exercise | null;
    setDragItems: SetDragItem[];
    onDragEnd: (params: { data: SetDragItem[]; from: number; to: number }) => void;
    onCancel: () => void;
}

const SetDragModal: React.FC<SetDragModalProps> = ({
    visible,
    exercise,
    setDragItems,
    onDragEnd,
    onCancel,
}) => {
    const renderDragItem = useCallback(({ item, drag, isActive, getIndex }: RenderItemParams<SetDragItem>) => {
        const set = item.set;
        const category = exercise?.category || 'Lifts';
        const weightUnit = exercise?.weightUnit || 'lbs';

        // Get the actual index from DraggableFlatList
        const setIndex = getIndex() ?? 0;

        // Simple 1-based index for display (set number in the exercise)
        const displayIndex = setIndex + 1;

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
                <View style={styles.dragHandle}>
                    <GripVertical size={20} color={COLORS.slate[400]} />
                </View>

                <View style={[
                    styles.setIndexBadge,
                    set.isWarmup && styles.setIndexBadge__warmup,
                    set.isFailure && styles.setIndexBadge__failure,
                ]}>
                    <Text style={[
                        styles.setIndexText,
                        set.isWarmup && styles.setIndexText__warmup,
                        set.isFailure && styles.setIndexText__failure,
                    ]}>
                        {displayIndex}
                    </Text>
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

                {item.hasRestTimer && (
                    <View style={styles.restTimerBadge}>
                        <Timer size={12} color={COLORS.blue[500]} />
                        <Text style={styles.restTimerText}>
                            {formatRestTime(set.restPeriodSeconds!)}
                        </Text>
                    </View>
                )}

                {set.dropSetId && (
                    <View style={styles.dropSetIndicator} />
                )}
            </TouchableOpacity>
        );
    }, [exercise]);

    const keyExtractor = useCallback((item: SetDragItem) => item.id, []);

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
                    <View style={styles.modalContainer}>
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
                            />
                        )}

                        <View style={styles.footer}>
                            <TouchableOpacity onPress={onCancel} style={styles.doneButton}>
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
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginHorizontal: 12,
        marginVertical: 4,
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
    dragHandle: {
        marginRight: 12,
        padding: 4,
    },
    setIndexBadge: {
        width: 32,
        height: 28,
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
    restTimerText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.blue[600],
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
});

export default SetDragModal;
