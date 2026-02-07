import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, ArrowLeftRight, Lock, Ruler, Settings, Trash2, Timer, Hash, Scale, Info, Footprints, Goal } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { updateExercisesDeep, findExerciseDeep } from '@/utils/workoutHelpers';
import type { Workout, ExerciseLibraryItem, Exercise, DistanceUnitSystem, DistanceUnit } from '@/types/workout';
import SetRowHeadersInformation from './SetRowHeadersInformation';

interface SetRowHeadersPopupProps {
    visible: boolean;
    columnHeaderMenu: { exerciseId: string; field: 'weight' | 'reps' | 'distance' | 'duration'; top: number; left: number } | null;
    columnHeaderMenuPage: 'main' | 'configure';
    setColumnHeaderMenuPage: (page: 'main' | 'configure') => void;
    onClose: () => void;
    currentWorkout: Workout;
    exercisesLibrary: ExerciseLibraryItem[];
    handleWorkoutUpdate: (workout: Workout) => void;
    handleToggleUnit: (instanceId: string) => void;
    getVisibleColumns: (exercise: Exercise, libraryExercise?: ExerciseLibraryItem) => {
        showDuration: boolean;
        showDistance: boolean;
        showWeight: boolean;
        showReps: boolean;
    };
    popupKey: number;
}

type PopupOption = {
    id: string;
    label?: string;
    icon?: React.ReactNode;
    show: boolean;
    isLast?: boolean;
    isActive?: boolean;
    isLocked?: boolean;
    onPress?: () => void;
    disabled?: boolean;
    type?: 'toggle-container' | 'delete-option' | 'set-inputs-container' | 'row-options';
    toggles?: Array<{
        id: string;
        label: string;
        isActive: boolean;
        onPress: () => void;
    }>;
    rowOptions?: Array<{
        id: string;
        label: string;
        subtext?: string;
        isActive: boolean;
        onPress: () => void;
    }>;
    setInputsOption?: {
        label: string;
        icon: React.ReactNode;
        onPress: () => void;
    };
    deleteOption?: {
        icon: React.ReactNode;
        isLocked: boolean;
        disabled: boolean;
        onPress: () => void;
    };
};

