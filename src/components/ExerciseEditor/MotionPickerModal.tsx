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
import { usePrimaryMuscles, useSecondaryMuscles, useTertiaryMuscles } from '@/database/useExerciseConfig';

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

interface MotionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (primaryMotion: string, variation?: string, plane?: string) => void;
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
  const allPrimaryMuscles = usePrimaryMuscles();
  const allSecondaryMuscles = useSecondaryMuscles();
  const allTertiaryMuscles = useTertiaryMuscles();

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

  // Filter motions based on selected muscle groups
  const filteredMotions = useMemo(() => {
    if (primaryMuscles.length === 0 && secondaryMuscles.length === 0 && tertiaryMuscles.length === 0) {
      return primaryMotions;
    }

    // Convert primary muscle labels to IDs (muscle_targets uses IDs like "ARMS", not labels like "Arms")
    const primaryMuscleIds = primaryMuscles.map(label => {
      const pm = allPrimaryMuscles.find(p => p.label === label);
      return pm?.id || label; // Fallback to label if not found (shouldn't happen)
    });

    const allSelectedMuscles = [...primaryMuscleIds, ...secondaryMuscles, ...tertiaryMuscles];

    return primaryMotions.filter(motion => {
      if (!motion.muscle_targets) return false;

      // Check if any selected muscle group matches the motion's targets
      return allSelectedMuscles.some(muscleId =>
        checkMuscleInTargets(motion.muscle_targets, muscleId)
      );
    });
  }, [primaryMotions, primaryMuscles, secondaryMuscles, tertiaryMuscles, allPrimaryMuscles]);

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

  // Group filtered motions by primary muscle sections (score > 0.5). A motion can appear in multiple sections.
  const motionsByPrimarySection = useMemo(() => {
    const sections: Array<{ primaryId: string; primaryLabel: string; motions: PrimaryMotion[] }> = [];

    for (const primaryId of PRIMARY_MUSCLE_SECTION_ORDER) {
      const primaryMuscle = allPrimaryMuscles.find(pm => pm.id === primaryId);
      if (!primaryMuscle) continue;

      // Get secondary muscles that belong to this primary
      const secondaryMusclesForThisPrimary = allSecondaryMuscles.filter(sec => {
        try {
          const primaryIds = JSON.parse(sec.primary_muscle_ids || '[]') as string[];
          return primaryIds.includes(primaryId);
        } catch {
          return false;
        }
      });
      // Convert secondary muscle labels to IDs for comparison
      // secondaryMuscles prop contains labels, but we need IDs to match muscle_targets
      const selectedSecondaryIdsForThisPrimary = secondaryMusclesForThisPrimary
        .filter(sec => secondaryMuscles.includes(sec.label))
        .map(sec => sec.id);

      // Get motions for this primary section
      // Start with all primary motions that have this primary as a significant target (score > 0.7)
      let motions = primaryMotions.filter(motion => {
        const score = getPrimaryScore(motion.muscle_targets, primaryId);
        return score > 0.7;
      });

      // If secondary muscles are selected for this primary, further filter by those secondary muscles
      if (selectedSecondaryIdsForThisPrimary.length > 0) {
        motions = motions.filter(motion => {
          // Motion must target at least one of the selected secondary muscles
          return selectedSecondaryIdsForThisPrimary.some(secondaryId =>
            checkMuscleInTargets(motion.muscle_targets, secondaryId)
          );
        });
      }

      // Filter by tertiary muscles if any are selected for this primary
      // First, get which secondary muscles belong to this primary
      const secondaryIdsForThisPrimary = secondaryMusclesForThisPrimary.map(sec => sec.id);
      // Then get tertiary muscles that belong to those secondary muscles
      const tertiaryMusclesForThisPrimary = allTertiaryMuscles.filter(tert => {
        try {
          const secIds = JSON.parse(tert.secondary_muscle_ids || '[]') as string[];
          return secIds.some(secId => secondaryIdsForThisPrimary.includes(secId));
        } catch {
          return false;
        }
      });
      // Convert tertiary muscle labels to IDs for comparison
      // tertiaryMuscles prop contains labels, but we need IDs to match muscle_targets
      const selectedTertiaryIdsForThisPrimary = tertiaryMusclesForThisPrimary
        .filter(tert => tertiaryMuscles.includes(tert.label))
        .map(tert => tert.id);

      if (selectedTertiaryIdsForThisPrimary.length > 0) {
        motions = motions.filter(motion => {
          return selectedTertiaryIdsForThisPrimary.some(tertiaryId =>
            checkMuscleInTargets(motion.muscle_targets, tertiaryId)
          );
        });
      }

      if (motions.length > 0) {
        sections.push({
          primaryId,
          primaryLabel: primaryMuscle.label,
          motions,
        });
      }
    }
    return sections;
  }, [filteredMotions, allPrimaryMuscles, allSecondaryMuscles, allTertiaryMuscles, secondaryMuscles, tertiaryMuscles]);

  const sectionsToShow = useMemo(() => {
    if (selectedPrimaryGroupIds.length === 0) {
      return motionsByPrimarySection;
    }
    return motionsByPrimarySection.filter((section) =>
      selectedPrimaryGroupIds.includes(section.primaryId)
    );
  }, [motionsByPrimarySection, selectedPrimaryGroupIds]);

  // Get variations for selected primary motion
  const availableVariations = useMemo(() => {
    if (!selectedPrimary) return [];
    return primaryMotionVariations.filter(v => v.primary_motion_key === selectedPrimary);
  }, [selectedPrimary, primaryMotionVariations]);

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
    const variations = primaryMotionVariations.filter(v => v.primary_motion_key === motionId);
    if (variations.length === 0) {
      // No variations: select primary only and close
      onSelect(motionId);
      onClose();
    } else {
      // Has variations: just select primary motion, variations show inline (do not close)
      onSelect(motionId);
    }
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
    onSelect(selectedPrimary, variationId, hasPlanes ? planes[0] : undefined);
    // Only close when variation has no motion_planes
    if (!hasPlanes) {
      onClose();
    }
  };

  const handleDone = () => {
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
              {sectionsToShow.map((section, sectionIndex) => (
                <View key={section.primaryId}>
                  <Text style={[styles.sectionTitle, sectionIndex === 0 && styles.sectionTitleFirst]}>{section.primaryLabel}</Text>
                  {section.motions.flatMap((motion) => {
                    const isExpanded = expandedDescriptions.has(motion.id);
                    const shortDescription = (motion as any).short_description;
                    const hasDescription = !!shortDescription;
                    const descriptionLength = shortDescription?.length || 0;
                    const shouldTruncate = descriptionLength > 80;
                    const motionVariations = selectedPrimary === motion.id
                      ? primaryMotionVariations.filter(v => v.primary_motion_key === motion.id)
                      : [];

                    const items = [
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
                    if (motionVariations.length > 1) {
                      motionVariations.forEach(variation => {
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
                    }

                    return items;
                  })}
                </View>
              ))}
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
});

export default MotionPickerModal;
