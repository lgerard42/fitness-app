import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import {
  SINGLE_DOUBLE_OPTIONS,
  EQUIPMENT_GRIP_STANCE_OPTIONS,
  CABLE_ATTACHMENT_GRIP_STANCE_OPTIONS,
  optionIdFromLegacy,
  buildCableAttachmentsById,
  GRIP_TYPES,
  GRIP_TYPES_BY_ID,
  GRIP_WIDTHS,
  GRIP_WIDTHS_BY_ID,
  STANCE_TYPES,
  STANCE_TYPES_BY_ID,
  STANCE_WIDTHS,
  STANCE_WIDTHS_BY_ID,
  SINGLE_DOUBLE_OPTIONS_BY_ID,
} from '@/constants/data';
import { usePrimaryMusclesAsStrings, usePrimaryToSecondaryMap, useCableAttachments, useSingleDoubleEquipmentLabels } from '@/database/useExerciseConfig';
import Chip from './Chip';
import CustomDropdown from './CustomDropdown';
import EquipmentPickerModal from './EquipmentPickerModal';
import type { ExerciseLibraryItem, ExerciseCategory } from '@/types/workout';
import { FIELD_LABELS } from './editExerciseFieldConfig';
import styles from './EditExercise.styles';
import {
  FieldGroup,
  Label,
  ToggleRow,
  CollapsibleSection,
  ExerciseNameInput,
  DescriptionInput,
  MetabolicIntensityDropdown,
  TrainingFocusDropdown,
  CableAttachmentsField,
  AssistedNegativeRow,
  EquipmentBlock,
  PrimaryMuscleChips,
} from './EditExerciseFields';

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
    singleDouble: string;
    cableAttachment: string;
    gripType: string;
    gripWidth: string;
    stanceType: string;
    stanceWidth: string;
    assistedNegative: boolean;
}

const getInitialState = (): EditExerciseState => ({
    name: "", category: "", primaryMuscles: [], secondaryMuscles: [],
    cardioType: "", trainingFocus: "", weightEquipTags: [], description: "", 
    trackDuration: false, trackReps: false, trackDistance: false,
    singleDouble: "", cableAttachment: "", gripType: "", gripWidth: "", 
    stanceType: "", stanceWidth: "", assistedNegative: false
});

const getStateFromExercise = (
    exercise: ExerciseLibraryItem,
    cableAttachments: { id: string; label: string }[],
    cableAttachmentsById: Record<string, { id: string; label: string }>
): EditExerciseState => {
    const raw = {
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
        singleDouble: (exercise.singleDouble as string) || "",
        cableAttachment: (exercise.cableAttachment as string) || "",
        gripType: (exercise.gripType as string) || "",
        gripWidth: (exercise.gripWidth as string) || "",
        stanceType: (exercise.stanceType as string) || "",
        stanceWidth: (exercise.stanceWidth as string) || "",
        assistedNegative: (exercise.assistedNegative as boolean) || false,
    };
    return {
        ...raw,
        singleDouble: optionIdFromLegacy(raw.singleDouble, SINGLE_DOUBLE_OPTIONS, SINGLE_DOUBLE_OPTIONS_BY_ID),
        cableAttachment: optionIdFromLegacy(raw.cableAttachment, cableAttachments, cableAttachmentsById),
        gripType: optionIdFromLegacy(raw.gripType, GRIP_TYPES, GRIP_TYPES_BY_ID),
        gripWidth: optionIdFromLegacy(raw.gripWidth, GRIP_WIDTHS, GRIP_WIDTHS_BY_ID),
        stanceType: optionIdFromLegacy(raw.stanceType, STANCE_TYPES, STANCE_TYPES_BY_ID),
        stanceWidth: optionIdFromLegacy(raw.stanceWidth, STANCE_WIDTHS, STANCE_WIDTHS_BY_ID),
    };
};

