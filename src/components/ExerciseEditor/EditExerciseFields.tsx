import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import {
  CABLE_ATTACHMENTS,
  SINGLE_DOUBLE_OPTIONS,
  GRIP_TYPES_BY_ID,
  GRIP_WIDTHS_BY_ID,
} from '@/constants/data';
import { useCardioTypesAsStrings, useTrainingFocusAsStrings, usePrimaryMusclesAsStrings } from '@/database/useExerciseConfig';
import { GripImages } from '@/constants/gripImages';
import { GripWidthImages } from '@/constants/gripWidthImages';
import Chip from './Chip';
import CustomDropdown from './CustomDropdown';
import { EquipmentIcon } from './EquipmentPickerModal';
import GripTypeWidthPicker from './GripTypeWidthPicker';
import StanceTypeWidthPicker from './StanceTypeWidthPicker';
import { FIELD_LABELS, PLACEHOLDERS } from './editExerciseFieldConfig';
import styles from './EditExercise.styles';

// ----- Reusable wrappers (style in stylesheet) -----
export const FieldGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.fieldGroup}>{children}</View>
);

export const Label: React.FC<{ children: React.ReactNode; required?: boolean; style?: object }> = ({
  children,
  required,
  style,
}) => (
  <Text style={[styles.label, style]}>
    {children}
    {required && <Text style={styles.required}> *</Text>}
  </Text>
);

export const ToggleRow: React.FC<{
  label: string;
  toggleLabel: string;
  value: boolean;
  onToggle: () => void;
  labelStyle?: object;
}> = ({ label, toggleLabel, value, onToggle, labelStyle }) => (
  <View style={styles.labelToggleRow}>
    <Text style={[styles.label, { marginBottom: 0 }, labelStyle]}>
      {label}
    </Text>
    <TouchableOpacity style={styles.toggleContainer} onPress={onToggle}>
      <Text style={[styles.toggleLabel, value ? styles.textBlue : styles.textSlate]}>{toggleLabel}</Text>
      {value ? (
        <ToggleRight size={24} color={COLORS.blue[600]} />
      ) : (
        <ToggleLeft size={24} color={COLORS.slate[400]} />
      )}
    </TouchableOpacity>
  </View>
);

