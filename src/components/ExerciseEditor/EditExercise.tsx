import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, ToggleLeft, ToggleRight, Check } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import {
    SINGLE_DOUBLE_OPTIONS,
    EQUIPMENT_GRIP_STANCE_OPTIONS,
    CABLE_ATTACHMENT_GRIP_STANCE_OPTIONS,
    optionIdFromLegacy,
    buildCableAttachmentsById,
    buildGripTypesById,
    buildGripWidthsById,
    STANCE_TYPES,
    STANCE_TYPES_BY_ID,
    STANCE_WIDTHS,
    STANCE_WIDTHS_BY_ID,
    SINGLE_DOUBLE_OPTIONS_BY_ID,
} from '@/constants/data';
import { usePrimaryToSecondaryMap, useCableAttachments, useSingleDoubleEquipmentLabels, useTertiaryMuscles, useSecondaryMuscles, useGripTypes, useGripWidths } from '@/database/useExerciseConfig';
import { getTertiaryMusclesBySecondary } from '@/database/exerciseConfigService';
import Chip from './Chip';
import CustomDropdown from './CustomDropdown';
import EquipmentPickerModal from './EquipmentPickerModal';
import MotionPickerModal from './MotionPickerModal';
import type { ExerciseLibraryItem, ExerciseCategory } from '@/types/workout';
import { FIELD_LABELS } from './editExerciseFieldConfig';
import styles, { musclePickerStyles } from './EditExercise.styles';
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
    tertiaryMuscles?: string[];
    primaryMotion?: string;
    primaryMotionVariation?: string;
    motionPlane?: string;
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
    name: "", category: "", primaryMuscles: [], secondaryMuscles: [], tertiaryMuscles: [],
    primaryMotion: "", primaryMotionVariation: "", motionPlane: "",
    cardioType: "", trainingFocus: "", weightEquipTags: [], description: "",
    trackDuration: false, trackReps: false, trackDistance: false,
    singleDouble: "", cableAttachment: "", gripType: "", gripWidth: "",
    stanceType: "", stanceWidth: "", assistedNegative: false
});

const getStateFromExercise = (
    exercise: ExerciseLibraryItem,
    cableAttachments: { id: string; label: string }[],
    cableAttachmentsById: Record<string, { id: string; label: string }>,
    gripTypes: { id: string; label: string }[],
    gripTypesById: Record<string, { id: string; label: string }>,
    gripWidths: { id: string; label: string }[],
    gripWidthsById: Record<string, { id: string; label: string }>
): EditExerciseState => {
    const raw = {
        name: exercise.name || "",
        category: exercise.category || "",
        primaryMuscles: (exercise.primaryMuscles as string[]) || [],
        secondaryMuscles: (exercise.secondaryMuscles as string[]) || [],
        tertiaryMuscles: (exercise.tertiaryMuscles as string[]) || [],
        primaryMotion: (exercise.primaryMotion as string) || "",
        primaryMotionVariation: (exercise.primaryMotionVariation as string) || "",
        motionPlane: (exercise.motionPlane as string) || "",
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
        gripType: optionIdFromLegacy(raw.gripType, gripTypes, gripTypesById),
        gripWidth: optionIdFromLegacy(raw.gripWidth, gripWidths, gripWidthsById),
        stanceType: optionIdFromLegacy(raw.stanceType, STANCE_TYPES, STANCE_TYPES_BY_ID),
        stanceWidth: optionIdFromLegacy(raw.stanceWidth, STANCE_WIDTHS, STANCE_WIDTHS_BY_ID),
    };
};