/** Training-only: collapsible "Primary Muscle Groups" with Secondary toggle in the header. */
const TrainingMuscleGroupsCollapsible: React.FC<{
    expanded: boolean;
    onToggle: () => void;
    secondaryMusclesEnabled: boolean;
    onSecondaryToggle: () => void;
    primaryMuscles: string[];
    onMuscleToggle: (muscle: string) => void;
    onMakePrimary: (muscle: string) => void;
    primaryMusclesList: string[];
}> = ({ expanded, onToggle, secondaryMusclesEnabled, onSecondaryToggle, primaryMuscles, onMuscleToggle, onMakePrimary, primaryMusclesList }) => {
    const isActive = expanded || primaryMuscles.length > 0 || secondaryMusclesEnabled;
    const disabledColor = COLORS.slate[400];
    return (
        <>
            <TouchableOpacity onPress={onToggle} style={styles.collapsibleLabelToggleRow}>
                <View style={styles.rowGap}>
                    <Text style={[styles.label, { marginBottom: 0, color: isActive ? COLORS.slate[500] : disabledColor }]}>
                        {FIELD_LABELS.primaryMuscleGroups}
                    </Text>
                    <ChevronDown
                        size={16}
                        color={isActive ? COLORS.blue[600] : disabledColor}
                        style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
                    />
                </View>
                <TouchableOpacity
                    style={styles.toggleContainer}
                    onPress={(e) => {
                        e.stopPropagation();
                        onSecondaryToggle();
                    }}
                >
                    <Text style={[styles.toggleLabel, { color: isActive ? (secondaryMusclesEnabled ? COLORS.blue[600] : COLORS.slate[400]) : disabledColor }]}>
                        {FIELD_LABELS.secondary}
                    </Text>
                    {secondaryMusclesEnabled ? (
                        <ToggleRight size={24} color={isActive ? COLORS.blue[600] : disabledColor} />
                    ) : (
                        <ToggleLeft size={24} color={disabledColor} />
                    )}
                </TouchableOpacity>
            </TouchableOpacity>
            {expanded && (
                <View style={{ marginBottom: 24 }}>
                    <View style={styles.chipsContainer}>
                        {primaryMusclesList.map((m) => (
                            <Chip
                                key={m}
                                label={m}
                                selected={primaryMuscles.includes(m)}
                                isPrimary={primaryMuscles[0] === m}
                                isSpecial={['Full Body', 'Olympic'].includes(m)}
                                onClick={() => onMuscleToggle(m)}
                                onMakePrimary={() => onMakePrimary(m)}
                            />
                        ))}
                    </View>
                </View>
            )}
        </>
    );
};

