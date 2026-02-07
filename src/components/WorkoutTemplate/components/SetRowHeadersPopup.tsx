import React from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, ArrowLeftRight, Lock, Ruler, Settings, Trash2, Timer, Hash, Scale } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { updateExercisesDeep, findExerciseDeep } from '@/utils/workoutHelpers';
import type { Workout, ExerciseLibraryItem, Exercise, DistanceUnitSystem, DistanceUnit } from '@/types/workout';

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
    type?: 'toggle-container' | 'delete-option' | 'set-inputs-container';
    toggles?: Array<{
        id: string;
        label: string;
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
            // Weight unit toggle container
            options.push({
                id: 'weight-unit-toggle-container',
                type: 'toggle-container',
                label: 'Weight Units',
                show: true,
                toggles: [
                    {
                        id: 'kg-toggle',
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
                        id: 'lbs-toggle',
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

            // x2 Totals Adj. toggle container
            if (visibleColumns.showReps) {
                options.push({
                    id: 'x2-totals-toggle-container',
                    type: 'toggle-container',
                    label: 'x2 Totals Adj.',
                    show: true,
                    toggles: [
                        {
                            id: 'dumbbells-toggle',
                            label: 'Dumbbells',
                            isActive: currentExercise?.multiplyWeightBy2 || false,
                            onPress: () => {
                                handleWorkoutUpdate({
                                    ...currentWorkout,
                                    exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                        if (ex.type === 'group') return ex;
                                        return {
                                            ...ex,
                                            multiplyWeightBy2: !ex.multiplyWeightBy2,
                                            alternatingRepsBy2: false
                                        };
                                    })
                                });
                                onClose();
                            }
                        },
                        {
                            id: 'alternating-toggle',
                            label: 'Alternating',
                            isActive: currentExercise?.alternatingRepsBy2 || false,
                            onPress: () => {
                                handleWorkoutUpdate({
                                    ...currentWorkout,
                                    exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                        if (ex.type === 'group') return ex;
                                        return {
                                            ...ex,
                                            alternatingRepsBy2: !ex.alternatingRepsBy2,
                                            multiplyWeightBy2: false
                                        };
                                    })
                                });
                                onClose();
                            }
                        }
                    ]
                });
            } else {
                // If reps column not visible, show only Dumbbells option as regular option
                options.push({
                    id: 'multiply-weight',
                    label: 'Dumbbells (Weight x 2)',
                    icon: (
                        <View style={[
                            styles.multiplyIconWrapper,
                            currentExercise?.multiplyWeightBy2 && styles.multiplyIconWrapperActive
                        ]}>
                            <Text style={[
                                styles.multiplyIconText,
                                currentExercise?.multiplyWeightBy2 && styles.multiplyIconTextActive
                            ]}>x2</Text>
                        </View>
                    ),
                    show: true,
                    isActive: currentExercise?.multiplyWeightBy2,
                    onPress: () => {
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return {
                                    ...ex,
                                    multiplyWeightBy2: !ex.multiplyWeightBy2,
                                    alternatingRepsBy2: false
                                };
                            })
                        });
                        onClose();
                    }
                });
            }
        }

        // Reps field options
        if (field === 'reps' && visibleColumns.showReps) {
            // Only show weight-related options if weight column is also visible
            if (visibleColumns.showWeight && hasWeightUnit) {
                // Weight unit toggle container
                options.push({
                    id: 'weight-unit-toggle-container-reps',
                    type: 'toggle-container',
                    label: 'Weight Units',
                    show: true,
                    toggles: [
                        {
                            id: 'kg-toggle-reps',
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
                            id: 'lbs-toggle-reps',
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

                // x2 Totals Adj. toggle container
                options.push({
                    id: 'x2-totals-toggle-container-reps',
                    type: 'toggle-container',
                    label: 'x2 Totals Adj.',
                    show: true,
                    toggles: [
                        {
                            id: 'dumbbells-toggle-reps',
                            label: 'Dumbbells',
                            isActive: currentExercise?.multiplyWeightBy2 || false,
                            onPress: () => {
                                handleWorkoutUpdate({
                                    ...currentWorkout,
                                    exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                        if (ex.type === 'group') return ex;
                                        return {
                                            ...ex,
                                            multiplyWeightBy2: !ex.multiplyWeightBy2,
                                            alternatingRepsBy2: false
                                        };
                                    })
                                });
                                onClose();
                            }
                        },
                        {
                            id: 'alternating-toggle-reps',
                            label: 'Alternating',
                            isActive: currentExercise?.alternatingRepsBy2 || false,
                            onPress: () => {
                                handleWorkoutUpdate({
                                    ...currentWorkout,
                                    exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                        if (ex.type === 'group') return ex;
                                        return {
                                            ...ex,
                                            alternatingRepsBy2: !ex.alternatingRepsBy2,
                                            multiplyWeightBy2: false
                                        };
                                    })
                                });
                                onClose();
                            }
                        }
                    ]
                });
            } else {
                // If weight column not visible, show only Alternating option as regular option
                options.push({
                    id: 'alternating-reps',
                    label: 'Alternating (Reps x 2)',
                    icon: (
                        <View style={[
                            styles.multiplyIconWrapper,
                            currentExercise?.alternatingRepsBy2 && styles.multiplyIconWrapperActive
                        ]}>
                            <Text style={[
                                styles.multiplyIconText,
                                currentExercise?.alternatingRepsBy2 && styles.multiplyIconTextActive
                            ]}>x2</Text>
                        </View>
                    ),
                    show: true,
                    isActive: currentExercise?.alternatingRepsBy2,
                    onPress: () => {
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return {
                                    ...ex,
                                    alternatingRepsBy2: !ex.alternatingRepsBy2,
                                    multiplyWeightBy2: false
                                };
                            })
                        });
                        onClose();
                    }
                });
            }
        }

        // Distance field options
        if (field === 'distance' && visibleColumns.showDistance) {
            options.push({
                id: 'switch-distance-system',
                label: `Switch to ${currentSystem === 'US' ? 'Metric' : 'US'}`,
                icon: <ArrowLeftRight size={18} color={COLORS.white} />,
                show: true,
                onPress: () => {
                    const newSystem: DistanceUnitSystem = currentSystem === 'US' ? 'Metric' : 'US';
                    const defaultUnit: DistanceUnit = newSystem === 'US' ? 'mi' : 'm';
                    handleWorkoutUpdate({
                        ...currentWorkout,
                        exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                            if (ex.type === 'group') return ex;
                            return {
                                ...ex,
                                distanceUnitSystem: newSystem,
                                distanceUnit: defaultUnit
                            };
                        })
                    });
                    onClose();
                }
            });

            if (currentSystem === 'US') {
                options.push({
                    id: 'distance-ft',
                    label: 'Feet',
                    icon: <Ruler size={18} color={COLORS.white} />,
                    show: true,
                    isActive: currentUnit === 'ft',
                    onPress: () => {
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return { ...ex, distanceUnit: 'ft' };
                            })
                        });
                        onClose();
                    }
                });

                options.push({
                    id: 'distance-yd',
                    label: 'Yards',
                    icon: <Ruler size={18} color={COLORS.white} />,
                    show: true,
                    isActive: currentUnit === 'yd',
                    onPress: () => {
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return { ...ex, distanceUnit: 'yd' };
                            })
                        });
                        onClose();
                    }
                });

                options.push({
                    id: 'distance-mi',
                    label: 'Miles',
                    icon: <Ruler size={18} color={COLORS.white} />,
                    show: true,
                    isActive: currentUnit === 'mi',
                    onPress: () => {
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return { ...ex, distanceUnit: 'mi' };
                            })
                        });
                        onClose();
                    }
                });
            } else {
                options.push({
                    id: 'distance-m',
                    label: 'Meters',
                    icon: <Ruler size={18} color={COLORS.white} />,
                    show: true,
                    isActive: currentUnit === 'm',
                    onPress: () => {
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return { ...ex, distanceUnit: 'm' };
                            })
                        });
                        onClose();
                    }
                });

                options.push({
                    id: 'distance-km',
                    label: 'Kilometers',
                    icon: <Ruler size={18} color={COLORS.white} />,
                    show: true,
                    isActive: currentUnit === 'km',
                    onPress: () => {
                        handleWorkoutUpdate({
                            ...currentWorkout,
                            exercises: updateExercisesDeep(currentWorkout.exercises, columnHeaderMenu.exerciseId, (ex) => {
                                if (ex.type === 'group') return ex;
                                return { ...ex, distanceUnit: 'km' };
                            })
                        });
                        onClose();
                    }
                });
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

                    // Toggle container type
                    if (option.type === 'toggle-container' && option.toggles) {
                        return (
                            <View key={option.id} style={[
                                styles.columnHeaderPopupOption,
                                isLast && styles.columnHeaderPopupOptionLast,
                                isNotFirstOption && styles.columnHeaderPopupOptionNoTopPadding
                            ]}>
                                <Text style={styles.columnHeaderPopupToggleLabel}>{option.label}</Text>
                                <View style={styles.columnHeaderPopupToggleContainer}>
                                    {option.toggles.map((toggle) => (
                                        <TouchableOpacity
                                            key={toggle.id}
                                            style={[
                                                styles.columnHeaderPopupToggleButton,
                                                toggle.isActive && styles.columnHeaderPopupToggleButtonActive
                                            ]}
                                            onPress={toggle.onPress}
                                        >
                                            <Text style={[
                                                styles.columnHeaderPopupToggleText,
                                                toggle.isActive && styles.columnHeaderPopupToggleTextActive
                                            ]}>
                                                {toggle.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        );
                    }

                    // Set inputs container type (Set inputs + Delete)
                    if (option.type === 'set-inputs-container' && option.setInputsOption && option.deleteOption) {
                        return (
                            <View key={option.id} style={[
                                styles.columnHeaderPopupOptionWrapper,
                                isLast && styles.columnHeaderPopupOptionLast
                            ]}>
                                <TouchableOpacity
                                    style={[
                                        styles.columnHeaderPopupOption,
                                        styles.columnHeaderPopupOptionFlex,
                                        styles.columnHeaderPopupOptionWithBorder
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
                                        option.deleteOption.isLocked && styles.columnHeaderPopupOptionDeleteDisabled
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
                                option.isActive && styles.columnHeaderPopupOptionActive
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
        borderBottomColor: COLORS.slate[600],
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
    multiplyIconWrapper: {
        width: 18,
        height: 18,
        borderRadius: 4,
        backgroundColor: COLORS.slate[600],
        alignItems: 'center',
        justifyContent: 'center',
    },
    multiplyIconWrapperActive: {
        backgroundColor: COLORS.blue[600],
    },
    multiplyIconText: {
        fontSize: 10,
        fontWeight: '700',
        color: COLORS.white,
    },
    multiplyIconTextActive: {
        color: COLORS.white,
    },
    columnHeaderPopupToggleLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.slate[300],
        marginBottom: 8,
        marginLeft: 4,
    },
    columnHeaderPopupToggleContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.slate[100],
        padding: 4,
        borderRadius: 12,
    },
    columnHeaderPopupToggleButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: 'transparent',
    },
    columnHeaderPopupToggleButtonActive: {
        backgroundColor: COLORS.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    columnHeaderPopupToggleText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.slate[500],
    },
    columnHeaderPopupToggleTextActive: {
        color: COLORS.slate[900],
    },
    columnHeaderPopupOptionNoTopPadding: {
        paddingTop: 0,
    },
    columnHeaderPopupOptionWrapper: {
        flexDirection: 'row',
        alignItems: 'stretch',
        padding: 0,
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
});

export default SetRowHeadersPopup;