/** Secondary Muscle Picker - inner content (shared by Modal and overlay variants) */
const SecondaryMusclePickerContent: React.FC<{
    visible: boolean;
    onClose: () => void;
    primaryMuscle: string;
    availableSecondaryMuscles: string[];
    selectedSecondaryMuscles: string[];
    selectedTertiaryMuscles: string[];
    onSelectSecondary: (muscle: string) => void;
    onSelectTertiary: (tertiary: string) => void;
    onCancel: () => void;
}> = ({
    visible,
    onClose,
    primaryMuscle,
    availableSecondaryMuscles,
    selectedSecondaryMuscles,
    selectedTertiaryMuscles,
    onSelectSecondary,
    onSelectTertiary,
    onCancel,
}) => {
        const allTertiaryMuscles = useTertiaryMuscles();
        const allSecondaryMuscles = useSecondaryMuscles();
        const [tertiaryMusclesBySecondary, setTertiaryMusclesBySecondary] = useState<Record<string, typeof allTertiaryMuscles>>({});

        const secondaryMuscleLabelMap = useMemo(() => {
            const map: Record<string, string> = {};
            allSecondaryMuscles.forEach(muscle => {
                map[muscle.id] = muscle.label;
            });
            return map;
        }, [allSecondaryMuscles]);

        useEffect(() => {
            if (!visible) {
                setTertiaryMusclesBySecondary({});
                return;
            }
            if (selectedSecondaryMuscles.length > 0) {
                Promise.all(
                    selectedSecondaryMuscles.map(secondaryId =>
                        getTertiaryMusclesBySecondary([secondaryId]).then(tertiaries => ({
                            secondaryId,
                            tertiaries
                        }))
                    )
                ).then(results => {
                    const grouped: Record<string, typeof allTertiaryMuscles> = {};
                    results.forEach(({ secondaryId, tertiaries }) => {
                        if (tertiaries.length > 0) {
                            grouped[secondaryId] = tertiaries;
                        }
                    });
                    setTertiaryMusclesBySecondary(grouped);
                });
            } else {
                setTertiaryMusclesBySecondary({});
            }
        }, [selectedSecondaryMuscles, visible]);

        if (!visible) return null;

        return (
            <TouchableOpacity
                style={musclePickerStyles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={musclePickerStyles.centered}
                >
                    <View style={musclePickerStyles.modal} onStartShouldSetResponder={() => true}>
                        <View style={musclePickerStyles.twoColumnContainer}>
                            <ScrollView style={musclePickerStyles.column} contentContainerStyle={musclePickerStyles.columnContent}>
                                <Text style={musclePickerStyles.columnTitle}>
                                    {(primaryMuscle.endsWith('s') ? primaryMuscle.slice(0, -1) : primaryMuscle).toUpperCase()} MUSCLE
                                </Text>
                                {availableSecondaryMuscles.map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[
                                            musclePickerStyles.option,
                                            selectedSecondaryMuscles.includes(m) && musclePickerStyles.optionSelected,
                                        ]}
                                        onPress={() => onSelectSecondary(m)}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                            style={[
                                                musclePickerStyles.optionText,
                                                selectedSecondaryMuscles.includes(m) && musclePickerStyles.optionTextSelected,
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {m}
                                        </Text>
                                        {selectedSecondaryMuscles.includes(m) && (
                                            <Check size={18} color={COLORS.blue[600]} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            {selectedSecondaryMuscles.length > 0 && Object.keys(tertiaryMusclesBySecondary).length > 0 && (
                                <>
                                    <View style={musclePickerStyles.columnDivider} />
                                    <ScrollView style={musclePickerStyles.column} contentContainerStyle={musclePickerStyles.columnContent}>
                                        <Text style={musclePickerStyles.columnTitle}>GRANULAR MUSCLES</Text>
                                        {selectedSecondaryMuscles.map(secondaryId => {
                                            const tertiaries = tertiaryMusclesBySecondary[secondaryId] || [];
                                            if (tertiaries.length === 0) return null;
                                            const secondaryLabel = secondaryMuscleLabelMap[secondaryId] || secondaryId;
                                            return (
                                                <View key={secondaryId}>
                                                    <Text style={musclePickerStyles.sectionHeader}>
                                                        {secondaryLabel.toUpperCase()}
                                                    </Text>
                                                    {tertiaries.map(tertiary => (
                                                        <TouchableOpacity
                                                            key={tertiary.id}
                                                            style={[
                                                                musclePickerStyles.option,
                                                                selectedTertiaryMuscles.includes(tertiary.id) && musclePickerStyles.optionSelected,
                                                            ]}
                                                            onPress={() => onSelectTertiary(tertiary.id)}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Text
                                                                style={[
                                                                    musclePickerStyles.optionText,
                                                                    selectedTertiaryMuscles.includes(tertiary.id) && musclePickerStyles.optionTextSelected,
                                                                ]}
                                                                numberOfLines={1}
                                                            >
                                                                {tertiary.label}
                                                            </Text>
                                                            {selectedTertiaryMuscles.includes(tertiary.id) && (
                                                                <Check size={18} color={COLORS.blue[600]} />
                                                            )}
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            );
                                        })}
                                    </ScrollView>
                                </>
                            )}
                        </View>
                        <View style={musclePickerStyles.footerRow}>
                            <TouchableOpacity onPress={onCancel} style={musclePickerStyles.cancelButtonInRow}>
                                <Text style={musclePickerStyles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onClose} style={musclePickerStyles.doneButton}>
                                <Text style={musclePickerStyles.doneButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </TouchableOpacity>
        );
    };

/** Secondary Muscle Picker Modal - wraps content in a native Modal (for use outside other modals) */
const SecondaryMusclePickerModal: React.FC<{
    visible: boolean;
    onClose: () => void;
    primaryMuscle: string;
    availableSecondaryMuscles: string[];
    selectedSecondaryMuscles: string[];
    selectedTertiaryMuscles: string[];
    onSelectSecondary: (muscle: string) => void;
    onSelectTertiary: (tertiary: string) => void;
    onCancel: () => void;
}> = (props) => (
    <Modal visible={props.visible} transparent animationType="fade" onRequestClose={props.onClose}>
        <SecondaryMusclePickerContent {...props} />
    </Modal>
);

/** Secondary Muscle Picker Overlay - renders as an absolutely positioned View (for use inside other modals) */
const SecondaryMusclePickerOverlay: React.FC<{
    visible: boolean;
    onClose: () => void;
    primaryMuscle: string;
    availableSecondaryMuscles: string[];
    selectedSecondaryMuscles: string[];
    selectedTertiaryMuscles: string[];
    onSelectSecondary: (muscle: string) => void;
    onSelectTertiary: (tertiary: string) => void;
    onCancel: () => void;
}> = (props) => {
    if (!props.visible) return null;
    return (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
            <SecondaryMusclePickerContent {...props} />
        </View>
    );
};

const EditExercise: React.FC<EditExerciseProps> = ({ isOpen, onClose, onSave, categories, exercise }) => {
    const isEditMode = !!exercise;
    const PRIMARY_TO_SECONDARY_MAP = usePrimaryToSecondaryMap();
    const allSecondaryMuscles = useSecondaryMuscles();
    const allTertiaryMuscles = useTertiaryMuscles();
    const CABLE_ATTACHMENTS = useCableAttachments();
    const CABLE_ATTACHMENTS_BY_ID = useMemo(() => buildCableAttachmentsById(CABLE_ATTACHMENTS), [CABLE_ATTACHMENTS]);
    const SINGLE_DOUBLE_EQUIPMENT = useSingleDoubleEquipmentLabels();
    const GRIP_TYPES = useGripTypes();
    const GRIP_TYPES_BY_ID = useMemo(() => buildGripTypesById(GRIP_TYPES), [GRIP_TYPES]);
    const GRIP_WIDTHS = useGripWidths();
    const GRIP_WIDTHS_BY_ID = useMemo(() => buildGripWidthsById(GRIP_WIDTHS), [GRIP_WIDTHS]);

    // Load motion data
    const [primaryMotions, setPrimaryMotions] = useState<any[]>([]);
    const [primaryMotionVariations, setPrimaryMotionVariations] = useState<any[]>([]);
    const [motionPlanes, setMotionPlanes] = useState<any[]>([]);

    useEffect(() => {
        Promise.all([
            import('@/database/tables/primaryMotions.json').then(m => m.default),
            import('@/database/tables/primaryMotionVariations.json').then(m => m.default),
            import('@/database/tables/motionPlanes.json').then(m => m.default),
        ]).then(([motions, variations, planes]) => {
            setPrimaryMotions(motions.filter((m: any) => m.is_active));
            setPrimaryMotionVariations(variations.filter((v: any) => v.is_active));
            setMotionPlanes(planes.filter((p: any) => p.is_active));
        });
    }, []);

    const [editState, setEditState] = useState<EditExerciseState>(getInitialState());
    const [secondaryMusclesEnabled, setSecondaryMusclesEnabled] = useState(false);
    const [activePrimaryForPopup, setActivePrimaryForPopup] = useState<string | null>(null);
    const [showDescription, setShowDescription] = useState(false);
    const [showSecondEquip, setShowSecondEquip] = useState(false);
    const [showWeightEquip, setShowWeightEquip] = useState(false);
    const [showTrainingCardioType, setShowTrainingCardioType] = useState(false);
    const [showLiftsCardioType, setShowLiftsCardioType] = useState(false);
    const [equipmentPickerSlot, setEquipmentPickerSlot] = useState<0 | 1 | null>(null);
    const [showMotionPicker, setShowMotionPicker] = useState(false);
    const [initialSecondaryMuscles, setInitialSecondaryMuscles] = useState<string[]>([]);
    const [initialTertiaryMuscles, setInitialTertiaryMuscles] = useState<string[]>([]);

    // Populate form when opening in edit mode
    useEffect(() => {
        if (isOpen && exercise && GRIP_TYPES.length > 0 && GRIP_WIDTHS.length > 0) {
            const state = getStateFromExercise(exercise, CABLE_ATTACHMENTS, CABLE_ATTACHMENTS_BY_ID, GRIP_TYPES, GRIP_TYPES_BY_ID, GRIP_WIDTHS, GRIP_WIDTHS_BY_ID);
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
            setShowLiftsCardioType(false);
        }
    }, [isOpen, exercise, CABLE_ATTACHMENTS, GRIP_TYPES, GRIP_WIDTHS]);

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
            const isSpecial = ["Full Body"].includes(muscle);
            const currentSpecials = prev.primaryMuscles.filter(m => ["Full Body"].includes(m));
            const hasSpecialSelected = currentSpecials.length > 0;
            let newPrimaries: string[] = [], newSecondaries = prev.secondaryMuscles;
            let newTertiaries = prev.tertiaryMuscles || [];

            if (isSelected) {
                newPrimaries = prev.primaryMuscles.filter(m => m !== muscle);
                const secondariesToRemoveLabels = PRIMARY_TO_SECONDARY_MAP[muscle] || [];
                newSecondaries = prev.secondaryMuscles.filter(s => !secondariesToRemoveLabels.includes(s));
                // Clear tertiary muscles that belong to removed secondary muscles
                if (newTertiaries.length > 0) {
                    // Convert labels to IDs
                    const secondariesToRemoveIds = secondariesToRemoveLabels
                        .map(label => allSecondaryMuscles.find(s => s.label === label)?.id)
                        .filter((id): id is string => id !== undefined);
                    if (secondariesToRemoveIds.length > 0) {
                        getTertiaryMusclesBySecondary(secondariesToRemoveIds).then(tertiariesToRemove => {
                            const tertiaryIdsToRemove = tertiariesToRemove.map(t => t.id);
                            setEditState(prevState => ({
                                ...prevState,
                                tertiaryMuscles: (prevState.tertiaryMuscles || []).filter(t => !tertiaryIdsToRemove.includes(t))
                            }));
                        });
                    }
                }
            } else {
                if (isSpecial) { newPrimaries = [muscle]; newSecondaries = []; newTertiaries = []; }
                else {
                    if (hasSpecialSelected) { newPrimaries = [muscle]; newSecondaries = []; newTertiaries = []; }
                    else { newPrimaries = [...prev.primaryMuscles, muscle]; }
                }
                const hasSecondaries = PRIMARY_TO_SECONDARY_MAP[muscle] && PRIMARY_TO_SECONDARY_MAP[muscle].length > 0;
                if (secondaryMusclesEnabled && hasSecondaries) {
                    // Store initial state before opening popup
                    setInitialSecondaryMuscles([...prev.secondaryMuscles]);
                    setInitialTertiaryMuscles([...(prev.tertiaryMuscles || [])]);
                    setActivePrimaryForPopup(muscle);
                }
            }
            return { ...prev, primaryMuscles: newPrimaries, secondaryMuscles: newSecondaries, tertiaryMuscles: newTertiaries };
        });
    };

    const handleCategoryChange = (cat: ExerciseCategory) => {
        setEditState(prev => ({
            ...prev,
            category: cat,
            primaryMuscles: [],
            secondaryMuscles: [],
            tertiaryMuscles: [],
            primaryMotion: "",
            primaryMotionVariation: "",
            motionPlane: "",
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
        setShowLiftsCardioType(false);
        setActivePrimaryForPopup(null);
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
            ...(editState.tertiaryMuscles && editState.tertiaryMuscles.length > 0 && { tertiaryMuscles: editState.tertiaryMuscles }),
            ...(editState.primaryMotion && { primaryMotion: editState.primaryMotion }),
            ...(editState.primaryMotionVariation && { primaryMotionVariation: editState.primaryMotionVariation }),
            ...(editState.motionPlane && { motionPlane: editState.motionPlane }),
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
        }
    };

    const getAvailableSecondaryMuscles = (primary: string): string[] => {
        if (PRIMARY_TO_SECONDARY_MAP[primary]) {
            return PRIMARY_TO_SECONDARY_MAP[primary].sort();
        }
        return [];
    };

    const getHasTertiarySelectedForPrimary = (primary: string): boolean => {
        const secondaryLabels = getAvailableSecondaryMuscles(primary);
        const secondaryIds = secondaryLabels.map(l => allSecondaryMuscles.find(s => s.label === l)?.id).filter(Boolean) as string[];
        const selectedTertiaryIds = editState.tertiaryMuscles || [];
        return selectedTertiaryIds.some(tid => {
            const t = allTertiaryMuscles.find(x => x.id === tid);
            if (!t) return false;
            try {
                const secIds: string[] = JSON.parse(t.secondary_muscle_ids || '[]');
                return secIds.some(id => secondaryIds.includes(id));
            } catch {
                return false;
            }
        });
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
                        <View style={styles.labelToggleRow}>
                            <Label required style={{ marginBottom: 0 }}>{FIELD_LABELS.exerciseName}</Label>
                            <TouchableOpacity onPress={() => setShowDescription(!showDescription)} style={styles.toggleContainer}>
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
                            <FieldGroup>
                                <Label required>{FIELD_LABELS.primaryMuscleGroups} & Motion</Label>
                                <TouchableOpacity
                                    style={styles.input}
                                    onPress={() => setShowMotionPicker(true)}
                                >
                                    <Text style={(editState.primaryMuscles.length > 0 || editState.primaryMotion) ? styles.textSelected : styles.textPlaceholder}>
                                        {editState.primaryMuscles.length > 0 || editState.primaryMotion
                                            ? `${editState.primaryMuscles.join(', ') || ''}${editState.primaryMuscles.length > 0 && editState.primaryMotion ? ' - ' : ''}${editState.primaryMotion ? (primaryMotions.find(m => m.id === editState.primaryMotion)?.label || editState.primaryMotion) + (editState.primaryMotionVariation ? ` - ${primaryMotionVariations.find(v => v.id === editState.primaryMotionVariation)?.label || editState.primaryMotionVariation}` : '') : ''}`
                                            : 'Select Muscle Groups & Motion...'}
                                    </Text>
                                </TouchableOpacity>
                            </FieldGroup>

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

                            <FieldGroup>
                                <Label>{FIELD_LABELS.primaryMuscleGroups} & Motion</Label>
                                <TouchableOpacity
                                    style={styles.input}
                                    onPress={() => setShowMotionPicker(true)}
                                >
                                    <Text style={(editState.primaryMuscles.length > 0 || editState.primaryMotion) ? styles.textSelected : styles.textPlaceholder}>
                                        {editState.primaryMuscles.length > 0 || editState.primaryMotion
                                            ? `${editState.primaryMuscles.join(', ') || ''}${editState.primaryMuscles.length > 0 && editState.primaryMotion ? ' - ' : ''}${editState.primaryMotion ? (primaryMotions.find(m => m.id === editState.primaryMotion)?.label || editState.primaryMotion) + (editState.primaryMotionVariation ? ` - ${primaryMotionVariations.find(v => v.id === editState.primaryMotionVariation)?.label || editState.primaryMotionVariation}` : '') : ''}`
                                            : 'Select Muscle Groups & Motion...'}
                                    </Text>
                                </TouchableOpacity>
                            </FieldGroup>

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

                <MotionPickerModal
                    visible={showMotionPicker}
                    onClose={() => setShowMotionPicker(false)}
                    onSelect={(primaryMotion, variation, plane, muscles) => {
                        setEditState(prev => ({
                            ...prev,
                            primaryMotion: primaryMotion || '',
                            primaryMotionVariation: variation || '',
                            motionPlane: plane || '',
                            ...(muscles && {
                                primaryMuscles: muscles.primaryMuscles,
                                secondaryMuscles: muscles.secondaryMuscles,
                                tertiaryMuscles: muscles.tertiaryMuscles,
                            }),
                        }));
                    }}
                    selectedPrimaryMotion={editState.primaryMotion}
                    selectedVariation={editState.primaryMotionVariation}
                    selectedPlane={editState.motionPlane}
                    primaryMuscles={editState.primaryMuscles}
                    secondaryMuscles={editState.secondaryMuscles}
                    tertiaryMuscles={editState.tertiaryMuscles || []}
                    primaryMotions={primaryMotions}
                    primaryMotionVariations={primaryMotionVariations}
                    motionPlanes={motionPlanes}
                    onPrimaryMuscleToggle={handlePrimaryMuscleToggle}
                    onMakePrimary={handleMakePrimary}
                    secondaryMusclesEnabled={secondaryMusclesEnabled}
                    onSecondaryToggle={() => {
                        const newVal = !secondaryMusclesEnabled;
                        setSecondaryMusclesEnabled(newVal);
                        if (!newVal) setEditState((prev) => ({ ...prev, secondaryMuscles: [], tertiaryMuscles: [] }));
                    }}
                    onOpenSecondaryPopup={(primary) => {
                        setInitialSecondaryMuscles([...editState.secondaryMuscles]);
                        setInitialTertiaryMuscles([...(editState.tertiaryMuscles || [])]);
                        setActivePrimaryForPopup(primary);
                    }}
                    getAvailableSecondaryMuscles={getAvailableSecondaryMuscles}
                    getHasTertiarySelectedForPrimary={getHasTertiarySelectedForPrimary}
                    secondaryPopupContent={
                        <SecondaryMusclePickerOverlay
                            visible={!!activePrimaryForPopup}
                            onClose={() => setActivePrimaryForPopup(null)}
                            onCancel={() => {
                                setEditState(prev => ({
                                    ...prev,
                                    secondaryMuscles: initialSecondaryMuscles,
                                    tertiaryMuscles: initialTertiaryMuscles,
                                }));
                                setActivePrimaryForPopup(null);
                            }}
                            primaryMuscle={activePrimaryForPopup || ''}
                            availableSecondaryMuscles={getAvailableSecondaryMuscles(activePrimaryForPopup || '')}
                            selectedSecondaryMuscles={editState.secondaryMuscles}
                            selectedTertiaryMuscles={editState.tertiaryMuscles || []}
                            onSelectSecondary={(muscle) => toggleSelection('secondaryMuscles', muscle)}
                            onSelectTertiary={(tertiary) => {
                                setEditState(prev => {
                                    const current = (prev.tertiaryMuscles as string[]) || [];
                                    return {
                                        ...prev,
                                        tertiaryMuscles: current.includes(tertiary)
                                            ? current.filter(t => t !== tertiary)
                                            : [...current, tertiary]
                                    };
                                });
                            }}
                        />
                    }
                />

                {!showMotionPicker && (
                    <SecondaryMusclePickerModal
                        visible={!!activePrimaryForPopup}
                        onClose={() => setActivePrimaryForPopup(null)}
                        onCancel={() => {
                            setEditState(prev => ({
                                ...prev,
                                secondaryMuscles: initialSecondaryMuscles,
                                tertiaryMuscles: initialTertiaryMuscles,
                            }));
                            setActivePrimaryForPopup(null);
                        }}
                        primaryMuscle={activePrimaryForPopup || ''}
                        availableSecondaryMuscles={getAvailableSecondaryMuscles(activePrimaryForPopup || '')}
                        selectedSecondaryMuscles={editState.secondaryMuscles}
                        selectedTertiaryMuscles={editState.tertiaryMuscles || []}
                        onSelectSecondary={(muscle) => toggleSelection('secondaryMuscles', muscle)}
                        onSelectTertiary={(tertiary) => {
                            setEditState(prev => {
                                const current = (prev.tertiaryMuscles as string[]) || [];
                                return {
                                    ...prev,
                                    tertiaryMuscles: current.includes(tertiary)
                                        ? current.filter(t => t !== tertiary)
                                        : [...current, tertiary]
                                };
                            });
                        }}
                    />
                )}

            </SafeAreaView>
        </Modal>
    );
};

export default EditExercise;
