import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, ArrowLeftRight, Lock, Ruler, Settings, Trash2, Timer, Hash, Scale, Info, Footprints, Goal } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { defaultPopupStyles } from '@/constants/defaultStyles';
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
    const [infoPopupSection, setInfoPopupSection] = useState<'Duration' | 'Distance' | 'Weight' | 'Reps'>('Weight');

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
                isActive: currentExercise?.weightUnit === 'kg',
                onPress: () => {
                    if (currentExercise?.weightUnit !== 'kg') {
                        handleToggleUnit(columnHeaderMenu.exerciseId);
                    }
                }
            },
            {
                id: `lbs-toggle${idSuffix}`,
                label: 'LBS',
                isActive: currentExercise?.weightUnit === 'lbs' || !currentExercise?.weightUnit,
                onPress: () => {
                    if (currentExercise?.weightUnit !== 'lbs') {
                        handleToggleUnit(columnHeaderMenu.exerciseId);
                    }
                }
            }
        ]
    });

    // Helper function to create Distance Distance Units row options
    const createDistanceMeasurementUnitsOptions = () => ({
        id: 'distance-measurement-unit-row',
        type: 'row-options' as const,
        label: 'Dist. Measurement Units',
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
                    }
                }
            },
            {
                id: 'imperial-toggle',
                label: 'US / Imperial',
                isActive: currentSystem === 'US' || !currentExercise?.distanceUnitSystem,
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
                    }
                }
            }
        ]
    });

    // Helper function to create Measurement Unit row options
    const createMeasurementUnitOptions = () => {
        const rowOptions = [];

        if (currentSystem === 'US') {
            // US/Imperial units
            rowOptions.push(
                {
                    id: 'ft-toggle',
                    label: 'Feet',
                    isActive: currentUnit === 'ft',
                    onPress: () => {
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return { ...ex, distanceUnit: 'ft' };
                            })
                        });
                    }
                },
                {
                    id: 'yd-toggle',
                    label: 'Yards',
                    isActive: currentUnit === 'yd',
                    onPress: () => {
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return { ...ex, distanceUnit: 'yd' };
                            })
                        });
                    }
                },
                {
                    id: 'mi-toggle',
                    label: 'Miles',
                    isActive: currentUnit === 'mi' || (!currentExercise?.distanceUnit && currentSystem === 'US'),
                    onPress: () => {
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return { ...ex, distanceUnit: 'mi' };
                            })
                        });
                    }
                }
            );
        } else {
            // Metric units
            rowOptions.push(
                {
                    id: 'm-toggle',
                    label: 'Meters',
                    isActive: currentUnit === 'm',
                    onPress: () => {
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return { ...ex, distanceUnit: 'm' };
                            })
                        });
                    }
                },
                {
                    id: 'km-toggle',
                    label: 'Kilometers',
                    isActive: currentUnit === 'km',
                    onPress: () => {
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return { ...ex, distanceUnit: 'km' };
                            })
                        });
                    }
                }
            );
        }

        return {
            id: 'measurement-unit-row',
            type: 'row-options' as const,
            label: 'Unit Type',
            show: true,
            rowOptions
        };
    };

    // Helper function to create Total Weight Calc row options
    const createTotalWeightCalcOptions = (idSuffix: string = '') => ({
        id: `total-weight-calc-row${idSuffix}`,
        type: 'row-options' as const,
        label: 'Total Weight Config',
        show: true,
        rowOptions: [
            {
                id: `1x-input-toggle${idSuffix}`,
                label: '1x',
                isActive: (currentExercise?.weightCalcMode || '1x') === '1x',
                onPress: () => {
                    handleWorkoutUpdate({
                        ...currentWorkout,
                        exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                            if (ex.type === 'group') return ex;
                            return {
                                ...ex,
                                weightCalcMode: '1x',
                                // Clear deprecated field
                                multiplyWeightBy2: false
                            };
                        })
                    });
                }
            },
            {
                id: `2x-input-toggle${idSuffix}`,
                label: '2x',
                isActive: currentExercise?.weightCalcMode === '2x',
                onPress: () => {
                    handleWorkoutUpdate({
                        ...currentWorkout,
                        exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                            if (ex.type === 'group') return ex;
                            return {
                                ...ex,
                                weightCalcMode: '2x',
                                // Clear deprecated field
                                multiplyWeightBy2: false
                            };
                        })
                    });
                }
            }
        ]
    });

    // Helper function to create Reps Config row options
    const createRepsConfigOptions = (idSuffix: string = '') => ({
        id: `reps-config-row${idSuffix}`,
        type: 'row-options' as const,
        label: 'Total Reps Config',
        show: true,
        rowOptions: [
            {
                id: `1x-toggle${idSuffix}`,
                label: '1x',
                isActive: (currentExercise?.repsConfigMode || '1x') === '1x',
                onPress: () => {
                    handleWorkoutUpdate({
                        ...currentWorkout,
                        exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                            if (ex.type === 'group') return ex;
                            return {
                                ...ex,
                                repsConfigMode: '1x',
                                // Clear deprecated field
                                alternatingRepsBy2: false
                            };
                        })
                    });
                }
            },
            {
                id: `2x-toggle${idSuffix}`,
                label: '2x',
                isActive: currentExercise?.repsConfigMode === '2x',
                onPress: () => {
                    handleWorkoutUpdate({
                        ...currentWorkout,
                        exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                            if (ex.type === 'group') return ex;
                            return {
                                ...ex,
                                repsConfigMode: '2x',
                                // Clear deprecated field
                                alternatingRepsBy2: false
                            };
                        })
                    });
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
                                repsConfigMode: 'lrSplit',
                                // Clear deprecated field
                                alternatingRepsBy2: false
                            };
                        })
                    });
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

            // Total Weight Calc row options
            options.push(createTotalWeightCalcOptions());
        }

        // Reps field options
        if (field === 'reps' && visibleColumns.showReps) {
            // Reps Config row options (always show)
            options.push(createRepsConfigOptions());
        }

        // Distance field options
        if (field === 'distance' && visibleColumns.showDistance) {
            // Distance Distance Unit row options
            options.push(createDistanceMeasurementUnitsOptions());

            // Measurement Unit row options
            options.push(createMeasurementUnitOptions());
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
                    const isFirstOption = index === 0;

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
                                                const sectionMap: Record<string, 'Duration' | 'Distance' | 'Weight' | 'Reps'> = {
                                                    'Weight Units': 'Weight',
                                                    'Total Weight Config': 'Weight',
                                                    'Total Reps Config': 'Reps',
                                                    'Dist. Measurement Units': 'Distance',
                                                    'Unit Type': 'Distance'
                                                };
                                                setInfoPopupSection(sectionMap[option.label || ''] || 'Weight');
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
                                {option.rowOptions.map((rowOption, rowIndex) => {
                                    const isFirstRowOption = rowIndex === 0;
                                    const isLastRowOption = rowIndex === option.rowOptions!.length - 1;
                                    return (
                                        <TouchableOpacity
                                            key={rowOption.id}
                                            style={[
                                                styles.columnHeaderPopupRowOption,
                                                styles.columnHeaderPopupRowOptionInactive,
                                                rowIndex < option.rowOptions!.length - 1 && styles.columnHeaderPopupRowOptionBorder,
                                                rowOption.isActive && styles.columnHeaderPopupRowOptionActive,
                                                isFirstOption && isFirstRowOption && { borderTopLeftRadius: 8 },
                                                isFirstOption && isLastRowOption && { borderTopRightRadius: 8 },
                                                isLast && isFirstRowOption && { borderBottomLeftRadius: 8 },
                                                isLast && isLastRowOption && { borderBottomRightRadius: 8 }
                                            ]}
                                            onPress={rowOption.onPress}
                                        >
                                            <Text style={[
                                                styles.columnHeaderPopupRowOptionText,
                                                styles.columnHeaderPopupRowOptionTextInactive,
                                                rowOption.isActive && styles.columnHeaderPopupRowOptionTextActive
                                            ]}>
                                                {rowOption.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
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
                                        isLast && styles.columnHeaderPopupOptionLast,
                                        isFirstOption && { borderTopLeftRadius: 8 },
                                        isLast && { borderBottomLeftRadius: 8 }
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
                                        isLast && styles.columnHeaderPopupOptionLast,
                                        isFirstOption && { borderTopRightRadius: 8 },
                                        isLast && { borderBottomRightRadius: 8 }
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
                                option.isLocked && styles.columnHeaderPopupOptionLocked,
                                isFirstOption && { borderTopLeftRadius: 8, borderTopRightRadius: 8 },
                                isLast && { borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }
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

// Merge default styles with component-specific overrides
const getMergedStyle = (defaultStyle: any, overrideStyle: any) => {
    return overrideStyle && Object.keys(overrideStyle).length > 0
        ? { ...defaultStyle, ...overrideStyle }
        : defaultStyle;
};

const baseStyles = StyleSheet.create({
    columnHeaderPopupBackdrop: {},
    columnHeaderPopupContainer: {},
    columnHeaderPopupOption: {},
    columnHeaderPopupOptionLast: {},
    columnHeaderPopupOptionContent: {},
    columnHeaderPopupOptionText: {},
    columnHeaderPopupOptionActive: {},
    columnHeaderPopupOptionTextActive: {},
    columnHeaderPopupOptionWrapper: {},
    columnHeaderPopupOptionWrapperLast: {},
    columnHeaderPopupOptionFlex: {},
    columnHeaderPopupOptionWithBorder: {},
    columnHeaderPopupOptionDeleteFixed: {},
    columnHeaderPopupOptionDelete: {},
    columnHeaderPopupOptionDeleteDisabled: {},
    columnHeaderPopupOptionLocked: {},
    columnHeaderPopupRowOptions: {},
    columnHeaderPopupRowOptionsLabelWrapper: {},
    columnHeaderPopupRowOptionsLabelContainer: {},
    columnHeaderPopupRowOptionsLabel: {},
    columnHeaderPopupRowOption: {},
    columnHeaderPopupRowOptionBorder: {},
    columnHeaderPopupRowOptionInactive: {},
    columnHeaderPopupRowOptionActive: {},
    columnHeaderPopupRowOptionText: {},
    columnHeaderPopupRowOptionTextInactive: {},
    columnHeaderPopupRowOptionTextActive: {},
});

// Merge default styles with component-specific overrides
const styles = {
    columnHeaderPopupBackdrop: getMergedStyle(defaultPopupStyles.backdrop, baseStyles.columnHeaderPopupBackdrop),
    columnHeaderPopupContainer: getMergedStyle(defaultPopupStyles.container, baseStyles.columnHeaderPopupContainer),
    columnHeaderPopupOption: getMergedStyle(
        { ...defaultPopupStyles.option, ...defaultPopupStyles.optionBackground },
        baseStyles.columnHeaderPopupOption
    ),
    columnHeaderPopupOptionLast: getMergedStyle(defaultPopupStyles.borderBottomLast, baseStyles.columnHeaderPopupOptionLast),
    columnHeaderPopupOptionContent: getMergedStyle(defaultPopupStyles.optionContent, baseStyles.columnHeaderPopupOptionContent),
    columnHeaderPopupOptionText: getMergedStyle(defaultPopupStyles.optionText, baseStyles.columnHeaderPopupOptionText),
    columnHeaderPopupOptionActive: getMergedStyle(defaultPopupStyles.optionBackgroundActive, baseStyles.columnHeaderPopupOptionActive),
    columnHeaderPopupOptionTextActive: getMergedStyle(defaultPopupStyles.optionTextActive, baseStyles.columnHeaderPopupOptionTextActive),
    columnHeaderPopupOptionWrapper: getMergedStyle(defaultPopupStyles.optionRow, baseStyles.columnHeaderPopupOptionWrapper),
    columnHeaderPopupOptionWrapperLast: getMergedStyle(defaultPopupStyles.borderBottomLast, baseStyles.columnHeaderPopupOptionWrapperLast),
    columnHeaderPopupOptionFlex: getMergedStyle(defaultPopupStyles.optionFlex, baseStyles.columnHeaderPopupOptionFlex),
    columnHeaderPopupOptionWithBorder: getMergedStyle(defaultPopupStyles.optionRowWithBorder, baseStyles.columnHeaderPopupOptionWithBorder),
    columnHeaderPopupOptionDeleteFixed: getMergedStyle(
        { ...defaultPopupStyles.iconOnlyOption, borderBottomRightRadius: 6 },
        baseStyles.columnHeaderPopupOptionDeleteFixed
    ),
    columnHeaderPopupOptionDelete: getMergedStyle(defaultPopupStyles.iconOnlyOption, baseStyles.columnHeaderPopupOptionDelete),
    columnHeaderPopupOptionDeleteDisabled: getMergedStyle(defaultPopupStyles.iconOnlyOptionDisabled, baseStyles.columnHeaderPopupOptionDeleteDisabled),
    columnHeaderPopupOptionLocked: getMergedStyle(defaultPopupStyles.optionBackgroundDisabled, baseStyles.columnHeaderPopupOptionLocked),
    columnHeaderPopupRowOptions: getMergedStyle(defaultPopupStyles.toggleRow, baseStyles.columnHeaderPopupRowOptions),
    columnHeaderPopupRowOptionsLabelWrapper: getMergedStyle(defaultPopupStyles.toggleLabelWrapper, baseStyles.columnHeaderPopupRowOptionsLabelWrapper),
    columnHeaderPopupRowOptionsLabelContainer: getMergedStyle(defaultPopupStyles.toggleLabelContainer, baseStyles.columnHeaderPopupRowOptionsLabelContainer),
    columnHeaderPopupRowOptionsLabel: getMergedStyle(defaultPopupStyles.toggleLabelText, baseStyles.columnHeaderPopupRowOptionsLabel),
    columnHeaderPopupRowOption: getMergedStyle(defaultPopupStyles.toggleOption, baseStyles.columnHeaderPopupRowOption),
    columnHeaderPopupRowOptionBorder: getMergedStyle(defaultPopupStyles.toggleOptionBorder, baseStyles.columnHeaderPopupRowOptionBorder),
    columnHeaderPopupRowOptionInactive: getMergedStyle(defaultPopupStyles.toggleOptionBackgroundInactive, baseStyles.columnHeaderPopupRowOptionInactive),
    columnHeaderPopupRowOptionActive: getMergedStyle(defaultPopupStyles.toggleOptionBackgroundActive, baseStyles.columnHeaderPopupRowOptionActive),
    columnHeaderPopupRowOptionText: getMergedStyle(defaultPopupStyles.toggleOptionText, baseStyles.columnHeaderPopupRowOptionText),
    columnHeaderPopupRowOptionTextInactive: getMergedStyle(defaultPopupStyles.toggleOptionTextInactive, baseStyles.columnHeaderPopupRowOptionTextInactive),
    columnHeaderPopupRowOptionTextActive: getMergedStyle(defaultPopupStyles.toggleOptionTextActive, baseStyles.columnHeaderPopupRowOptionTextActive),
};

export default SetRowHeadersPopup;
