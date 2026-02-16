import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Check, ChevronDown } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { usePrimaryMuscles, useSecondaryMuscles } from '@/database/useExerciseConfig';

// Import tertiary muscles directly from JSON (same source as primaryMotions/primaryMotionVariations)
import tertiaryMusclesData from '@/database/tables/tertiaryMuscles.json';

interface PrimaryMotion {
  id: string;
  label: string;
  sub_label?: string;
  short_description?: string;
  muscle_targets?: Record<string, any>;
  is_active: boolean;
}

interface PrimaryMotionVariation {
  id: string;
  primary_motion_key: string;
  label: string;
  short_description?: string;
  muscle_targets?: Record<string, any>;
  motion_planes?: string[];
  is_active: boolean;
}

interface MotionPlane {
  id: string;
  label: string;
  is_active: boolean;
}

interface MuscleSelections {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  tertiaryMuscles: string[];
}

interface MotionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (primaryMotion: string, variation?: string, plane?: string, muscles?: MuscleSelections) => void;
  selectedPrimaryMotion?: string;
  selectedVariation?: string;
  selectedPlane?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  tertiaryMuscles: string[];
  primaryMotions: PrimaryMotion[];
  primaryMotionVariations: PrimaryMotionVariation[];
  motionPlanes: MotionPlane[];
}

