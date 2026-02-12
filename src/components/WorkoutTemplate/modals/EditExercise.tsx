import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { PRIMARY_MUSCLES, CARDIO_TYPES, TRAINING_FOCUS, WEIGHT_EQUIP_TAGS, PRIMARY_TO_SECONDARY_MAP } from '@/constants/data';
import Chip from '@/components/Chip';
import CustomDropdown from '@/components/CustomDropdown';
import type { ExerciseLibraryItem, ExerciseCategory } from '@/types/workout';

interface EditExerciseProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (exercise: ExerciseLibraryItem) => void;
    categories: ExerciseCategory[];
    exercise?: ExerciseLibraryItem | null; // If provided, we're in edit mode
}

interface EditExerciseState {
    name: string;
    category: ExerciseCategory | '';
    primaryMuscles: string[];
    secondaryMuscles: string[];
    cardioType: string;
    trainingFocus: string;
    weightEquipTags: string[];
    description: string;
    trackDuration: boolean;
    trackReps: boolean;
    trackDistance: boolean;
}

const getInitialState = (): EditExerciseState => ({
    name: "", category: "", primaryMuscles: [], secondaryMuscles: [],
    cardioType: "", trainingFocus: "", weightEquipTags: [], description: "", trackDuration: false, trackReps: false, trackDistance: false
});

const getStateFromExercise = (exercise: ExerciseLibraryItem): EditExerciseState => ({
    name: exercise.name || "",
    category: exercise.category || "",
    primaryMuscles: (exercise.primaryMuscles as string[]) || [],
    secondaryMuscles: (exercise.secondaryMuscles as string[]) || [],
    cardioType: (exercise.cardioType as string) || "",
    trainingFocus: (exercise.trainingFocus as string) || "",
    weightEquipTags: (exercise.weightEquipTags as string[]) || [],
    description: (exercise.description as string) || "",
    trackDuration: (exercise.trackDuration as boolean) || false,
    trackReps: (exercise.trackReps as boolean) || false,
    trackDistance: (exercise.trackDistance as boolean) || false,
});