const SetRowHeadersPopup: React.FC<SetRowHeadersPopupProps> = ({
    visible,
    columnHeaderMenu,
    columnHeaderMenuPage,
    setColumnHeaderMenuPage,
    onClose,
    currentWorkout,
    exercisesLibrary,
    handleWorkoutUpdate,
    handleToggleUnit,
    getVisibleColumns,
    popupKey
}) => {
    const [infoPopupVisible, setInfoPopupVisible] = useState(false);
    const [infoPopupSection, setInfoPopupSection] = useState<'Weight Units' | 'Multiply x2' | 'Distance Unit'>('Weight Units');

    if (!visible || !columnHeaderMenu) return null;

    const currentExercise = findExerciseDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId);
    if (!currentExercise) return null;

    const libraryExercise = exercisesLibrary.find(ex => ex.id === currentExercise.exerciseId);
    const visibleColumns = getVisibleColumns(currentExercise, libraryExercise);

    // Get exercise state for filtering
    const trackDuration = currentExercise.trackDuration ?? (libraryExercise?.trackDuration as boolean | undefined) ?? false;
    const trackReps = currentExercise.trackReps ?? (libraryExercise?.trackReps as boolean | undefined) ?? false;
    const trackDistance = currentExercise.trackDistance ?? (libraryExercise?.trackDistance as boolean | undefined) ?? false;
    const weightEquipTags = currentExercise.weightEquipTags ?? (libraryExercise?.weightEquipTags as string[] | undefined) ?? [];
    const hasWeightEquip = Array.isArray(weightEquipTags) && weightEquipTags.length > 0;
    const hasWeightUnit = currentExercise.category === "Lifts" || hasWeightEquip;

    // Current column states
    const currentShowDuration = currentExercise.category === 'Cardio' || trackDuration === true;
    const currentShowDistance = currentExercise.category === 'Cardio' || (currentExercise.category === 'Training' && trackDistance === true);
    const currentShowWeight = currentExercise.category === 'Lifts' || (hasWeightEquip && (currentExercise.category === 'Cardio' || currentExercise.category === 'Training'));
    const currentShowReps = currentExercise.category === 'Lifts' || (currentExercise.category === 'Training' && trackReps === true);

    // Lock states
    const isDurationLocked = currentExercise.category === 'Cardio';
    const isRepsLocked = currentExercise.category === 'Lifts';
    const activeColumns = [currentShowDuration, currentShowDistance, currentShowWeight, currentShowReps].filter(Boolean).length;
    const isDurationLockedTraining = currentExercise.category === 'Training' && activeColumns === 1 && currentShowDuration;
    const isDistanceLockedTraining = currentExercise.category === 'Training' && activeColumns === 1 && currentShowDistance;
    const isWeightLockedTraining = currentExercise.category === 'Training' && activeColumns === 1 && currentShowWeight;
    const isRepsLockedTraining = currentExercise.category === 'Training' && activeColumns === 1 && currentShowReps;

    // Distance unit system
    const currentSystem: DistanceUnitSystem = currentExercise.distanceUnitSystem || 'US';
    const currentUnit: DistanceUnit = currentExercise.distanceUnit || (currentSystem === 'US' ? 'mi' : 'm');

    // Toggle handler
    const handleToggleColumn = (column: 'duration' | 'distance' | 'weight' | 'reps', newValue: boolean) => {
        if (column === 'duration' && (isDurationLocked || isDurationLockedTraining)) return;
        if (column === 'reps' && (isRepsLocked || isRepsLockedTraining)) return;
        if (column === 'distance' && isDistanceLockedTraining) return;
        if (column === 'weight' && isWeightLockedTraining) return;

        handleWorkoutUpdate({
            ...currentWorkout,
            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                if (ex.type === 'group') return ex;
                if (column === 'duration') return { ...ex, trackDuration: newValue };
                if (column === 'distance') return { ...ex, trackDistance: newValue };
                if (column === 'reps') return { ...ex, trackReps: newValue };
                return ex;
            })
        });
    };

    const options: PopupOption[] = [];

    // Helper function to create Weight Units row options
    const createWeightUnitsOptions = (idSuffix: string = '') => ({
        id: `weight-unit-row${idSuffix}`,
        type: 'row-options' as const,
        label: 'Weight Units',
        show: true,
        rowOptions: [
            {
                id: `kg-toggle${idSuffix}`,
                label: 'KG',
                isActive: currentExercise?.weightUnit === 'kg' || false,
                onPress: () => {
                    if (currentExercise?.weightUnit !== 'kg') {
                        handleToggleUnit(columnHeaderMenu.exerciseId);
                        onClose();
                    }
                }
            },
            {
                id: `lbs-toggle${idSuffix}`,
                label: 'LBS',
                isActive: currentExercise?.weightUnit === 'lbs' || false,
                onPress: () => {
                    if (currentExercise?.weightUnit !== 'lbs') {
                        handleToggleUnit(columnHeaderMenu.exerciseId);
                        onClose();
                    }
                }
            }
        ]
    });

    // Helper function to create Distance Distance Units row options
    const createDistanceMeasurementUnitsOptions = () => ({
        id: 'distance-measurement-unit-row',
        type: 'row-options' as const,
        label: 'Distance Unit',
        show: true,
        rowOptions: [
            {
                id: 'metric-toggle',
                label: 'Metric',
                isActive: currentSystem === 'Metric',
                onPress: () => {
                    if (currentSystem !== 'Metric') {
                        const defaultUnit: DistanceUnit = 'm';
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return {
                                    ...ex,
                                    distanceUnitSystem: 'Metric',
                                    distanceUnit: defaultUnit
                                };
                            })
                        });
                        onClose();
                    }
                }
            },
            {
                id: 'imperial-toggle',
                label: 'US / Imperial',
                isActive: currentSystem === 'US',
                onPress: () => {
                    if (currentSystem !== 'US') {
                        const defaultUnit: DistanceUnit = 'mi';
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return {
                                    ...ex,
                                    distanceUnitSystem: 'US',
                                    distanceUnit: defaultUnit
                                };
                            })
                        });
                        onClose();
                    }
                }
            }
        ]
    });

    // Helper function to create distance unit option
    const createDistanceUnitOption = (unit: DistanceUnit, label: string) => {
        // Choose icon based on unit
        let icon;
        if (unit === 'ft') {
            icon = <Footprints size={18} color={COLORS.white} />;
        } else if (unit === 'yd') {
            icon = <Goal size={18} color={COLORS.white} />;
        } else {
            icon = <Ruler size={18} color={COLORS.white} />;
        }

        return {
            id: `distance-${unit}`,
            label,
            icon,
            show: true,
            isActive: currentUnit === unit,
            onPress: () => {
                handleWorkoutUpdate({
                    ...currentWorkout,
                    exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                        if (ex.type === 'group') return ex;
                        return { ...ex, distanceUnit: unit };
                    })
                });
                onClose();
            }
        };
    };

    // Helper function to create x2 Totals Adj. row options
    const createX2TotalsAdjOptions = (idSuffix: string = '') => ({
        id: `x2-totals-row${idSuffix}`,
        type: 'row-options' as const,
        label: 'Multiply x2',
        show: true,
        rowOptions: [
            {
                id: `dumbbells-toggle${idSuffix}`,
                label: 'Weight',
                isActive: currentExercise?.multiplyWeightBy2 || false,
                onPress: () => {
                    handleWorkoutUpdate({
                        ...currentWorkout,
                        exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                            if (ex.type === 'group') return ex;
                            return {
                                ...ex,
                                multiplyWeightBy2: !ex.multiplyWeightBy2,
                                alternatingRepsBy2: false,
                                repsConfigMode: undefined
                            };
                        })
                    });
                    onClose();
                }
            },
            {
                id: `alternating-toggle${idSuffix}`,
                label: 'Reps',
                isActive: currentExercise?.alternatingRepsBy2 || false,
                onPress: () => {
                    handleWorkoutUpdate({
                        ...currentWorkout,
                        exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                            if (ex.type === 'group') return ex;
                            const newAlternatingRepsBy2 = !ex.alternatingRepsBy2;
                            return {
                                ...ex,
                                alternatingRepsBy2: newAlternatingRepsBy2,
                                multiplyWeightBy2: false,
                                // Reset repsConfigMode to default when disabling
                                repsConfigMode: newAlternatingRepsBy2 ? (ex.repsConfigMode || '1x2') : undefined
                            };
                        })
                    });
                    onClose();
                }
            }
        ]
    });

    // Helper function to create Reps Config row options
    const createRepsConfigOptions = (idSuffix: string = '') => ({
        id: `reps-config-row${idSuffix}`,
        type: 'row-options' as const,
        label: 'Reps Config',
        show: true,
        rowOptions: [
            {
                id: `1x2-toggle${idSuffix}`,
                label: '1x2',
                isActive: (currentExercise?.repsConfigMode || '1x2') === '1x2',
                onPress: () => {
                    handleWorkoutUpdate({
                        ...currentWorkout,
                        exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                            if (ex.type === 'group') return ex;
                            return {
                                ...ex,
                                repsConfigMode: '1x2'
                            };
                        })
                    });
                    onClose();
                }
            },
            {
                id: `lr-split-toggle${idSuffix}`,
                label: 'L/R Split',
                isActive: currentExercise?.repsConfigMode === 'lrSplit',
                onPress: () => {
                    handleWorkoutUpdate({
                        ...currentWorkout,
                        exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                            if (ex.type === 'group') return ex;
                            return {
                                ...ex,
                                repsConfigMode: 'lrSplit'
                            };
                        })
                    });
                    onClose();
                }
            }
        ]
    });

    // CONFIGURE PAGE OPTIONS
    if (columnHeaderMenuPage === 'configure') {
        // Back button
        options.push({
            id: 'back',
            label: 'Back',
            icon: <ChevronLeft size={18} color={COLORS.white} />,
            show: true,
            onPress: () => setColumnHeaderMenuPage('main')
        });

        // Duration toggle
        options.push({
            id: 'duration-toggle',
            label: 'Duration',
            icon: (isDurationLocked || isDurationLockedTraining) ? <Lock size={18} color={COLORS.white} /> : <Timer size={18} color={COLORS.white} />,
            show: true,
            isActive: currentShowDuration,
            isLocked: isDurationLocked || isDurationLockedTraining,
            disabled: isDurationLocked || isDurationLockedTraining,
            onPress: () => handleToggleColumn('duration', !currentShowDuration)
        });

        // Distance toggle
        options.push({
            id: 'distance-toggle',
            label: 'Distance',
            icon: isDistanceLockedTraining ? <Lock size={18} color={COLORS.white} /> : <Ruler size={18} color={COLORS.white} />,
            show: true,
            isActive: currentShowDistance,
            isLocked: isDistanceLockedTraining,
            disabled: isDistanceLockedTraining,
            onPress: () => handleToggleColumn('distance', !currentShowDistance)
        });

        // Weight toggle
        options.push({
            id: 'weight-toggle',
            label: 'Weight',
            icon: (isWeightLockedTraining || currentExercise.category === 'Lifts') ? <Lock size={18} color={COLORS.white} /> : <Scale size={18} color={COLORS.white} />,
            show: true,
            isActive: currentShowWeight,
            isLocked: isWeightLockedTraining || currentExercise.category === 'Lifts',
            disabled: isWeightLockedTraining || currentExercise.category === 'Lifts',
            onPress: () => { } // Weight controlled by equipment tags
        });

        // Reps toggle (last)
        options.push({
            id: 'reps-toggle',
            label: 'Reps',
            icon: (isRepsLocked || isRepsLockedTraining) ? <Lock size={18} color={COLORS.white} /> : <Hash size={18} color={COLORS.white} />,
            show: true,
            isLast: true,
            isActive: currentShowReps,
            isLocked: isRepsLocked || isRepsLockedTraining,
            disabled: isRepsLocked || isRepsLockedTraining,
            onPress: () => handleToggleColumn('reps', !currentShowReps)
        });
    } else {
        // MAIN PAGE OPTIONS - Filter based on field clicked
        const field = columnHeaderMenu.field;

        // Weight field options
        if (field === 'weight' && visibleColumns.showWeight && hasWeightUnit) {
            // Weight unit row options
            options.push(createWeightUnitsOptions());

            // x2 Totals Adj. row options
            if (visibleColumns.showReps) {
                options.push(createX2TotalsAdjOptions());

                // Reps Config row options (only show when Reps is selected in Multiply x2)
                if (currentExercise?.alternatingRepsBy2) {
                    options.push(createRepsConfigOptions());
                }
            }
        }

        // Reps field options
        if (field === 'reps' && visibleColumns.showReps) {
            // Only show weight-related options if weight column is also visible
            if (visibleColumns.showWeight && hasWeightUnit) {
                // x2 Totals Adj. row options
                options.push(createX2TotalsAdjOptions('-reps'));

                // Reps Config row options (only show when Reps is selected in Multiply x2)
                if (currentExercise?.alternatingRepsBy2) {
                    options.push(createRepsConfigOptions('-reps'));
                }
            }
        }

        // Distance field options
        if (field === 'distance' && visibleColumns.showDistance) {
            // Distance Distance Unit row options
            options.push(createDistanceMeasurementUnitsOptions());

            if (currentSystem === 'US') {
                options.push(createDistanceUnitOption('ft', 'Feet'));
                options.push(createDistanceUnitOption('yd', 'Yards'));
                options.push(createDistanceUnitOption('mi', 'Miles'));
            } else {
                options.push(createDistanceUnitOption('m', 'Meters'));
                options.push(createDistanceUnitOption('km', 'Kilometers'));
            }
        }

        // Determine if current field is locked
        const isCurrentFieldLocked = (() => {
            const field = columnHeaderMenu.field;
            if (field === 'duration') return isDurationLocked || isDurationLockedTraining;
            if (field === 'distance') return isDistanceLockedTraining;
            if (field === 'weight') return isWeightLockedTraining || currentExercise.category === 'Lifts';
            if (field === 'reps') return isRepsLocked || isRepsLockedTraining;
            return false;
        })();

        // "Set inputs" and Delete column container (always last, shown for all fields)
        options.push({
            id: 'set-inputs-container',
            type: 'set-inputs-container',
            show: true,
            isLast: true,
            setInputsOption: {
                label: 'Set inputs',
                icon: <Settings size={18} color={COLORS.white} />,
                onPress: () => setColumnHeaderMenuPage('configure')
            },
            deleteOption: {
                icon: isCurrentFieldLocked ? <Lock size={18} color={COLORS.white} /> : <Trash2 size={18} color={COLORS.white} />,
                isLocked: isCurrentFieldLocked,
                disabled: isCurrentFieldLocked,
                onPress: () => {
                    if (!isCurrentFieldLocked) {
                        const field = columnHeaderMenu.field;
                        handleToggleColumn(field as 'duration' | 'distance' | 'weight' | 'reps', false);
                        onClose();
                    }
                }
            }
        });
    }

    // Filter and render options
    const visibleOptions = options.filter(opt => opt.show);
    const lastIndex = visibleOptions.length - 1;

    return (
        <>
            <Pressable
                style={styles.columnHeaderPopupBackdrop}
                onPress={() => {
                    onClose();
                    setColumnHeaderMenuPage('main');
                }}
            />
            <Pressable
                key={popupKey}
                onPress={(e) => {
                    e.stopPropagation();
                }}
                style={[
                    styles.columnHeaderPopupContainer,
                    {
                        position: 'absolute',
                        top: columnHeaderMenu.top,
                        left: columnHeaderMenu.left,
                        zIndex: 101,
                        elevation: 11,
                    }
                ]}
            >
                {visibleOptions.map((option, index) => {
                    const isLast = index === lastIndex || option.isLast;
                    const isNotFirstOption = index > 0;

                    // Row options type (no padding, options in a row)
                    if (option.type === 'row-options' && option.rowOptions) {
                        return (
                            <View key={option.id} style={[
                                styles.columnHeaderPopupRowOptions,
                                isLast && styles.columnHeaderPopupOptionLast
                            ]}>
                                {option.label && (
                                    <View style={styles.columnHeaderPopupRowOptionsLabelWrapper}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                const sectionMap: Record<string, 'Weight Units' | 'Multiply x2' | 'Distance Unit'> = {
                                                    'Weight Units': 'Weight Units',
                                                    'Multiply x2': 'Multiply x2',
                                                    'Distance Unit': 'Distance Unit'
                                                };
                                                setInfoPopupSection(sectionMap[option.label || ''] || 'Weight Units');
                                                setInfoPopupVisible(true);
                                            }}
                                            style={styles.columnHeaderPopupRowOptionsLabelContainer}
                                        >
                                            <Text style={styles.columnHeaderPopupRowOptionsLabel}>
                                                {option.label}
                                            </Text>
                                            <Info size={12} color={COLORS.slate[300]} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                {option.rowOptions.map((rowOption, rowIndex) => (
                                    <TouchableOpacity
                                        key={rowOption.id}
                                        style={[
                                            styles.columnHeaderPopupRowOption,
                                            styles.columnHeaderPopupRowOptionInactive,
                                            rowIndex < option.rowOptions!.length - 1 && styles.columnHeaderPopupRowOptionBorder,
                                            rowOption.isActive && styles.columnHeaderPopupRowOptionActive,
                                            option.label === 'Distance Unit' && { paddingTop: 24 }
                                        ]}
                                        onPress={rowOption.onPress}
                                    >
                                        <Text style={[
                                            styles.columnHeaderPopupRowOptionText,
                                            styles.columnHeaderPopupRowOptionTextInactive,
                                            rowOption.isActive && styles.columnHeaderPopupRowOptionTextActive,
                                            rowOption.label === 'KG' && { paddingRight: 35 },
                                            rowOption.label === 'LBS' && { paddingLeft: 35 },
                                            rowOption.label === 'Weight' && { paddingRight: 25 },
                                            rowOption.label === 'Reps' && { paddingLeft: 30 },
                                            rowOption.label === 'Metric' && { paddingRight: 0 },
                                            rowOption.label === 'US / Imperial' && { paddingLeft: 0 }
                                        ]}>
                                            {rowOption.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        );
                    }

                    // Set inputs container type (Set inputs + Delete)
                    if (option.type === 'set-inputs-container' && option.setInputsOption && option.deleteOption) {
                        return (
                            <View key={option.id} style={[
                                styles.columnHeaderPopupOptionWrapper,
                                isLast && styles.columnHeaderPopupOptionWrapperLast
                            ]}>
                                <TouchableOpacity
                                    style={[
                                        styles.columnHeaderPopupOption,
                                        styles.columnHeaderPopupOptionFlex,
                                        styles.columnHeaderPopupOptionWithBorder,
                                        isLast && styles.columnHeaderPopupOptionLast
                                    ]}
                                    onPress={option.setInputsOption.onPress}
                                >
                                    <View style={styles.columnHeaderPopupOptionContent}>
                                        {option.setInputsOption.icon}
                                        <Text style={styles.columnHeaderPopupOptionText}>
                                            {option.setInputsOption.label}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.columnHeaderPopupOption,
                                        styles.columnHeaderPopupOptionDelete,
                                        styles.columnHeaderPopupOptionDeleteFixed,
                                        option.deleteOption.isLocked && styles.columnHeaderPopupOptionDeleteDisabled,
                                        isLast && styles.columnHeaderPopupOptionLast
                                    ]}
                                    onPress={option.deleteOption.onPress}
                                    disabled={option.deleteOption.disabled}
                                >
                                    <View style={styles.columnHeaderPopupOptionContent}>
                                        {option.deleteOption.icon}
                                    </View>
                                </TouchableOpacity>
                            </View>
                        );
                    }

                    // Delete option type (standalone, should not appear but keeping for safety)
                    if (option.type === 'delete-option') {
                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.columnHeaderPopupOption,
                                    isLast && styles.columnHeaderPopupOptionLast,
                                    styles.columnHeaderPopupOptionDelete,
                                    option.isLocked && styles.columnHeaderPopupOptionDeleteDisabled
                                ]}
                                onPress={option.onPress}
                                disabled={option.disabled}
                            >
                                <View style={styles.columnHeaderPopupOptionContent}>
                                    {option.icon}
                                </View>
                            </TouchableOpacity>
                        );
                    }

                    // Regular option type
                    return (
                        <TouchableOpacity
                            key={option.id}
                            style={[
                                styles.columnHeaderPopupOption,
                                isLast && styles.columnHeaderPopupOptionLast,
                                option.isActive && styles.columnHeaderPopupOptionActive,
                                option.isLocked && styles.columnHeaderPopupOptionLocked
                            ]}
                            onPress={option.onPress || (() => { })}
                            disabled={option.disabled}
                        >
                            <View style={styles.columnHeaderPopupOptionContent}>
                                {option.icon && option.icon}
                                {option.isLocked && !option.icon && (
                                    <Lock size={18} color={COLORS.white} />
                                )}
                                <Text style={[
                                    styles.columnHeaderPopupOptionText,
                                    option.isActive && styles.columnHeaderPopupOptionTextActive,
                                    option.isLocked && { opacity: 0.6 }
                                ]}>
                                    {option.label}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </Pressable>

            <SetRowHeadersInformation
                visible={infoPopupVisible}
                onClose={() => setInfoPopupVisible(false)}
                initialSection={infoPopupSection}
            />
        </>
    );
};

const styles = StyleSheet.create({
    columnHeaderPopupBackdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 100,
        elevation: 10,
    },
    columnHeaderPopupContainer: {
        position: 'absolute',
        backgroundColor: COLORS.slate[700],
        borderRadius: 8,
        minWidth: 220,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 999,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.slate[200],
    },
    columnHeaderPopupOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[550],
    },
    columnHeaderPopupOptionLast: {
        borderBottomWidth: 0,
    },
    columnHeaderPopupOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    columnHeaderPopupOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.white,
        textTransform: 'none',
        flex: 1,
    },
    columnHeaderPopupOptionActive: {
        backgroundColor: COLORS.blue[500],
    },
    columnHeaderPopupOptionTextActive: {
        color: COLORS.white,
        fontWeight: '600',
    },
    columnHeaderPopupOptionWrapper: {
        flexDirection: 'row',
        alignItems: 'stretch',
        padding: 0,
    },
    columnHeaderPopupOptionWrapperLast: {
        borderBottomWidth: 0,
    },
    columnHeaderPopupOptionFlex: {
        flex: 1,
    },
    columnHeaderPopupOptionWithBorder: {
        borderRightWidth: 1,
        borderRightColor: COLORS.slate[600],
    },
    columnHeaderPopupOptionDeleteFixed: {
        width: 56,
    },
    columnHeaderPopupOptionDelete: {
        backgroundColor: COLORS.red[600],
    },
    columnHeaderPopupOptionDeleteDisabled: {
        backgroundColor: COLORS.slate[600],
        opacity: 0.6,
    },
    columnHeaderPopupOptionLocked: {
        backgroundColor: COLORS.slate[600],
        opacity: 0.6,
    },
    columnHeaderPopupRowOptions: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[500],
        position: 'relative',
    },
    columnHeaderPopupRowOptionsLabelWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        pointerEvents: 'box-none',
        backgroundColor: 'transparent',
    },
    columnHeaderPopupRowOptionsLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: COLORS.slate[700],
        padding: 2,
        paddingHorizontal: 6,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.slate[500],
    },
    columnHeaderPopupRowOptionsLabel: {
        fontSize: 10,
        fontWeight: 'normal',
        color: COLORS.slate[300],
        paddingTop: 0,
    },
    columnHeaderPopupRowOption: {
        flex: 1,
        paddingBottom: 12,
        paddingTop: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    columnHeaderPopupRowOptionBorder: {
        borderRightWidth: 1,
        borderRightColor: COLORS.slate[550],
    },
    columnHeaderPopupRowOptionInactive: {
        backgroundColor: COLORS.slate[650],
    },
    columnHeaderPopupRowOptionActive: {
        backgroundColor: COLORS.blue[500],
    },
    columnHeaderPopupRowOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.white,
    },
    columnHeaderPopupRowOptionTextInactive: {
        color: COLORS.slate[300],
    },
    columnHeaderPopupRowOptionTextActive: {
        color: COLORS.white,
        fontWeight: '600',
    },
});

export default SetRowHeadersPopup;