const MotionPickerModal: React.FC<MotionPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
  selectedPrimaryMotion,
  selectedVariation,
  selectedPlane,
  primaryMuscles,
  secondaryMuscles,
  tertiaryMuscles,
  primaryMotions,
  primaryMotionVariations,
  motionPlanes,
}) => {
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(selectedPrimaryMotion || null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [showMoreSections, setShowMoreSections] = useState(false);
  const [showMoreMotions, setShowMoreMotions] = useState<Record<string, boolean>>({});
  const [showMoreVariations, setShowMoreVariations] = useState<Record<string, boolean>>({});
  const allPrimaryMuscles = usePrimaryMuscles();
  const allSecondaryMuscles = useSecondaryMuscles();
  // Use directly imported JSON data for tertiary muscles (consistent with primaryMotions/primaryMotionVariations)
  const allTertiaryMuscles = tertiaryMusclesData.filter((tm: any) => tm.is_active);

  // Update selectedPrimary when prop changes
  useEffect(() => {
    setSelectedPrimary(selectedPrimaryMotion || null);
  }, [selectedPrimaryMotion]);

  // Helper function to recursively check if a muscle is in the muscle_targets structure
  const checkMuscleInTargets = (targets: any, muscleId: string): boolean => {
    if (!targets || typeof targets !== 'object') return false;

    // Check direct key match
    if (targets[muscleId]) return true;

    // Recursively check nested objects
    for (const key in targets) {
      if (key === '_score') continue; // Skip score fields
      const value = targets[key];
      if (typeof value === 'object' && value !== null) {
        if (checkMuscleInTargets(value, muscleId)) return true;
      }
    }

    return false;
  };

  // Extract primary muscles and their scores from muscle_targets
  const getPrimaryMusclesFromTargets = (targets: any): Array<{ id: string; label: string; score: number }> => {
    if (!targets || typeof targets !== 'object') return [];

    const primaryMuscleIds = ['ARMS', 'BACK', 'CHEST', 'CORE', 'LEGS', 'SHOULDERS', 'NECK', 'FULL_BODY', 'OLYMPIC'];
    const result: Array<{ id: string; label: string; score: number }> = [];

    for (const key in targets) {
      if (primaryMuscleIds.includes(key) && targets[key] && typeof targets[key] === 'object') {
        const score = targets[key]._score || 0;
        const primaryMuscle = allPrimaryMuscles.find(pm => pm.id === key);
        if (primaryMuscle) {
          result.push({
            id: key,
            label: primaryMuscle.label,
            score: score,
          });
        }
      }
    }

    // Sort by score descending
    return result.sort((a, b) => b.score - a.score);
  };

  // Recursively collect all keys from muscle_targets
  const collectAllKeys = (obj: any): string[] => {
    const keys: string[] = [];
    if (!obj || typeof obj !== 'object') return keys;
    for (const key in obj) {
      if (key === '_score') continue;
      keys.push(key);
      keys.push(...collectAllKeys(obj[key]));
    }
    return keys;
  };

  // Extract muscle selections by matching keys against known muscle tables
  // primaryMuscles and secondaryMuscles use labels; tertiaryMuscles uses IDs
  const extractMuscleSelectionsFromTargets = (targets: any): MuscleSelections => {
    if (!targets || typeof targets !== 'object') {
      return { primaryMuscles: [], secondaryMuscles: [], tertiaryMuscles: [] };
    }

    const allKeys = collectAllKeys(targets);

    const primaryLabels = allPrimaryMuscles
      .filter(pm => allKeys.includes(pm.id))
      .map(pm => pm.label);

    const secondaryLabels = allSecondaryMuscles
      .filter(sm => allKeys.includes(sm.id))
      .map(sm => sm.label);

    // Tertiary muscles are stored as IDs in editState (not labels)
    const tertiaryIds = allTertiaryMuscles
      .filter((tm: any) => allKeys.includes(tm.id))
      .map((tm: any) => tm.id);

    return {
      primaryMuscles: primaryLabels,
      secondaryMuscles: secondaryLabels,
      tertiaryMuscles: tertiaryIds,
    };
  };

  const PRIMARY_MUSCLE_SECTION_ORDER = ['ARMS', 'BACK', 'CHEST', 'CORE', 'LEGS', 'SHOULDERS', 'NECK', 'FULL_BODY', 'OLYMPIC'];

  // When any primary muscle groups are selected, only show sections for those groups
  const selectedPrimaryGroupIds = useMemo(() => {
    if (primaryMuscles.length === 0) return [];
    return primaryMuscles
      .map((label) => allPrimaryMuscles.find((p) => p.label === label)?.id)
      .filter((id): id is string => id != null);
  }, [primaryMuscles, allPrimaryMuscles]);

  const getPrimaryScore = (targets: any, primaryId: string): number => {
    if (!targets || typeof targets !== 'object') return 0;
    const primary = targets[primaryId];
    if (!primary || typeof primary !== 'object') return 0;
    return typeof primary._score === 'number' ? primary._score : 0;
  };

  // Helper to get selected secondary IDs for a primary
  const getSelectedSecondaryIdsForPrimary = (primaryId: string) => {
    const secondaryMusclesForThisPrimary = allSecondaryMuscles.filter(sec => {
      try {
        const primaryIds = JSON.parse(sec.primary_muscle_ids || '[]') as string[];
        return primaryIds.includes(primaryId);
      } catch {
        return false;
      }
    });
    return secondaryMusclesForThisPrimary
      .filter(sec => secondaryMuscles.includes(sec.label))
      .map(sec => sec.id);
  };

  // Helper to get selected tertiary IDs for a primary
  const getSelectedTertiaryIdsForPrimary = (primaryId: string) => {
    const secondaryMusclesForThisPrimary = allSecondaryMuscles.filter(sec => {
      try {
        const primaryIds = JSON.parse(sec.primary_muscle_ids || '[]') as string[];
        return primaryIds.includes(primaryId);
      } catch {
        return false;
      }
    });
    const secondaryIdsForThisPrimary = secondaryMusclesForThisPrimary.map(sec => sec.id);
    const tertiaryMusclesForThisPrimary = allTertiaryMuscles.filter((tert: any) => {
      // secondary_muscle_ids can be an array (from JSON) or a JSON string (from database)
      let secIds: string[] = [];
      if (Array.isArray(tert.secondary_muscle_ids)) {
        secIds = tert.secondary_muscle_ids;
      } else if (typeof tert.secondary_muscle_ids === 'string') {
        try {
          secIds = JSON.parse(tert.secondary_muscle_ids || '[]');
        } catch {
          secIds = [];
        }
      }
      return secIds.some((secId: string) => secondaryIdsForThisPrimary.includes(secId));
    });
    return tertiaryMusclesForThisPrimary
      .filter(tert => tertiaryMuscles.includes(tert.label))
      .map(tert => tert.id);
  };

  // Group motions by primary muscle sections with filtered and extra (for "more" button)
  const motionsByPrimarySection = useMemo(() => {
    const sections: Array<{
      primaryId: string;
      primaryLabel: string;
      filteredMotions: PrimaryMotion[];
      extraMotions: PrimaryMotion[];
      selectedSecondaryIds: string[];
      selectedTertiaryIds: string[];
    }> = [];

    for (const primaryId of PRIMARY_MUSCLE_SECTION_ORDER) {
      const primaryMuscle = allPrimaryMuscles.find(pm => pm.id === primaryId);
      if (!primaryMuscle) continue;

      const selectedSecondaryIds = getSelectedSecondaryIdsForPrimary(primaryId);
      const selectedTertiaryIds = getSelectedTertiaryIdsForPrimary(primaryId);

      // Get all motions for this primary section (score > 0.7)
      const allMotionsForSection = primaryMotions
        .filter(motion => {
          const score = getPrimaryScore(motion.muscle_targets, primaryId);
          return score > 0.7;
        })
        // Sort by score descending
        .sort((a, b) => {
          const scoreA = getPrimaryScore(a.muscle_targets, primaryId);
          const scoreB = getPrimaryScore(b.muscle_targets, primaryId);
          return scoreB - scoreA;
        });

      let filteredMotions: PrimaryMotion[] = allMotionsForSection;
      let extraMotions: PrimaryMotion[] = [];

      // If secondary muscles are selected, filter and track extras
      if (selectedSecondaryIds.length > 0) {
        filteredMotions = allMotionsForSection.filter(motion =>
          selectedSecondaryIds.some(secondaryId =>
            checkMuscleInTargets(motion.muscle_targets, secondaryId)
          )
        );
        extraMotions = allMotionsForSection.filter(motion =>
          !selectedSecondaryIds.some(secondaryId =>
            checkMuscleInTargets(motion.muscle_targets, secondaryId)
          )
        );
      }

      // If tertiary muscles are selected, filter further
      if (selectedTertiaryIds.length > 0) {
        const previousFiltered = filteredMotions;
        filteredMotions = previousFiltered.filter(motion =>
          selectedTertiaryIds.some(tertiaryId =>
            checkMuscleInTargets(motion.muscle_targets, tertiaryId)
          )
        );
        // Add the non-tertiary-matching ones to extras (if not already in extras)
        const newExtras = previousFiltered.filter(motion =>
          !selectedTertiaryIds.some(tertiaryId =>
            checkMuscleInTargets(motion.muscle_targets, tertiaryId)
          )
        );
        extraMotions = [...newExtras, ...extraMotions];
      }

      if (filteredMotions.length > 0 || extraMotions.length > 0) {
        sections.push({
          primaryId,
          primaryLabel: primaryMuscle.label,
          filteredMotions,
          extraMotions,
          selectedSecondaryIds,
          selectedTertiaryIds,
        });
      }
    }
    return sections;
  }, [primaryMotions, allPrimaryMuscles, allSecondaryMuscles, allTertiaryMuscles, secondaryMuscles, tertiaryMuscles]);

  // Split sections into filtered (matching selected primary muscles) and extra (other sections for "more")
  const { filteredSections, extraSections } = useMemo(() => {
    if (selectedPrimaryGroupIds.length === 0) {
      return { filteredSections: motionsByPrimarySection, extraSections: [] };
    }
    const filtered = motionsByPrimarySection.filter((section) =>
      selectedPrimaryGroupIds.includes(section.primaryId)
    );
    const extra = motionsByPrimarySection.filter((section) =>
      !selectedPrimaryGroupIds.includes(section.primaryId)
    );
    return { filteredSections: filtered, extraSections: extra };
  }, [motionsByPrimarySection, selectedPrimaryGroupIds]);

  // Get filtered and extra variations for a motion
  const getVariationsForMotion = (motionId: string, sectionPrimaryId: string) => {
    const allVariations = primaryMotionVariations
      .filter(v => v.primary_motion_key === motionId)
      .sort((a, b) => {
        const scoreA = getPrimaryScore(a.muscle_targets, sectionPrimaryId);
        const scoreB = getPrimaryScore(b.muscle_targets, sectionPrimaryId);
        return scoreB - scoreA;
      });

    const selectedSecondaryIds = getSelectedSecondaryIdsForPrimary(sectionPrimaryId);
    const selectedTertiaryIds = getSelectedTertiaryIdsForPrimary(sectionPrimaryId);

    let filteredVariations = allVariations;
    let extraVariations: PrimaryMotionVariation[] = [];

    // Filter by secondary muscles if selected
    if (selectedSecondaryIds.length > 0) {
      filteredVariations = allVariations.filter(v =>
        selectedSecondaryIds.some(secId => checkMuscleInTargets(v.muscle_targets, secId))
      );
      extraVariations = allVariations.filter(v =>
        !selectedSecondaryIds.some(secId => checkMuscleInTargets(v.muscle_targets, secId))
      );
    }

    // Filter by tertiary muscles if selected
    if (selectedTertiaryIds.length > 0) {
      const previousFiltered = filteredVariations;
      filteredVariations = previousFiltered.filter(v =>
        selectedTertiaryIds.some(tertId => checkMuscleInTargets(v.muscle_targets, tertId))
      );
      const newExtras = previousFiltered.filter(v =>
        !selectedTertiaryIds.some(tertId => checkMuscleInTargets(v.muscle_targets, tertId))
      );
      extraVariations = [...newExtras, ...extraVariations];
    }

    return { filteredVariations, extraVariations };
  };

  // Get variations for selected primary motion
  const availableVariations = useMemo(() => {
    if (!selectedPrimary) return [];
    return primaryMotionVariations.filter(v => v.primary_motion_key === selectedPrimary);
  }, [selectedPrimary, primaryMotionVariations]);

  // Compute current muscles based on selection (will update when allTertiaryMuscles loads)
  const computedMuscles = useMemo((): MuscleSelections | null => {
    // If a variation is selected, use its muscles
    if (selectedPrimary && selectedVariation) {
      const variation = primaryMotionVariations.find(v => v.id === selectedVariation);
      if (variation) {
        return extractMuscleSelectionsFromTargets(variation.muscle_targets);
      }
    }
    // Otherwise use the primary motion's muscles
    if (selectedPrimary) {
      const motion = primaryMotions.find(m => m.id === selectedPrimary);
      if (motion) {
        return extractMuscleSelectionsFromTargets(motion.muscle_targets);
      }
    }
    return null;
  }, [selectedPrimary, selectedVariation, primaryMotions, primaryMotionVariations, allPrimaryMuscles, allSecondaryMuscles, allTertiaryMuscles]);

  // Auto-select if only one variation (do not auto-close)
  useEffect(() => {
    if (selectedPrimary && availableVariations.length === 1 && selectedVariation !== availableVariations[0].id) {
      const variation = availableVariations[0];
      onSelect(selectedPrimary, variation.id, variation.motion_planes?.[0]);
    }
  }, [selectedPrimary, availableVariations, selectedVariation, onSelect]);

  const handleSelectPrimary = (motionId: string) => {
    // Clicking the already-selected primary deselects it
    if (selectedPrimary === motionId) {
      setSelectedPrimary(null);
      onSelect('', '', '');
      return;
    }
    setSelectedPrimary(motionId);
    
    // Select primary motion, but never auto-close
    // User must click "Done" to apply muscles and close
    onSelect(motionId);
  };

  const handleSelectVariation = (variationId: string) => {
    if (!selectedPrimary) return;
    // Clicking the already-selected variation deselects it
    if (selectedVariation === variationId) {
      onSelect(selectedPrimary, '', '');
      return;
    }
    const variation = primaryMotionVariations.find(v => v.id === variationId);
    const planes = variation?.motion_planes;
    const hasPlanes = Array.isArray(planes) && planes.length > 0;
    
    // Select variation (with first plane if any), but never auto-close
    // User must click "Done" to apply muscles and close
    onSelect(selectedPrimary, variationId, hasPlanes ? planes[0] : undefined);
  };

  const handleDone = () => {
    // Apply muscle selections when Done is clicked (computed from current selection)
    if (computedMuscles && selectedPrimary) {
      onSelect(selectedPrimary, selectedVariation || undefined, selectedPlane || undefined, computedMuscles);
    }
    onClose();
  };

  const toggleDescription = (motionId: string, e: any) => {
    e.stopPropagation();
    setExpandedDescriptions(prev => {
      const next = new Set(prev);
      if (next.has(motionId)) {
        next.delete(motionId);
      } else {
        next.add(motionId);
      }
      return next;
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centered}
        >
          <View style={styles.modal} onStartShouldSetResponder={() => true}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Motion</Text>
              {selectedPrimaryMotion ? (
                <View style={styles.selectedRow}>
                  <Text style={styles.selectedText} numberOfLines={1}>
                    {primaryMotions.find(m => m.id === selectedPrimaryMotion)?.label || selectedPrimaryMotion}
                    {selectedVariation && ` - ${primaryMotionVariations.find(v => v.id === selectedVariation)?.label || selectedVariation}`}
                  </Text>
                </View>
              ) : null}
            </View>
            <ScrollView style={styles.column} contentContainerStyle={styles.columnContent}>
              {filteredSections.map((section, sectionIndex) => {
                const motionsToShow = showMoreMotions[section.primaryId]
                  ? [...section.filteredMotions, ...section.extraMotions]
                  : section.filteredMotions;
                const hasMoreMotions = section.extraMotions.length > 0 && !showMoreMotions[section.primaryId];

                return (
                  <View key={section.primaryId}>
                    <Text style={[styles.sectionTitle, sectionIndex === 0 && styles.sectionTitleFirst]}>{section.primaryLabel}</Text>
                    {motionsToShow.flatMap((motion) => {
                      const isExpanded = expandedDescriptions.has(motion.id);
                      const shortDescription = (motion as any).short_description;
                      const hasDescription = !!shortDescription;
                      const descriptionLength = shortDescription?.length || 0;
                      const shouldTruncate = descriptionLength > 80;

                      // Get filtered and extra variations
                      const { filteredVariations, extraVariations } = selectedPrimary === motion.id
                        ? getVariationsForMotion(motion.id, section.primaryId)
                        : { filteredVariations: [], extraVariations: [] };
                      const variationsToShow = showMoreVariations[motion.id]
                        ? [...filteredVariations, ...extraVariations]
                        : filteredVariations;
                      const hasMoreVariations = extraVariations.length > 0 && !showMoreVariations[motion.id];

                      const items: React.ReactElement[] = [
                        // Primary motion
                        <TouchableOpacity
                          key={`${section.primaryId}-${motion.id}`}
                          style={[
                            styles.option,
                            selectedPrimary === motion.id && styles.optionSelected,
                          ]}
                          onPress={() => handleSelectPrimary(motion.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.optionContent}>
                            <View style={styles.firstRow}>
                              <Text
                                style={[
                                  styles.optionText,
                                  selectedPrimary === motion.id && styles.optionTextSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {motion.label}
                              </Text>
                              {motion.muscle_targets && (
                                <View style={styles.badgesContainer}>
                                  {getPrimaryMusclesFromTargets(motion.muscle_targets).map((pm) => (
                                    <View key={pm.id} style={styles.badge}>
                                      <Text style={styles.badgeLabel}>{pm.label}</Text>
                                      <Text style={styles.badgeScore}>{pm.score.toFixed(1)}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                            {hasDescription && (
                              <View style={styles.descriptionRow}>
                                <Text
                                  style={styles.descriptionText}
                                  numberOfLines={shouldTruncate && !isExpanded ? 1 : undefined}
                                >
                                  {shortDescription}
                                </Text>
                                {shouldTruncate && (
                                  <TouchableOpacity
                                    onPress={(e) => toggleDescription(motion.id, e)}
                                    style={styles.expandButton}
                                    activeOpacity={0.7}
                                  >
                                    <ChevronDown
                                      size={14}
                                      color={COLORS.slate[500]}
                                      style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                                    />
                                  </TouchableOpacity>
                                )}
                              </View>
                            )}
                          </View>
                          {selectedPrimary === motion.id && (
                            <Check size={18} color={COLORS.blue[600]} />
                          )}
                        </TouchableOpacity>
                      ];

                      // Add variations inline if this motion is selected and has variations
                      if (selectedPrimary === motion.id && variationsToShow.length > 0) {
                        variationsToShow.forEach(variation => {
                          const varShortDesc = variation.short_description;
                          const varHasDesc = !!varShortDesc;
                          const varDescLength = varShortDesc?.length || 0;
                          const varShouldTruncate = varDescLength > 80;
                          const varIsExpanded = expandedDescriptions.has(`variation-${variation.id}`);
                          items.push(
                            <TouchableOpacity
                              key={`variation-${variation.id}`}
                              style={[
                                styles.option,
                                styles.motionVariation,
                                selectedVariation === variation.id && styles.optionSelected,
                              ]}
                              onPress={() => handleSelectVariation(variation.id)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.optionContent}>
                                <View style={styles.firstRow}>
                                  <Text
                                    style={[
                                      styles.optionText,
                                      styles.motionVariationText,
                                      selectedVariation === variation.id && styles.optionTextSelected,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {variation.label}
                                  </Text>
                                  {variation.muscle_targets && (
                                    <View style={styles.badgesContainer}>
                                      {getPrimaryMusclesFromTargets(variation.muscle_targets).map((pm) => (
                                        <View key={pm.id} style={styles.badge}>
                                          <Text style={styles.badgeLabel}>{pm.label}</Text>
                                          <Text style={styles.badgeScore}>{pm.score.toFixed(1)}</Text>
                                        </View>
                                      ))}
                                    </View>
                                  )}
                                </View>
                                {varHasDesc && (
                                  <View style={styles.descriptionRow}>
                                    <Text
                                      style={styles.descriptionText}
                                      numberOfLines={varShouldTruncate && !varIsExpanded ? 1 : undefined}
                                    >
                                      {varShortDesc}
                                    </Text>
                                    {varShouldTruncate && (
                                      <TouchableOpacity
                                        onPress={(e) => toggleDescription(`variation-${variation.id}`, e)}
                                        style={styles.expandButton}
                                        activeOpacity={0.7}
                                      >
                                        <ChevronDown
                                          size={14}
                                          color={COLORS.slate[500]}
                                          style={{ transform: [{ rotate: varIsExpanded ? '180deg' : '0deg' }] }}
                                        />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                )}
                              </View>
                              {selectedVariation === variation.id && (
                                <Check size={18} color={COLORS.blue[600]} />
                              )}
                            </TouchableOpacity>
                          );
                        });

                        // Add "More Variations" button if there are extra variations
                        if (hasMoreVariations) {
                          items.push(
                            <TouchableOpacity
                              key={`more-variations-${motion.id}`}
                              style={styles.moreButton}
                              onPress={() => setShowMoreVariations(prev => ({ ...prev, [motion.id]: true }))}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.moreButtonText}>+ {extraVariations.length} more variations</Text>
                            </TouchableOpacity>
                          );
                        }
                      }

                      return items;
                    })}

                    {/* "More Motions" button for this section */}
                    {hasMoreMotions && (
                      <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => setShowMoreMotions(prev => ({ ...prev, [section.primaryId]: true }))}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.moreButtonText}>+ {section.extraMotions.length} more motions</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              {/* "More Sections" button if there are extra sections */}
              {extraSections.length > 0 && !showMoreSections && (
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={() => setShowMoreSections(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moreButtonText}>+ {extraSections.length} more sections</Text>
                </TouchableOpacity>
              )}

              {/* Show extra sections when "more" is clicked */}
              {showMoreSections && extraSections.map((section) => {
                const motionsToShow = showMoreMotions[section.primaryId]
                  ? [...section.filteredMotions, ...section.extraMotions]
                  : section.filteredMotions.length > 0 ? section.filteredMotions : section.extraMotions;
                const hasMoreMotions = section.extraMotions.length > 0 && section.filteredMotions.length > 0 && !showMoreMotions[section.primaryId];

                return (
                  <View key={section.primaryId}>
                    <Text style={styles.sectionTitle}>{section.primaryLabel}</Text>
                    {motionsToShow.flatMap((motion) => {
                      const isExpanded = expandedDescriptions.has(motion.id);
                      const shortDescription = (motion as any).short_description;
                      const hasDescription = !!shortDescription;
                      const descriptionLength = shortDescription?.length || 0;
                      const shouldTruncate = descriptionLength > 80;

                      const { filteredVariations, extraVariations } = selectedPrimary === motion.id
                        ? getVariationsForMotion(motion.id, section.primaryId)
                        : { filteredVariations: [], extraVariations: [] };
                      const variationsToShow = showMoreVariations[motion.id]
                        ? [...filteredVariations, ...extraVariations]
                        : filteredVariations.length > 0 ? filteredVariations : extraVariations;
                      const hasMoreVariations = extraVariations.length > 0 && filteredVariations.length > 0 && !showMoreVariations[motion.id];

                      const items: React.ReactElement[] = [
                        <TouchableOpacity
                          key={`${section.primaryId}-${motion.id}`}
                          style={[
                            styles.option,
                            selectedPrimary === motion.id && styles.optionSelected,
                          ]}
                          onPress={() => handleSelectPrimary(motion.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.optionContent}>
                            <View style={styles.firstRow}>
                              <Text
                                style={[
                                  styles.optionText,
                                  selectedPrimary === motion.id && styles.optionTextSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {motion.label}
                              </Text>
                              {motion.muscle_targets && (
                                <View style={styles.badgesContainer}>
                                  {getPrimaryMusclesFromTargets(motion.muscle_targets).map((pm) => (
                                    <View key={pm.id} style={styles.badge}>
                                      <Text style={styles.badgeLabel}>{pm.label}</Text>
                                      <Text style={styles.badgeScore}>{pm.score.toFixed(1)}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                            {hasDescription && (
                              <View style={styles.descriptionRow}>
                                <Text
                                  style={styles.descriptionText}
                                  numberOfLines={shouldTruncate && !isExpanded ? 1 : undefined}
                                >
                                  {shortDescription}
                                </Text>
                                {shouldTruncate && (
                                  <TouchableOpacity
                                    onPress={(e) => toggleDescription(motion.id, e)}
                                    style={styles.expandButton}
                                    activeOpacity={0.7}
                                  >
                                    <ChevronDown
                                      size={14}
                                      color={COLORS.slate[500]}
                                      style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
                                    />
                                  </TouchableOpacity>
                                )}
                              </View>
                            )}
                          </View>
                          {selectedPrimary === motion.id && (
                            <Check size={18} color={COLORS.blue[600]} />
                          )}
                        </TouchableOpacity>
                      ];

                      if (selectedPrimary === motion.id && variationsToShow.length > 0) {
                        variationsToShow.forEach(variation => {
                          const varShortDesc = variation.short_description;
                          const varHasDesc = !!varShortDesc;
                          const varDescLength = varShortDesc?.length || 0;
                          const varShouldTruncate = varDescLength > 80;
                          const varIsExpanded = expandedDescriptions.has(`variation-${variation.id}`);
                          items.push(
                            <TouchableOpacity
                              key={`variation-${variation.id}`}
                              style={[
                                styles.option,
                                styles.motionVariation,
                                selectedVariation === variation.id && styles.optionSelected,
                              ]}
                              onPress={() => handleSelectVariation(variation.id)}
                              activeOpacity={0.7}
                            >
                              <View style={styles.optionContent}>
                                <View style={styles.firstRow}>
                                  <Text
                                    style={[
                                      styles.optionText,
                                      styles.motionVariationText,
                                      selectedVariation === variation.id && styles.optionTextSelected,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {variation.label}
                                  </Text>
                                  {variation.muscle_targets && (
                                    <View style={styles.badgesContainer}>
                                      {getPrimaryMusclesFromTargets(variation.muscle_targets).map((pm) => (
                                        <View key={pm.id} style={styles.badge}>
                                          <Text style={styles.badgeLabel}>{pm.label}</Text>
                                          <Text style={styles.badgeScore}>{pm.score.toFixed(1)}</Text>
                                        </View>
                                      ))}
                                    </View>
                                  )}
                                </View>
                                {varHasDesc && (
                                  <View style={styles.descriptionRow}>
                                    <Text
                                      style={styles.descriptionText}
                                      numberOfLines={varShouldTruncate && !varIsExpanded ? 1 : undefined}
                                    >
                                      {varShortDesc}
                                    </Text>
                                    {varShouldTruncate && (
                                      <TouchableOpacity
                                        onPress={(e) => toggleDescription(`variation-${variation.id}`, e)}
                                        style={styles.expandButton}
                                        activeOpacity={0.7}
                                      >
                                        <ChevronDown
                                          size={14}
                                          color={COLORS.slate[500]}
                                          style={{ transform: [{ rotate: varIsExpanded ? '180deg' : '0deg' }] }}
                                        />
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                )}
                              </View>
                              {selectedVariation === variation.id && (
                                <Check size={18} color={COLORS.blue[600]} />
                              )}
                            </TouchableOpacity>
                          );
                        });

                        if (hasMoreVariations) {
                          items.push(
                            <TouchableOpacity
                              key={`more-variations-${motion.id}`}
                              style={styles.moreButton}
                              onPress={() => setShowMoreVariations(prev => ({ ...prev, [motion.id]: true }))}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.moreButtonText}>+ {extraVariations.length} more variations</Text>
                            </TouchableOpacity>
                          );
                        }
                      }

                      return items;
                    })}

                    {hasMoreMotions && (
                      <TouchableOpacity
                        style={styles.moreButton}
                        onPress={() => setShowMoreMotions(prev => ({ ...prev, [section.primaryId]: true }))}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.moreButtonText}>+ {section.extraMotions.length} more motions</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
            <View style={styles.footerRow}>
              <TouchableOpacity onPress={onClose} style={styles.cancelButtonInRow}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDone} style={styles.doneButtonInRow}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  centered: {
    width: '100%',
    maxHeight: '85%',
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '100%',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: COLORS.slate[200],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[250],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.slate[900],
    marginBottom: 0,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedText: {
    fontSize: 15,
    color: COLORS.slate[800],
    fontWeight: '500',
    flex: 1,
  },
  twoColumnContainer: {
    flexDirection: 'row',
    maxHeight: 400,
  },
  column: {
    width: '100%',
    maxHeight: 400,
  },
  columnContent: {
    paddingBottom: 0,
  },
  columnDivider: {
    width: 1,
    backgroundColor: COLORS.slate[200],
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[500],
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.slate[500],
    backgroundColor: COLORS.slate[100],
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: COLORS.slate[150],
  },
  sectionTitleFirst: {
    marginTop: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  optionContent: {
    flex: 1,
    flexDirection: 'column',
  },
  firstRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    marginBottom: 0,
  },
  optionSelected: {
    backgroundColor: COLORS.blue[50],
  },
  optionText: {
    fontSize: 15,
    color: COLORS.slate[700],
    fontWeight: '700',
    marginRight: 12,
    flexShrink: 0,
  },
  optionTextSelected: {
    color: COLORS.blue[600],
    fontWeight: '600',
  },
  motionVariation: {
    paddingLeft: 32, // Indent variations to show hierarchy
  },
  motionVariationText: {
    fontSize: 14, // Slightly smaller font for variations
    fontWeight: '500', // Lighter weight for variations
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.slate[100],
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.slate[550],
    marginRight: 4,
  },
  badgeScore: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.blue[500],
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  descriptionText: {
    fontSize: 11,
    color: COLORS.slate[450],
    flex: 1,
    lineHeight: 11,
  },
  expandButton: {
    paddingLeft: 4,
    paddingTop: 2,
    flexShrink: 0,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderTopWidth: 0,
    borderTopColor: COLORS.slate[100],
    gap: 0,
  },
  cancelButtonInRow: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.slate[50],
    borderTopWidth: 1,
    borderColor: COLORS.slate[300],
    borderRadius: 0,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.slate[600],
  },
  doneButtonInRow: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.blue[600],
    borderTopWidth: 1,
    borderColor: COLORS.blue[700],
    borderRadius: 0,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  moreButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate[100],
  },
  moreButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.blue[600],
    textAlign: 'center',
  },
});

export default MotionPickerModal;