const EditExercise: React.FC<EditExerciseProps> = ({ isOpen, onClose, onSave, categories, exercise }) => {
    const isEditMode = !!exercise;
    const PRIMARY_MUSCLES = usePrimaryMusclesAsStrings();
    const PRIMARY_TO_SECONDARY_MAP = usePrimaryToSecondaryMap();
    const CABLE_ATTACHMENTS = useCableAttachments();
    const CABLE_ATTACHMENTS_BY_ID = buildCableAttachmentsById(CABLE_ATTACHMENTS);
    const SINGLE_DOUBLE_EQUIPMENT = useSingleDoubleEquipmentLabels();

    const [editState, setEditState] = useState<EditExerciseState>(getInitialState());
    const [secondaryMusclesEnabled, setSecondaryMusclesEnabled] = useState(false);
    const [activePrimaryForPopup, setActivePrimaryForPopup] = useState<string | null>(null);
    const [showDescription, setShowDescription] = useState(false);
    const [showSecondEquip, setShowSecondEquip] = useState(false);
    const [showWeightEquip, setShowWeightEquip] = useState(false);
    const [showTrainingCardioType, setShowTrainingCardioType] = useState(false);
    const [showTrainingMuscleGroups, setShowTrainingMuscleGroups] = useState(false);
    const [showLiftsCardioType, setShowLiftsCardioType] = useState(false);
    const [equipmentPickerSlot, setEquipmentPickerSlot] = useState<0 | 1 | null>(null);

    // Populate form when opening in edit mode
    useEffect(() => {
        if (isOpen && exercise) {
            const state = getStateFromExercise(exercise, CABLE_ATTACHMENTS, CABLE_ATTACHMENTS_BY_ID);
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

    const handleSingleDoubleChange = (option: string) => {
        const newVal = editState.singleDouble === option ? "" : option;
        setEditState(prev => ({
            ...prev,
            singleDouble: newVal,
            ...(newVal === "single" && {
                gripType: "", gripWidth: "", stanceType: "", stanceWidth: "",
            }),
        }));
    };

    const cableAttachmentOptsKey = (v: string) => (v || '').toUpperCase().replace(/-/g, '_');
    const handleCableAttachmentChange = (val: string) => {
        setEditState(prev => {
            const options = val ? (CABLE_ATTACHMENT_GRIP_STANCE_OPTIONS as Record<string, { gripType?: string[] | null; gripWidth?: string[] | null; stanceType?: string[] | null; stanceWidth?: string[] | null }>)[cableAttachmentOptsKey(val)] : null;
            const gripTypeOk = !prev.gripType || (options?.gripType && options.gripType.includes(prev.gripType));
            const gripWidthOk = !prev.gripWidth || (options?.gripWidth && options.gripWidth.includes(prev.gripWidth));
            const stanceTypeOk = !prev.stanceType || (options?.stanceType && options.stanceType.includes(prev.stanceType));
            const stanceWidthOk = !prev.stanceWidth || (options?.stanceWidth && options.stanceWidth.includes(prev.stanceWidth));
            return {
                ...prev,
                cableAttachment: val,
                ...(!gripTypeOk && { gripType: "" }),
                ...(!gripWidthOk && { gripWidth: "" }),
                ...(!stanceTypeOk && { stanceType: "" }),
                ...(!stanceWidthOk && { stanceWidth: "" }),
            };
        });
    };

    const handleEquipChange = (index: number, value: string) => {
        setEditState(prev => {
            const newTags = [...prev.weightEquipTags];
            newTags[index] = value;
            const updatedTags = newTags.filter(Boolean);
            const primaryEquip = updatedTags[0] || "";
            const baseOptions = primaryEquip ? (EQUIPMENT_GRIP_STANCE_OPTIONS as Record<string, { gripType?: string[] | null; gripWidth?: string[] | null; stanceType?: string[] | null; stanceWidth?: string[] | null }>)[primaryEquip] : null;
            const attachmentOptions = primaryEquip === "Cable" && prev.cableAttachment
                ? (CABLE_ATTACHMENT_GRIP_STANCE_OPTIONS as Record<string, { gripType?: string[] | null; gripWidth?: string[] | null; stanceType?: string[] | null; stanceWidth?: string[] | null }>)[cableAttachmentOptsKey(prev.cableAttachment)]
                : null;
            const options = attachmentOptions ?? baseOptions;

            // Clear Cable Attachment if Cable is no longer selected
            const shouldKeepCableAttachment = updatedTags.includes("Cable");

            // Clear Single/Double if primary equipment doesn't support it
            const shouldKeepSingleDouble = SINGLE_DOUBLE_EQUIPMENT.includes(primaryEquip);

            // Clear Assisted/Negative if primary is not Machine (Selectorized)
            const isMachineSelectorized = primaryEquip === "Machine (Selectorized)";

            // Clear grip/stance if not in the new equipment's allowed options
            const gripTypeOk = !prev.gripType || (options?.gripType && options.gripType.includes(prev.gripType));
            const gripWidthOk = !prev.gripWidth || (options?.gripWidth && options.gripWidth.includes(prev.gripWidth));
            const stanceTypeOk = !prev.stanceType || (options?.stanceType && options.stanceType.includes(prev.stanceType));
            const stanceWidthOk = !prev.stanceWidth || (options?.stanceWidth && options.stanceWidth.includes(prev.stanceWidth));

            return {
                ...prev,
                weightEquipTags: newTags,
                ...(primaryEquip === "Dumbbell" && { singleDouble: "double" }),
                ...(!shouldKeepSingleDouble && primaryEquip !== "Dumbbell" && { singleDouble: "" }),
                ...(!shouldKeepCableAttachment && { cableAttachment: "" }),
                ...(!isMachineSelectorized && { assistedNegative: false }),
                ...(!gripTypeOk && { gripType: "" }),
                ...(!gripWidthOk && { gripWidth: "" }),
                ...(!stanceTypeOk && { stanceType: "" }),
                ...(!stanceWidthOk && { stanceWidth: "" }),
            };
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
                const secondariesToRemove = PRIMARY_TO_SECONDARY_MAP[muscle] || [];
                newSecondaries = prev.secondaryMuscles.filter(s => !secondariesToRemove.includes(s));
            } else {
                if (isSpecial) { newPrimaries = [muscle]; newSecondaries = []; }
                else {
                    if (hasSpecialSelected) { newPrimaries = [muscle]; newSecondaries = []; }
                    else { newPrimaries = [...prev.primaryMuscles, muscle]; }
                }
                const hasSecondaries = PRIMARY_TO_SECONDARY_MAP[muscle] && PRIMARY_TO_SECONDARY_MAP[muscle].length > 0;
                if (secondaryMusclesEnabled && hasSecondaries) setActivePrimaryForPopup(muscle);
            }
            return { ...prev, primaryMuscles: newPrimaries, secondaryMuscles: newSecondaries };
        });
    };

    const handleCategoryChange = (cat: ExerciseCategory) => {
        setEditState(prev => ({ 
            ...prev, 
            category: cat, 
            primaryMuscles: [], 
            secondaryMuscles: [], 
            cardioType: "", 
            trainingFocus: "", 
            weightEquipTags: [], 
            trackReps: false, 
            trackDistance: false,
            singleDouble: "",
            cableAttachment: "",
            gripType: "",
            gripWidth: "",
            stanceType: "",
            stanceWidth: "",
            assistedNegative: false
        }));
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
            ...(editState.singleDouble && { singleDouble: editState.singleDouble }),
            ...(editState.cableAttachment && { cableAttachment: editState.cableAttachment }),
            ...(editState.gripType && { gripType: editState.gripType }),
            ...(editState.gripWidth && { gripWidth: editState.gripWidth }),
            ...(editState.stanceType && { stanceType: editState.stanceType }),
            ...(editState.stanceWidth && { stanceWidth: editState.stanceWidth }),
            ...(editState.assistedNegative && { assistedNegative: editState.assistedNegative }),
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
        if (PRIMARY_TO_SECONDARY_MAP[primary]) {
            return PRIMARY_TO_SECONDARY_MAP[primary].sort();
        }
        return [];
    };

    // Helper function to check if Single/Double toggle should be shown (Free-Weights: Dumbbell/Kettlebell/Plate/Chains, Cable, Other)
    const shouldShowSingleDouble = (): boolean => {
        const tags = editState.weightEquipTags.filter(Boolean);
        return tags.some(tag => SINGLE_DOUBLE_EQUIPMENT.includes(tag));
    };

    // Helper function to check if Cable Attachments should be shown
    const shouldShowCableAttachments = (): boolean => {
        return editState.weightEquipTags.includes("Cable");
    };

    // Get grip/stance options for the primary (first) selected equipment.
    // When Single is selected for Single/Double equipment: empty (no options).
    // When Cable has a Cable Attachment selected: use attachment-specific options.
    const getPrimaryEquipmentGripStanceOptions = (): {
        gripTypeOptions: string[] | null;
        gripWidthOptions: string[] | null;
        stanceTypeOptions: string[] | null;
        stanceWidthOptions: string[] | null;
    } => {
        const primaryEquip = editState.weightEquipTags.filter(Boolean)[0] || "";
        if (!primaryEquip) {
            return { gripTypeOptions: null, gripWidthOptions: null, stanceTypeOptions: null, stanceWidthOptions: null };
        }
        // Single = true: empty grip/stance (configurable later)
        if (SINGLE_DOUBLE_EQUIPMENT.includes(primaryEquip) && editState.singleDouble === "single") {
            return { gripTypeOptions: null, gripWidthOptions: null, stanceTypeOptions: null, stanceWidthOptions: null };
        }
        // Cable with attachment selected: use attachment options
        const attachmentOpts = primaryEquip === "Cable" && editState.cableAttachment
            ? (CABLE_ATTACHMENT_GRIP_STANCE_OPTIONS as Record<string, { gripType?: string[] | null; gripWidth?: string[] | null; stanceType?: string[] | null; stanceWidth?: string[] | null }>)[cableAttachmentOptsKey(editState.cableAttachment)]
            : null;
        const options = attachmentOpts ?? (EQUIPMENT_GRIP_STANCE_OPTIONS as Record<string, { gripType?: string[] | null; gripWidth?: string[] | null; stanceType?: string[] | null; stanceWidth?: string[] | null }>)[primaryEquip];
        if (!options) {
            return { gripTypeOptions: null, gripWidthOptions: null, stanceTypeOptions: null, stanceWidthOptions: null };
        }
        return {
            gripTypeOptions: options.gripType && options.gripType.length > 0 ? options.gripType : null,
            gripWidthOptions: options.gripWidth && options.gripWidth.length > 0 ? options.gripWidth : null,
            stanceTypeOptions: options.stanceType && options.stanceType.length > 0 ? options.stanceType : null,
            stanceWidthOptions: options.stanceWidth && options.stanceWidth.length > 0 ? options.stanceWidth : null,
        };
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
                    <FieldGroup>
                        <View style={styles.rowBetween}>
                            <Label required style={{ marginBottom: 0 }}>{FIELD_LABELS.exerciseName}</Label>
                            <TouchableOpacity onPress={() => setShowDescription(!showDescription)} style={styles.rowGap}>
                                <Text style={[styles.label, { marginBottom: 0, color: editState.description ? COLORS.blue[600] : COLORS.slate[400] }]}>{FIELD_LABELS.description}</Text>
                                <ChevronDown size={16} color={showDescription ? COLORS.blue[600] : COLORS.slate[400]} style={{ transform: [{ rotate: showDescription ? '180deg' : '0deg' }] }} />
                            </TouchableOpacity>
                        </View>
                        <ExerciseNameInput value={editState.name} onChange={(text) => setEditState((prev) => ({ ...prev, name: text }))} />
                        {showDescription && (
                            <View style={{ marginTop: 8, marginBottom: 10 }}>
                                <DescriptionInput value={editState.description} onChange={(text) => setEditState((prev) => ({ ...prev, description: text }))} />
                            </View>
                        )}
                    </FieldGroup>

                    <FieldGroup>
                        <Label required>{FIELD_LABELS.category}</Label>
                        <View style={styles.categoryContainer}>
                            {categories.map((cat) => (
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
                    </FieldGroup>

                    {editState.category === 'Lifts' && (
                        <View style={styles.section}>
                            <PrimaryMuscleChips
                                primaryMuscles={editState.primaryMuscles}
                                secondaryMusclesEnabled={secondaryMusclesEnabled}
                                onSecondaryToggle={() => {
                                    const newVal = !secondaryMusclesEnabled;
                                    setSecondaryMusclesEnabled(newVal);
                                    if (!newVal) setEditState((prev) => ({ ...prev, secondaryMuscles: [] }));
                                }}
                                onMuscleToggle={handlePrimaryMuscleToggle}
                                onMakePrimary={handleMakePrimary}
                                required
                            />

                            <FieldGroup>
                                <EquipmentBlock
                                    variant="lifts"
                                    weightEquipTags={editState.weightEquipTags}
                                    showSecondEquip={showSecondEquip}
                                    onToggleSecondEquip={() => {
                                        const newVal = !showSecondEquip;
                                        setShowSecondEquip(newVal);
                                        if (!newVal) setEditState((prev) => ({ ...prev, weightEquipTags: [prev.weightEquipTags[0]].filter(Boolean) }));
                                    }}
                                    onEquipPress={(slot) => setEquipmentPickerSlot(slot)}
                                    gripType={editState.gripType}
                                    gripWidth={editState.gripWidth}
                                    stanceType={editState.stanceType}
                                    stanceWidth={editState.stanceWidth}
                                    singleDouble={editState.singleDouble}
                                    onGripTypeChange={(val) => setEditState((prev) => ({ ...prev, gripType: val }))}
                                    onGripWidthChange={(val) => setEditState((prev) => ({ ...prev, gripWidth: val }))}
                                    onStanceTypeChange={(val) => setEditState((prev) => ({ ...prev, stanceType: val }))}
                                    onStanceWidthChange={(val) => setEditState((prev) => ({ ...prev, stanceWidth: val }))}
                                    onSingleDoubleChange={handleSingleDoubleChange}
                                    getGripStanceOptions={getPrimaryEquipmentGripStanceOptions}
                                    showSingleDouble={false}
                                />
                            </FieldGroup>

                            {shouldShowCableAttachments() && (
                                <CableAttachmentsField value={editState.cableAttachment} onChange={handleCableAttachmentChange} />
                            )}
                            {editState.weightEquipTags.filter(Boolean)[0] === 'Machine (Selectorized)' && (
                                <AssistedNegativeRow value={editState.assistedNegative} onChange={(v) => setEditState((prev) => ({ ...prev, assistedNegative: v }))} />
                            )}

                            <View style={styles.additionalSettings}>
                                <Text style={styles.label}>{FIELD_LABELS.additionalSettings}</Text>
                            </View>

                            <CollapsibleSection
                                label={FIELD_LABELS.metabolicIntensity}
                                expanded={showLiftsCardioType}
                                onToggle={() => setShowLiftsCardioType(!showLiftsCardioType)}
                                badgeText={!showLiftsCardioType && editState.cardioType ? editState.cardioType : undefined}
                            >
                                <MetabolicIntensityDropdown value={editState.cardioType} onChange={(val) => setEditState((prev) => ({ ...prev, cardioType: val }))} />
                            </CollapsibleSection>

                            <ToggleRow
                                label={FIELD_LABELS.allowDurationTracking}
                                toggleLabel={FIELD_LABELS.trackDuration}
                                value={editState.trackDuration}
                                onToggle={() => setEditState((prev) => ({ ...prev, trackDuration: !prev.trackDuration }))}
                            />
                        </View>
                    )}

                    {editState.category === 'Cardio' && (
                        <View style={styles.section}>
                            <FieldGroup>
                                <Label>{FIELD_LABELS.metabolicIntensity}</Label>
                                <MetabolicIntensityDropdown value={editState.cardioType} onChange={(val) => setEditState((prev) => ({ ...prev, cardioType: val }))} />
                            </FieldGroup>
                            <View style={styles.additionalSettings}>
                                <Text style={styles.label}>{FIELD_LABELS.additionalSettings}</Text>
                            </View>
                            <ToggleRow
                                label={FIELD_LABELS.allowDistanceTracking}
                                toggleLabel={FIELD_LABELS.trackDistance}
                                value={editState.trackDistance}
                                onToggle={() => setEditState((prev) => ({ ...prev, trackDistance: !prev.trackDistance }))}
                            />
                            <CollapsibleSection
                                label={FIELD_LABELS.weightEquip}
                                expanded={showWeightEquip}
                                onToggle={() => setShowWeightEquip(!showWeightEquip)}
                            >
                                <FieldGroup>
                                    <EquipmentBlock
                                        variant="cardioTraining"
                                        weightEquipTags={editState.weightEquipTags}
                                        showSecondEquip={showSecondEquip}
                                        onToggleSecondEquip={() => {
                                            const newVal = !showSecondEquip;
                                            setShowSecondEquip(newVal);
                                            if (!newVal) setEditState((prev) => ({ ...prev, weightEquipTags: [prev.weightEquipTags[0]].filter(Boolean) }));
                                        }}
                                        onEquipPress={(slot) => setEquipmentPickerSlot(slot)}
                                        gripType={editState.gripType}
                                        gripWidth={editState.gripWidth}
                                        stanceType={editState.stanceType}
                                        stanceWidth={editState.stanceWidth}
                                        singleDouble={editState.singleDouble}
                                        onGripTypeChange={(val) => setEditState((prev) => ({ ...prev, gripType: val }))}
                                        onGripWidthChange={(val) => setEditState((prev) => ({ ...prev, gripWidth: val }))}
                                        onStanceTypeChange={(val) => setEditState((prev) => ({ ...prev, stanceType: val }))}
                                        onStanceWidthChange={(val) => setEditState((prev) => ({ ...prev, stanceWidth: val }))}
                                        onSingleDoubleChange={handleSingleDoubleChange}
                                        getGripStanceOptions={getPrimaryEquipmentGripStanceOptions}
                                        showSingleDouble={shouldShowSingleDouble()}
                                    />
                                </FieldGroup>
                            </CollapsibleSection>
                            {showWeightEquip && editState.weightEquipTags.filter(Boolean).length > 0 && (
                                <>
                                    {shouldShowCableAttachments() && (
                                        <CableAttachmentsField value={editState.cableAttachment} onChange={handleCableAttachmentChange} />
                                    )}
                                    {editState.weightEquipTags.filter(Boolean)[0] === 'Machine (Selectorized)' && (
                                        <AssistedNegativeRow value={editState.assistedNegative} onChange={(v) => setEditState((prev) => ({ ...prev, assistedNegative: v }))} />
                                    )}
                                </>
                            )}
                        </View>
                    )}

                    {editState.category === 'Training' && (
                        <View style={styles.section}>
                            <FieldGroup>
                                <Label>{FIELD_LABELS.trainingFocus}</Label>
                                <TrainingFocusDropdown value={editState.trainingFocus} onChange={(val) => setEditState((prev) => ({ ...prev, trainingFocus: val }))} />
                            </FieldGroup>
                            <View style={styles.additionalSettings}>
                                <Text style={styles.label}>{FIELD_LABELS.additionalSettings}</Text>
                            </View>

                            <CollapsibleSection
                                label={FIELD_LABELS.metabolicIntensity}
                                expanded={showTrainingCardioType}
                                onToggle={() => setShowTrainingCardioType(!showTrainingCardioType)}
                                badgeText={!showTrainingCardioType && editState.cardioType ? editState.cardioType : undefined}
                            >
                                <MetabolicIntensityDropdown value={editState.cardioType} onChange={(val) => setEditState((prev) => ({ ...prev, cardioType: val }))} />
                            </CollapsibleSection>

                            <TrainingMuscleGroupsCollapsible
                                expanded={showTrainingMuscleGroups}
                                onToggle={() => setShowTrainingMuscleGroups(!showTrainingMuscleGroups)}
                                secondaryMusclesEnabled={secondaryMusclesEnabled}
                                onSecondaryToggle={() => {
                                    const newVal = !secondaryMusclesEnabled;
                                    setSecondaryMusclesEnabled(newVal);
                                    if (!newVal) setEditState((prev) => ({ ...prev, secondaryMuscles: [] }));
                                }}
                                primaryMuscles={editState.primaryMuscles}
                                onMuscleToggle={handlePrimaryMuscleToggle}
                                onMakePrimary={handleMakePrimary}
                                primaryMusclesList={PRIMARY_MUSCLES}
                            />

                            <CollapsibleSection
                                label={FIELD_LABELS.weightEquip}
                                expanded={showWeightEquip}
                                onToggle={() => setShowWeightEquip(!showWeightEquip)}
                            >
                                <FieldGroup>
                                    <EquipmentBlock
                                        variant="cardioTraining"
                                        weightEquipTags={editState.weightEquipTags}
                                        showSecondEquip={showSecondEquip}
                                        onToggleSecondEquip={() => {
                                            const newVal = !showSecondEquip;
                                            setShowSecondEquip(newVal);
                                            if (!newVal) setEditState((prev) => ({ ...prev, weightEquipTags: [prev.weightEquipTags[0]].filter(Boolean) }));
                                        }}
                                        onEquipPress={(slot) => setEquipmentPickerSlot(slot)}
                                        gripType={editState.gripType}
                                        gripWidth={editState.gripWidth}
                                        stanceType={editState.stanceType}
                                        stanceWidth={editState.stanceWidth}
                                        singleDouble={editState.singleDouble}
                                        onGripTypeChange={(val) => setEditState((prev) => ({ ...prev, gripType: val }))}
                                        onGripWidthChange={(val) => setEditState((prev) => ({ ...prev, gripWidth: val }))}
                                        onStanceTypeChange={(val) => setEditState((prev) => ({ ...prev, stanceType: val }))}
                                        onStanceWidthChange={(val) => setEditState((prev) => ({ ...prev, stanceWidth: val }))}
                                        onSingleDoubleChange={handleSingleDoubleChange}
                                        getGripStanceOptions={getPrimaryEquipmentGripStanceOptions}
                                        showSingleDouble={shouldShowSingleDouble()}
                                    />
                                </FieldGroup>
                            </CollapsibleSection>
                            {showWeightEquip && editState.weightEquipTags.filter(Boolean).length > 0 && (
                                <>
                                    {shouldShowCableAttachments() && (
                                        <CableAttachmentsField value={editState.cableAttachment} onChange={handleCableAttachmentChange} />
                                    )}
                                    {editState.weightEquipTags.filter(Boolean)[0] === 'Machine (Selectorized)' && (
                                        <AssistedNegativeRow value={editState.assistedNegative} onChange={(v) => setEditState((prev) => ({ ...prev, assistedNegative: v }))} />
                                    )}
                                </>
                            )}

                            <ToggleRow
                                label={FIELD_LABELS.allowRepsTracking}
                                toggleLabel={FIELD_LABELS.trackReps}
                                value={editState.trackReps}
                                onToggle={() => setEditState((prev) => ({ ...prev, trackReps: !prev.trackReps }))}
                            />
                            <ToggleRow
                                label={FIELD_LABELS.allowDurationTracking}
                                toggleLabel={FIELD_LABELS.trackDuration}
                                value={editState.trackDuration}
                                onToggle={() => setEditState((prev) => ({ ...prev, trackDuration: !prev.trackDuration }))}
                            />
                            <ToggleRow
                                label={FIELD_LABELS.allowDistanceTracking}
                                toggleLabel={FIELD_LABELS.trackDistance}
                                value={editState.trackDistance}
                                onToggle={() => setEditState((prev) => ({ ...prev, trackDistance: !prev.trackDistance }))}
                            />
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

                <EquipmentPickerModal
                    visible={equipmentPickerSlot !== null}
                    onClose={() => setEquipmentPickerSlot(null)}
                    onSelect={(val) => {
                        if (equipmentPickerSlot !== null) {
                            handleEquipChange(equipmentPickerSlot, val);
                            setEquipmentPickerSlot(null);
                        }
                    }}
                    selectedValue={equipmentPickerSlot !== null ? editState.weightEquipTags[equipmentPickerSlot] || "" : ""}
                    placeholder={equipmentPickerSlot === 1 ? "Select 2nd Equipment..." : "Select Equipment..."}
                    allowClear
                />

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

export default EditExercise;