const EditExercise: React.FC<EditExerciseProps> = ({ isOpen, onClose, onSave, categories, exercise }) => {
    const isEditMode = !!exercise;

    const [editState, setEditState] = useState<EditExerciseState>(getInitialState());
    const [secondaryMusclesEnabled, setSecondaryMusclesEnabled] = useState(false);
    const [activePrimaryForPopup, setActivePrimaryForPopup] = useState<string | null>(null);
    const [showDescription, setShowDescription] = useState(false);
    const [showSecondEquip, setShowSecondEquip] = useState(false);
    const [showWeightEquip, setShowWeightEquip] = useState(false);
    const [showTrainingCardioType, setShowTrainingCardioType] = useState(false);
    const [showTrainingMuscleGroups, setShowTrainingMuscleGroups] = useState(false);
    const [showLiftsCardioType, setShowLiftsCardioType] = useState(false);

    // Populate form when opening in edit mode
    useEffect(() => {
        if (isOpen && exercise) {
            const state = getStateFromExercise(exercise);
            setEditState(state);
            // Determine UI toggle states from existing data
            setSecondaryMusclesEnabled(
                state.category === 'Lifts' || state.secondaryMuscles.length > 0
            );
            setShowDescription(!!state.description);
            setShowSecondEquip(state.weightEquipTags.length > 1);
            // For Training category optional sections
            if (state.category === 'Training') {
                setShowTrainingCardioType(!!state.cardioType);
                setShowTrainingMuscleGroups(state.primaryMuscles.length > 0);
                setShowWeightEquip(state.weightEquipTags.length > 0);
            } else if (state.category === 'Cardio') {
                setShowWeightEquip(state.weightEquipTags.length > 0);
            } else if (state.category === 'Lifts') {
                setShowLiftsCardioType(!!state.cardioType);
            }
        } else if (isOpen && !exercise) {
            // Reset form for create mode
            setEditState(getInitialState());
            setSecondaryMusclesEnabled(false);
            setShowDescription(false);
            setShowSecondEquip(false);
            setShowWeightEquip(false);
            setShowTrainingCardioType(false);
            setShowTrainingMuscleGroups(false);
            setShowLiftsCardioType(false);
        }
    }, [isOpen, exercise]);

    const toggleSelection = (field: keyof EditExerciseState, value: string) => {
        setEditState(prev => {
            const current = (prev[field] as string[]) || [];
            return { ...prev, [field]: current.includes(value) ? current.filter(item => item !== value) : [...current, value] };
        });
    };

    const handleMakePrimary = (muscle: string) => {
        setEditState(prev => {
            const others = prev.primaryMuscles.filter(m => m !== muscle);
            return { ...prev, primaryMuscles: [muscle, ...others] };
        });
    };

    const handleEquipChange = (index: number, value: string) => {
        setEditState(prev => {
            const newTags = [...prev.weightEquipTags];
            newTags[index] = value;
            return { ...prev, weightEquipTags: newTags };
        });
    };

    const handlePrimaryMuscleToggle = (muscle: string) => {
        setEditState(prev => {
            const isSelected = prev.primaryMuscles.includes(muscle);
            const isSpecial = ["Full Body", "Olympic"].includes(muscle);
            const currentSpecials = prev.primaryMuscles.filter(m => ["Full Body", "Olympic"].includes(m));
            const hasSpecialSelected = currentSpecials.length > 0;
            let newPrimaries: string[] = [], newSecondaries = prev.secondaryMuscles;

            if (isSelected) {
                newPrimaries = prev.primaryMuscles.filter(m => m !== muscle);
                const secondariesToRemove = (PRIMARY_TO_SECONDARY_MAP as Record<string, string[]>)[muscle] || [];
                newSecondaries = prev.secondaryMuscles.filter(s => !secondariesToRemove.includes(s));
            } else {
                if (isSpecial) { newPrimaries = [muscle]; newSecondaries = []; }
                else {
                    if (hasSpecialSelected) { newPrimaries = [muscle]; newSecondaries = []; }
                    else { newPrimaries = [...prev.primaryMuscles, muscle]; }
                }
                const muscleMap = PRIMARY_TO_SECONDARY_MAP as Record<string, string[]>;
                const hasSecondaries = muscleMap[muscle] && muscleMap[muscle].length > 0;
                if (secondaryMusclesEnabled && hasSecondaries) setActivePrimaryForPopup(muscle);
            }
            return { ...prev, primaryMuscles: newPrimaries, secondaryMuscles: newSecondaries };
        });
    };

    const handleCategoryChange = (cat: ExerciseCategory) => {
        setEditState(prev => ({ ...prev, category: cat, primaryMuscles: [], secondaryMuscles: [], cardioType: "", trainingFocus: "", weightEquipTags: [], trackReps: false, trackDistance: false }));
        setSecondaryMusclesEnabled(cat === 'Lifts');
        setShowWeightEquip(false);
        setShowTrainingCardioType(false);
        setShowTrainingMuscleGroups(false);
        setShowLiftsCardioType(false);
    };

    const handleSave = () => {
        if (!editState.name || !editState.category) return;
        if (editState.category === 'Lifts' && editState.primaryMuscles.length === 0) return;

        const exerciseToSave: ExerciseLibraryItem = {
            id: isEditMode ? exercise!.id : `ex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: editState.name,
            category: editState.category as ExerciseCategory,
            ...(editState.primaryMuscles.length > 0 && { primaryMuscles: editState.primaryMuscles }),
            ...(editState.secondaryMuscles.length > 0 && { secondaryMuscles: editState.secondaryMuscles }),
            ...(editState.cardioType && { cardioType: editState.cardioType }),
            ...(editState.trainingFocus && { trainingFocus: editState.trainingFocus }),
            ...(editState.weightEquipTags.length > 0 && { weightEquipTags: editState.weightEquipTags.filter(Boolean) }),
            ...(editState.description && { description: editState.description }),
            ...(editState.trackDuration && { trackDuration: editState.trackDuration }),
            ...(editState.trackReps && { trackReps: editState.trackReps }),
            ...(editState.trackDistance && { trackDistance: editState.trackDistance }),
        };

        onSave(exerciseToSave);
        if (!isEditMode) {
            setEditState(getInitialState());
            setSecondaryMusclesEnabled(false);
            setShowDescription(false); setShowSecondEquip(false); setShowWeightEquip(false);
            setShowTrainingCardioType(false);
            setShowTrainingMuscleGroups(false);
        }
    };

    const getAvailableSecondaryMuscles = (primary: string): string[] => {
        const muscleMap = PRIMARY_TO_SECONDARY_MAP as Record<string, string[]>;
        if (muscleMap[primary]) {
            return muscleMap[primary].sort();
        }
        return [];
    };

    return (
        <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.dragHandleContainer}>
                    <View style={styles.dragHandle} />
                </View>
                <View style={styles.header}>
                    <Text style={styles.title}>{isEditMode ? 'Edit Exercise' : 'New Exercise'}</Text>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                    <View style={styles.fieldGroup}>
                        <View style={styles.rowBetween}>
                            <Text style={[styles.label, { marginBottom: 0 }]}>EXERCISE NAME <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity onPress={() => setShowDescription(!showDescription)} style={styles.rowGap}>
                                <Text style={[styles.label, { marginBottom: 0, color: editState.description ? COLORS.blue[600] : COLORS.slate[400] }]}>Description</Text>
                                <ChevronDown size={16} color={showDescription ? COLORS.blue[600] : COLORS.slate[400]} style={{ transform: [{ rotate: showDescription ? '180deg' : '0deg' }] }} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Bulgarian Split Squat"
                            placeholderTextColor={COLORS.slate[400]}
                            value={editState.name}
                            onChangeText={text => setEditState({ ...editState, name: text })}
                        />
                        {showDescription && (
                            <View style={{ marginTop: 8, marginBottom: 10 }}>
                                <TextInput
                                    style={styles.textArea}
                                    placeholder="Add notes about form, cues, or setup..."
                                    placeholderTextColor={COLORS.slate[400]}
                                    multiline
                                    numberOfLines={3}
                                    value={editState.description}
                                    onChangeText={text => setEditState({ ...editState, description: text })}
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>CATEGORY <Text style={styles.required}>*</Text></Text>
                        <View style={styles.categoryContainer}>
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    onPress={() => handleCategoryChange(cat)}
                                    style={[styles.categoryButton, editState.category === cat ? styles.categoryButtonSelected : styles.categoryButtonUnselected]}
                                >
                                    <Text style={[styles.categoryText, editState.category === cat ? styles.categoryTextSelected : styles.categoryTextUnselected]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {editState.category === 'Lifts' && (
                        <View style={styles.section}>
                            <View style={styles.fieldGroup}>
                                <View style={styles.labelToggleRow}>
                                    <Text style={[styles.label, { marginBottom: 0 }]}>PRIMARY MUSCLE GROUPS <Text style={styles.required}>*</Text></Text>
                                    <TouchableOpacity
                                        style={styles.toggleContainer}
                                        onPress={() => {
                                            const newVal = !secondaryMusclesEnabled;
                                            setSecondaryMusclesEnabled(newVal);
                                            if (!newVal) setEditState(prev => ({ ...prev, secondaryMuscles: [] }));
                                        }}
                                    >
                                        <Text style={[styles.toggleLabel, secondaryMusclesEnabled ? styles.textBlue : styles.textSlate]}>SECONDARY</Text>
                                        {secondaryMusclesEnabled ? <ToggleRight size={24} color={COLORS.blue[600]} /> : <ToggleLeft size={24} color={COLORS.slate[300]} />}
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.chipsContainer}>
                                    {PRIMARY_MUSCLES.map(m => (
                                        <Chip
                                            key={m}
                                            label={m}
                                            selected={editState.primaryMuscles.includes(m)}
                                            isPrimary={editState.primaryMuscles[0] === m}
                                            isSpecial={["Full Body", "Olympic"].includes(m)}
                                            onClick={() => handlePrimaryMuscleToggle(m)}
                                            onMakePrimary={() => handleMakePrimary(m)}
                                        />
                                    ))}
                                </View>
                            </View>

                            <View style={styles.fieldGroup}>
                                <View style={styles.labelToggleRow}>
                                    <Text style={[styles.label, { marginBottom: 0 }]}>WEIGHT EQUIP.</Text>
                                    <TouchableOpacity
                                        style={styles.toggleContainer}
                                        onPress={() => {
                                            const newVal = !showSecondEquip;
                                            setShowSecondEquip(newVal);
                                            if (!newVal) setEditState(prev => ({ ...prev, weightEquipTags: [prev.weightEquipTags[0]].filter(Boolean) }));
                                        }}
                                    >
                                        <Text style={[styles.toggleLabel, showSecondEquip ? styles.textBlue : styles.textSlate]}>ADD 2ND</Text>
                                        {showSecondEquip ? <ToggleRight size={24} color={COLORS.blue[600]} /> : <ToggleLeft size={24} color={COLORS.slate[300]} />}
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.dropdownStack}>
                                    <CustomDropdown
                                        value={editState.weightEquipTags[0] || ""}
                                        onChange={(val) => handleEquipChange(0, val)}
                                        options={WEIGHT_EQUIP_TAGS}
                                        placeholder="Select Equipment..."
                                    />
                                    {showSecondEquip && (
                                        <CustomDropdown
                                            value={editState.weightEquipTags[1] || ""}
                                            onChange={(val) => handleEquipChange(1, val)}
                                            options={WEIGHT_EQUIP_TAGS}
                                            placeholder="Select 2nd Equipment..."
                                        />
                                    )}
                                </View>
                            </View>

                            <View style={styles.additionalSettings}>
                                <Text style={styles.label}>ADDITIONAL SETTINGS:</Text>
                            </View>

                            {/* METABOLIC INTENSITY Toggle for Lifts */}
                            <TouchableOpacity onPress={() => {
                                setShowLiftsCardioType(!showLiftsCardioType);
                            }} style={styles.collapsibleLabelToggleRow}>
                                {(() => {
                                    const isActive = showLiftsCardioType || editState.cardioType;
                                    const disabledColor = COLORS.slate[400];
                                    const hasSelection = !showLiftsCardioType && editState.cardioType;
                                    return (
                                        <>
                                            <View style={styles.rowGap}>
                                                <Text style={[styles.label, { marginBottom: 0, color: isActive ? COLORS.slate[500] : disabledColor }]}>METABOLIC INTENSITY</Text>
                                                <ChevronDown size={16} color={isActive ? COLORS.blue[600] : disabledColor} style={{ transform: [{ rotate: showLiftsCardioType ? '180deg' : '0deg' }] }} />
                                                {hasSelection && (
                                                    <Text style={[styles.toggleLabel, { color: isActive ? COLORS.slate[500] : disabledColor }]} numberOfLines={1} ellipsizeMode="tail">
                                                        {editState.cardioType}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={{ width: 100 }} />
                                        </>
                                    );
                                })()}
                            </TouchableOpacity>
                            {showLiftsCardioType && (
                                <View style={{ marginBottom: 24 }}>
                                    <CustomDropdown
                                        value={editState.cardioType}
                                        onChange={(val) => setEditState({ ...editState, cardioType: val })}
                                        options={CARDIO_TYPES}
                                        placeholder="Select METABOLIC INTENSITY..."
                                    />
                                </View>
                            )}

                            {editState.category === 'Lifts' && (
                                <View style={styles.labelToggleRow}>
                                    <Text style={[styles.label, { marginBottom: 0, color: editState.trackDuration ? COLORS.slate[500] : COLORS.slate[400] }]}>ALLOW DURATION TRACKING</Text>
                                    <TouchableOpacity
                                        style={styles.toggleContainer}
                                        onPress={() => setEditState(prev => ({ ...prev, trackDuration: !prev.trackDuration }))}
                                    >
                                        <Text style={[styles.toggleLabel, editState.trackDuration ? styles.textBlue : styles.textSlate]}>TRACK DURATION</Text>
                                        {editState.trackDuration ? <ToggleRight size={24} color={COLORS.blue[600]} /> : <ToggleLeft size={24} color={COLORS.slate[400]} />}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}

                    {editState.category === 'Cardio' && (
                        <View style={styles.section}>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>METABOLIC INTENSITY</Text>
                                <CustomDropdown
                                    value={editState.cardioType}
                                    onChange={(val) => setEditState({ ...editState, cardioType: val })}
                                    options={CARDIO_TYPES}
                                    placeholder="Select METABOLIC INTENSITY..."
                                />
                            </View>
                            <View style={styles.additionalSettings}>
                                <Text style={styles.label}>ADDITIONAL SETTINGS:</Text>
                            </View>
                            <View style={styles.labelToggleRow}>
                                <Text style={[styles.label, { marginBottom: 0, color: editState.trackDistance ? COLORS.slate[500] : COLORS.slate[400] }]}>ALLOW DISTANCE TRACKING</Text>
                                <TouchableOpacity
                                    style={styles.toggleContainer}
                                    onPress={() => setEditState(prev => ({ ...prev, trackDistance: !prev.trackDistance }))}
                                >
                                    <Text style={[styles.toggleLabel, editState.trackDistance ? styles.textBlue : styles.textSlate]}>TRACK DISTANCE</Text>
                                    {editState.trackDistance ? <ToggleRight size={24} color={COLORS.blue[600]} /> : <ToggleLeft size={24} color={COLORS.slate[400]} />}
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={() => setShowWeightEquip(!showWeightEquip)} style={styles.collapsibleLabelToggleRow}>
                                {(() => {
                                    const isActive = showWeightEquip || editState.weightEquipTags.some(tag => tag);
                                    const disabledColor = COLORS.slate[400];
                                    return (
                                        <>
                                            <View style={styles.rowGap}>
                                                <Text style={[styles.label, { marginBottom: 0, color: isActive ? COLORS.slate[500] : disabledColor }]}>WEIGHT EQUIP.</Text>
                                                <ChevronDown size={16} color={isActive ? COLORS.blue[600] : disabledColor} style={{ transform: [{ rotate: showWeightEquip ? '180deg' : '0deg' }] }} />
                                            </View>
                                            <TouchableOpacity
                                                style={styles.toggleContainer}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    const newVal = !showSecondEquip;
                                                    setShowSecondEquip(newVal);
                                                    if (!newVal) setEditState(prev => ({ ...prev, weightEquipTags: [prev.weightEquipTags[0]].filter(Boolean) }));
                                                }}
                                            >
                                                <Text style={[styles.toggleLabel, { color: isActive ? (showSecondEquip ? COLORS.blue[600] : COLORS.slate[400]) : disabledColor }]}>ADD 2ND</Text>
                                                {showSecondEquip ? <ToggleRight size={24} color={isActive ? COLORS.blue[600] : disabledColor} /> : <ToggleLeft size={24} color={disabledColor} />}
                                            </TouchableOpacity>
                                        </>
                                    );
                                })()}
                            </TouchableOpacity>
                            {showWeightEquip && (
                                <View style={{ marginBottom: 24 }}>
                                    <View style={styles.dropdownStack}>
                                        <CustomDropdown value={editState.weightEquipTags[0] || ""} onChange={(val) => handleEquipChange(0, val)} options={WEIGHT_EQUIP_TAGS} placeholder="Select Equipment..." />
                                        {showSecondEquip && <CustomDropdown value={editState.weightEquipTags[1] || ""} onChange={(val) => handleEquipChange(1, val)} options={WEIGHT_EQUIP_TAGS} placeholder="Select 2nd Equipment..." />}
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {editState.category === 'Training' && (
                        <View style={styles.section}>
                            <View style={styles.fieldGroup}>
                                <Text style={styles.label}>TRAINING FOCUS</Text>
                                <CustomDropdown value={editState.trainingFocus} onChange={(val) => setEditState({ ...editState, trainingFocus: val })} options={TRAINING_FOCUS} placeholder="Select Training Focus..." />
                            </View>

                            <View style={styles.additionalSettings}>
                                <Text style={styles.label}>ADDITIONAL SETTINGS:</Text>
                            </View>

                            {/* METABOLIC INTENSITY Toggle for Training */}
                            <TouchableOpacity onPress={() => {
                                setShowTrainingCardioType(!showTrainingCardioType);
                            }} style={styles.collapsibleLabelToggleRow}>
                                {(() => {
                                    const isActive = showTrainingCardioType || editState.cardioType;
                                    const disabledColor = COLORS.slate[400];
                                    const hasSelection = !showTrainingCardioType && editState.cardioType;
                                    return (
                                        <>
                                            <View style={styles.rowGap}>
                                                <Text style={[styles.label, { marginBottom: 0, color: isActive ? COLORS.slate[500] : disabledColor }]}>METABOLIC INTENSITY</Text>
                                                <ChevronDown size={16} color={isActive ? COLORS.blue[600] : disabledColor} style={{ transform: [{ rotate: showTrainingCardioType ? '180deg' : '0deg' }] }} />
                                                {hasSelection && (
                                                    <Text style={[styles.toggleLabel, { color: isActive ? COLORS.slate[500] : disabledColor }]} numberOfLines={1} ellipsizeMode="tail">
                                                        {editState.cardioType}
                                                    </Text>
                                                )}
                                            </View>
                                            <View style={{ width: 100 }} />
                                        </>
                                    );
                                })()}
                            </TouchableOpacity>
                            {showTrainingCardioType && (
                                <View style={{ marginBottom: 24 }}>
                                    <CustomDropdown
                                        value={editState.cardioType}
                                        onChange={(val) => setEditState({ ...editState, cardioType: val })}
                                        options={CARDIO_TYPES}
                                        placeholder="Select METABOLIC INTENSITY..."
                                    />
                                </View>
                            )}


                            {/* Muscle Groups Toggle for Training */}
                            <TouchableOpacity onPress={() => {
                                setShowTrainingMuscleGroups(!showTrainingMuscleGroups);
                            }} style={styles.collapsibleLabelToggleRow}>
                                {(() => {
                                    const isActive = showTrainingMuscleGroups || editState.primaryMuscles.length > 0 || editState.secondaryMuscles.length > 0 || secondaryMusclesEnabled;
                                    const disabledColor = COLORS.slate[400];
                                    return (
                                        <>
                                            <View style={styles.rowGap}>
                                                <Text style={[styles.label, { marginBottom: 0, color: isActive ? COLORS.slate[500] : disabledColor }]}>PRIMARY MUSCLE GROUPS</Text>
                                                <ChevronDown size={16} color={isActive ? COLORS.blue[600] : disabledColor} style={{ transform: [{ rotate: showTrainingMuscleGroups ? '180deg' : '0deg' }] }} />
                                            </View>
                                            <TouchableOpacity
                                                style={styles.toggleContainer}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    const newVal = !secondaryMusclesEnabled;
                                                    setSecondaryMusclesEnabled(newVal);
                                                    if (!newVal) setEditState(prev => ({ ...prev, secondaryMuscles: [] }));
                                                }}
                                            >
                                                <Text style={[styles.toggleLabel, { color: isActive ? (secondaryMusclesEnabled ? COLORS.blue[600] : COLORS.slate[400]) : disabledColor }]}>SECONDARY</Text>
                                                {secondaryMusclesEnabled ? <ToggleRight size={24} color={isActive ? COLORS.blue[600] : disabledColor} /> : <ToggleLeft size={24} color={disabledColor} />}
                                            </TouchableOpacity>
                                        </>
                                    );
                                })()}
                            </TouchableOpacity>
                            {showTrainingMuscleGroups && (
                                <View style={{ marginBottom: 24 }}>
                                    <View style={styles.chipsContainer}>
                                        {PRIMARY_MUSCLES.map(m => (
                                            <Chip
                                                key={m}
                                                label={m}
                                                selected={editState.primaryMuscles.includes(m)}
                                                isPrimary={editState.primaryMuscles[0] === m}
                                                isSpecial={["Full Body", "Olympic"].includes(m)}
                                                onClick={() => handlePrimaryMuscleToggle(m)}
                                                onMakePrimary={() => handleMakePrimary(m)}
                                            />
                                        ))}
                                    </View>
                                </View>
                            )}

                            <TouchableOpacity onPress={() => setShowWeightEquip(!showWeightEquip)} style={styles.collapsibleLabelToggleRow}>
                                {(() => {
                                    const isActive = showWeightEquip || editState.weightEquipTags.some(tag => tag) || showSecondEquip;
                                    const disabledColor = COLORS.slate[400];
                                    return (
                                        <>
                                            <View style={styles.rowGap}>
                                                <Text style={[styles.label, { marginBottom: 0, color: isActive ? COLORS.slate[500] : disabledColor }]}>WEIGHT EQUIP.</Text>
                                                <ChevronDown size={16} color={isActive ? COLORS.blue[600] : disabledColor} style={{ transform: [{ rotate: showWeightEquip ? '180deg' : '0deg' }] }} />
                                            </View>
                                            <TouchableOpacity
                                                style={styles.toggleContainer}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    const newVal = !showSecondEquip;
                                                    setShowSecondEquip(newVal);
                                                    if (!newVal) setEditState(prev => ({ ...prev, weightEquipTags: [prev.weightEquipTags[0]].filter(Boolean) }));
                                                }}
                                            >
                                                <Text style={[styles.toggleLabel, { color: isActive ? (showSecondEquip ? COLORS.blue[600] : COLORS.slate[400]) : disabledColor }]}>ADD 2ND</Text>
                                                {showSecondEquip ? <ToggleRight size={24} color={isActive ? COLORS.blue[600] : disabledColor} /> : <ToggleLeft size={24} color={disabledColor} />}
                                            </TouchableOpacity>
                                        </>
                                    );
                                })()}
                            </TouchableOpacity>
                            {showWeightEquip && (
                                <View style={{ marginBottom: 24 }}>
                                    <View style={styles.dropdownStack}>
                                        <CustomDropdown value={editState.weightEquipTags[0] || ""} onChange={(val) => handleEquipChange(0, val)} options={WEIGHT_EQUIP_TAGS} placeholder="Select Equipment..." />
                                        {showSecondEquip && <CustomDropdown value={editState.weightEquipTags[1] || ""} onChange={(val) => handleEquipChange(1, val)} options={WEIGHT_EQUIP_TAGS} placeholder="Select 2nd Equipment..." />}
                                    </View>
                                </View>
                            )}

                            {editState.category === 'Training' && (
                                <>
                                    <View style={styles.labelToggleRow}>
                                        <Text style={[styles.label, { marginBottom: 0, color: editState.trackReps ? COLORS.slate[500] : COLORS.slate[400] }]}>ALLOW REPS TRACKING</Text>
                                        <TouchableOpacity
                                            style={styles.toggleContainer}
                                            onPress={() => setEditState(prev => ({ ...prev, trackReps: !prev.trackReps }))}
                                        >
                                            <Text style={[styles.toggleLabel, editState.trackReps ? styles.textBlue : styles.textSlate]}>TRACK REPS</Text>
                                            {editState.trackReps ? <ToggleRight size={24} color={COLORS.blue[600]} /> : <ToggleLeft size={24} color={COLORS.slate[400]} />}
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.labelToggleRow}>
                                        <Text style={[styles.label, { marginBottom: 0, color: editState.trackDuration ? COLORS.slate[500] : COLORS.slate[400] }]}>ALLOW DURATION TRACKING</Text>
                                        <TouchableOpacity
                                            style={styles.toggleContainer}
                                            onPress={() => setEditState(prev => ({ ...prev, trackDuration: !prev.trackDuration }))}
                                        >
                                            <Text style={[styles.toggleLabel, editState.trackDuration ? styles.textBlue : styles.textSlate]}>TRACK DURATION</Text>
                                            {editState.trackDuration ? <ToggleRight size={24} color={COLORS.blue[600]} /> : <ToggleLeft size={24} color={COLORS.slate[400]} />}
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.labelToggleRow}>
                                        <Text style={[styles.label, { marginBottom: 0, color: editState.trackDistance ? COLORS.slate[500] : COLORS.slate[400] }]}>ALLOW DISTANCE TRACKING</Text>
                                        <TouchableOpacity
                                            style={styles.toggleContainer}
                                            onPress={() => setEditState(prev => ({ ...prev, trackDistance: !prev.trackDistance }))}
                                        >
                                            <Text style={[styles.toggleLabel, editState.trackDistance ? styles.textBlue : styles.textSlate]}>TRACK DISTANCE</Text>
                                            {editState.trackDistance ? <ToggleRight size={24} color={COLORS.blue[600]} /> : <ToggleLeft size={24} color={COLORS.slate[400]} />}
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    )}

                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={!editState.name || !editState.category || (editState.category === 'Lifts' && editState.primaryMuscles.length === 0)}
                        style={[styles.saveButton, (!editState.name || !editState.category || (editState.category === 'Lifts' && editState.primaryMuscles.length === 0)) && styles.saveButtonDisabled]}
                    >
                        <Text style={styles.saveButtonText}>{isEditMode ? 'Update Exercise' : 'Save Exercise'}</Text>
                    </TouchableOpacity>
                </View>

                <Modal visible={!!activePrimaryForPopup} transparent animationType="fade" onRequestClose={() => setActivePrimaryForPopup(null)}>
                    <TouchableOpacity style={styles.popupOverlay} activeOpacity={1} onPress={() => setActivePrimaryForPopup(null)}>
                        <View style={styles.popupContent} onStartShouldSetResponder={() => true}>
                            <View style={styles.popupHeader}>
                                <Text style={styles.popupTitle}>{activePrimaryForPopup} <Text style={styles.popupSubtitle}>Secondary Muscles</Text></Text>
                                <TouchableOpacity onPress={() => setActivePrimaryForPopup(null)}><Text style={styles.popupSkip}>Skip</Text></TouchableOpacity>
                            </View>
                            <View style={styles.popupChips}>
                                {getAvailableSecondaryMuscles(activePrimaryForPopup || '').map(m => (
                                    <Chip key={m} label={m} selected={editState.secondaryMuscles.includes(m)} onClick={() => toggleSelection('secondaryMuscles', m)} />
                                ))}
                            </View>
                            <TouchableOpacity onPress={() => setActivePrimaryForPopup(null)} style={styles.popupDoneButton}>
                                <Text style={styles.popupDoneText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    dragHandleContainer: {
        alignItems: 'center',
        paddingTop: 20,
        marginBottom: 0,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: COLORS.slate[300],
        borderRadius: 2,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[100],
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.slate[900],
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 40,
    },
    fieldGroup: {
        marginBottom: 24,
    },
    additionalSettings: {
        marginBottom: 6,
        marginTop: 10,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.slate[500],
        marginBottom: 8,
        marginLeft: 4,
    },
    required: {
        color: COLORS.red[500],
    },
    input: {
        backgroundColor: COLORS.slate[50],
        borderWidth: 1,
        borderColor: COLORS.slate[200],
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: COLORS.slate[900],
    },
    categoryContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.slate[100],
        padding: 4,
        borderRadius: 12,
    },
    categoryButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    categoryButtonSelected: {
        backgroundColor: COLORS.white,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    categoryButtonUnselected: {
        backgroundColor: 'transparent',
    },
    categoryText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    categoryTextSelected: {
        color: COLORS.slate[900],
    },
    categoryTextUnselected: {
        color: COLORS.slate[500],
    },
    section: {
        marginTop: 8,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    labelToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    collapsibleLabelToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        minHeight: 26,
    },
    subLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.slate[400],
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    toggleLabel: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    textBlue: {
        color: COLORS.blue[600],
    },
    textSlate: {
        color: COLORS.slate[400],
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 0,
    },
    rowGap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    dropdownStack: {
        gap: 12,
    },
    marginTop: {
        marginTop: 12,
    },
    textArea: {
        backgroundColor: COLORS.slate[50],
        borderWidth: 1,
        borderColor: COLORS.slate[200],
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: COLORS.slate[900],
        textAlignVertical: 'top',
        height: 100,
    },
    footer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.slate[100],
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: COLORS.transparent,
        borderWidth: 1,
        borderColor: COLORS.slate[300],
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.slate[500],
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: COLORS.blue[600],
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    popupOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 16,
    },
    popupContent: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 24,
        maxHeight: '80%',
    },
    popupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    popupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.slate[900],
    },
    popupSubtitle: {
        fontSize: 14,
        fontWeight: 'normal',
        color: COLORS.slate[400],
    },
    popupSkip: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.blue[600],
    },
    popupChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 24,
    },
    popupDoneButton: {
        backgroundColor: COLORS.blue[600],
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    popupDoneText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
    },
});

export default EditExercise;