export const CollapsibleSection: React.FC<{
  label: string;
  expanded: boolean;
  onToggle: () => void;
  badgeText?: string;
  children: React.ReactNode;
  disabledColor?: string;
}> = ({ label, expanded, onToggle, badgeText, children, disabledColor = COLORS.slate[400] }) => {
  const isActive = expanded || !!badgeText;
  return (
    <>
      <TouchableOpacity onPress={onToggle} style={styles.collapsibleLabelToggleRow}>
        <View style={styles.rowGap}>
          <Text
            style={[styles.label, { marginBottom: 0, color: isActive ? COLORS.slate[500] : disabledColor }]}
          >
            {label}
          </Text>
          <ChevronDown
            size={16}
            color={isActive ? COLORS.blue[600] : disabledColor}
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
          />
          {badgeText != null && badgeText !== '' && (
            <Text
              style={[styles.toggleLabel, { color: isActive ? COLORS.slate[500] : disabledColor }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {badgeText}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      {expanded && <View style={{ marginBottom: 24 }}>{children}</View>}
    </>
  );
};

// ----- Single definition per input type -----
export const ExerciseNameInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => (
  <TextInput
    style={styles.input}
    placeholder={PLACEHOLDERS.exerciseName}
    placeholderTextColor={COLORS.slate[400]}
    value={value}
    onChangeText={onChange}
  />
);

export const DescriptionInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => (
  <TextInput
    style={styles.textArea}
    placeholder={PLACEHOLDERS.description}
    placeholderTextColor={COLORS.slate[400]}
    multiline
    numberOfLines={3}
    value={value}
    onChangeText={onChange}
  />
);

export const MetabolicIntensityDropdown: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => {
  const CARDIO_TYPES = useCardioTypesAsStrings();
  return (
    <CustomDropdown
      value={value}
      onChange={onChange}
      options={CARDIO_TYPES}
      placeholder={PLACEHOLDERS.metabolicIntensity}
    />
  );
};

export const TrainingFocusDropdown: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => {
  const TRAINING_FOCUS = useTrainingFocusAsStrings();
  return (
    <CustomDropdown
      value={value}
      onChange={onChange}
      options={TRAINING_FOCUS}
      placeholder={PLACEHOLDERS.trainingFocus}
    />
  );
};

export const CableAttachmentsField: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => (
  <FieldGroup>
    <Label>{FIELD_LABELS.cableAttachments}</Label>
    <CustomDropdown
      value={value}
      onChange={onChange}
      options={CABLE_ATTACHMENTS}
      placeholder={PLACEHOLDERS.cableAttachment}
    />
  </FieldGroup>
);

export const AssistedNegativeRow: React.FC<{
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ value, onChange }) => (
  <FieldGroup>
    <View style={styles.labelToggleRow}>
      <Label style={{ marginBottom: 0, color: value ? COLORS.slate[500] : COLORS.slate[400] }}>
        {FIELD_LABELS.assistedNegative}
      </Label>
      <TouchableOpacity style={styles.toggleContainer} onPress={() => onChange(!value)}>
        <Text style={[styles.toggleLabel, value ? styles.textBlue : styles.textSlate]}>
          {FIELD_LABELS.on}
        </Text>
        {value ? (
          <ToggleRight size={24} color={COLORS.blue[600]} />
        ) : (
          <ToggleLeft size={24} color={COLORS.slate[400]} />
        )}
      </TouchableOpacity>
    </View>
  </FieldGroup>
);

export type GripStanceOptions = {
  gripTypeOptions: string[] | null;
  gripWidthOptions: string[] | null;
  stanceTypeOptions: string[] | null;
  stanceWidthOptions: string[] | null;
};

export const EquipmentBlock: React.FC<{
  variant: 'lifts' | 'cardioTraining';
  weightEquipTags: string[];
  showSecondEquip: boolean;
  onToggleSecondEquip: () => void;
  onEquipPress: (slot: 0 | 1) => void;
  gripType: string;
  gripWidth: string;
  stanceType: string;
  stanceWidth: string;
  singleDouble: string;
  onGripTypeChange: (v: string) => void;
  onGripWidthChange: (v: string) => void;
  onStanceTypeChange: (v: string) => void;
  onStanceWidthChange: (v: string) => void;
  onSingleDoubleChange: (option: string) => void;
  getGripStanceOptions: () => GripStanceOptions;
  showSingleDouble: boolean;
}> = (props) => {
  const {
    variant,
    weightEquipTags,
    showSecondEquip,
    onToggleSecondEquip,
    onEquipPress,
    gripType,
    gripWidth,
    stanceType,
    stanceWidth,
    singleDouble,
    onGripTypeChange,
    onGripWidthChange,
    onStanceTypeChange,
    onStanceWidthChange,
    onSingleDoubleChange,
    getGripStanceOptions,
    showSingleDouble,
  } = props;
  const opts = getGripStanceOptions();

  const renderEquipmentCircles = () => (
    <>
      <View style={styles.circleButtonWrapper}>
        <TouchableOpacity
          style={styles.equipmentCircleButton}
          onPress={() => onEquipPress(0)}
          activeOpacity={0.7}
        >
          <View style={[styles.circleButton, weightEquipTags[0] && styles.circleButtonSelected]}>
            <EquipmentIcon equipment={weightEquipTags[0] || ''} size={44} noMargin />
          </View>
          <Text
            style={[
              styles.circleLabel,
              weightEquipTags[0] ? styles.textSelected : styles.textPlaceholder,
            ]}
            numberOfLines={1}
          >
            {weightEquipTags[0] || PLACEHOLDERS.equipment}
          </Text>
        </TouchableOpacity>
      </View>
      {showSecondEquip && (
        <View style={styles.circleButtonWrapper}>
          <TouchableOpacity
            style={styles.equipmentCircleButton}
            onPress={() => onEquipPress(1)}
            activeOpacity={0.7}
          >
            <View style={[styles.circleButton, weightEquipTags[1] && styles.circleButtonSelected]}>
              <EquipmentIcon equipment={weightEquipTags[1] || ''} size={44} noMargin />
            </View>
            <Text
              style={[
                styles.circleLabel,
                weightEquipTags[1] ? styles.textSelected : styles.textPlaceholder,
              ]}
              numberOfLines={1}
            >
              {weightEquipTags[1] || PLACEHOLDERS.equipment}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderGripStance = () => {
    if (variant === 'lifts') {
      const hasGrip = opts.gripTypeOptions?.length || opts.gripWidthOptions?.length;
      const hasStance = opts.stanceTypeOptions?.length || opts.stanceWidthOptions?.length;
      return (
        <>
          {hasGrip ? (
            <View style={styles.circleButtonWrapper}>
              <GripTypeWidthPicker
                gripType={gripType}
                gripWidth={gripWidth}
                onGripTypeChange={onGripTypeChange}
                onGripWidthChange={onGripWidthChange}
                gripTypeOptions={opts.gripTypeOptions || []}
                gripWidthOptions={opts.gripWidthOptions || []}
                allowClear
              />
            </View>
          ) : null}
          {hasStance ? (
            <View style={styles.circleButtonWrapper}>
              <StanceTypeWidthPicker
                stanceType={stanceType}
                stanceWidth={stanceWidth}
                onStanceTypeChange={onStanceTypeChange}
                onStanceWidthChange={onStanceWidthChange}
                stanceTypeOptions={opts.stanceTypeOptions || []}
                stanceWidthOptions={opts.stanceWidthOptions || []}
              />
            </View>
          ) : null}
        </>
      );
    }
    // cardiotraining: Single/Double + Grip Type dropdown + Grip Width dropdown
    return (
      <>
        {showSingleDouble && (
          <View style={styles.singleDoubleToggleWrapper}>
            <View style={styles.categoryContainer}>
              {SINGLE_DOUBLE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => onSingleDoubleChange(opt.id)}
                  style={[
                    styles.categoryButton,
                    singleDouble === opt.id ? styles.categoryButtonSelected : styles.categoryButtonUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      singleDouble === opt.id ? styles.categoryTextSelected : styles.categoryTextUnselected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        {opts.gripTypeOptions?.length ? (
          <View style={styles.circleButtonWrapper}>
            <CustomDropdown
              value={gripType}
              onChange={onGripTypeChange}
              options={opts.gripTypeOptions.map((id) => ({
                id,
                label: GRIP_TYPES_BY_ID[id]?.label ?? id,
              }))}
              placeholder={PLACEHOLDERS.gripType}
              allowClear
              optionIcons={GripImages}
            />
          </View>
        ) : null}
        {opts.gripWidthOptions?.length ? (
          <View style={styles.circleButtonWrapper}>
            <CustomDropdown
              value={gripWidth}
              onChange={onGripWidthChange}
              options={opts.gripWidthOptions.map((id) => ({
                id,
                label: GRIP_WIDTHS_BY_ID[id]?.label ?? id,
              }))}
              placeholder={PLACEHOLDERS.gripWidth}
              allowClear
              optionIcons={GripWidthImages}
            />
          </View>
        ) : null}
      </>
    );
  };

  return (
    <>
      <View style={styles.equipmentGripRow}>
        {renderEquipmentCircles()}
        {renderGripStance()}
      </View>
      <View style={styles.add2ndToggleRow}>
        <TouchableOpacity style={styles.toggleContainer} onPress={onToggleSecondEquip}>
          <Text style={[styles.toggleLabel, showSecondEquip ? styles.textBlue : styles.textSlate]}>
            {FIELD_LABELS.add2nd}
          </Text>
          {showSecondEquip ? (
            <ToggleRight size={24} color={COLORS.blue[600]} />
          ) : (
            <ToggleLeft size={24} color={COLORS.slate[300]} />
          )}
        </TouchableOpacity>
      </View>
    </>
  );
};

// Primary muscle chips (shared by Lifts and Training)
export const PrimaryMuscleChips: React.FC<{
  primaryMuscles: string[];
  secondaryMusclesEnabled: boolean;
  onSecondaryToggle: () => void;
  onMuscleToggle: (muscle: string) => void;
  onMakePrimary: (muscle: string) => void;
  required?: boolean;
}> = ({
  primaryMuscles,
  secondaryMusclesEnabled,
  onSecondaryToggle,
  onMuscleToggle,
  onMakePrimary,
  required,
}) => {
  const PRIMARY_MUSCLES = usePrimaryMusclesAsStrings();
  return (
  <FieldGroup>
    <View style={styles.labelToggleRow}>
      <Label required={required} style={{ marginBottom: 0 }}>
        {FIELD_LABELS.primaryMuscleGroups}
      </Label>
      <TouchableOpacity style={styles.toggleContainer} onPress={onSecondaryToggle}>
        <Text style={[styles.toggleLabel, secondaryMusclesEnabled ? styles.textBlue : styles.textSlate]}>
          {FIELD_LABELS.secondary}
        </Text>
        {secondaryMusclesEnabled ? (
          <ToggleRight size={24} color={COLORS.blue[600]} />
        ) : (
          <ToggleLeft size={24} color={COLORS.slate[300]} />
        )}
      </TouchableOpacity>
    </View>
    <View style={styles.chipsContainer}>
      {PRIMARY_MUSCLES.map((m) => (
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
  </FieldGroup>
  );
};

