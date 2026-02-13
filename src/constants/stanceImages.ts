/**
 * Stance type image imports - currently no images exist, but structure is ready for future additions
 */
import type { ImageSourcePropType } from 'react-native';

export const StanceTypeImages: Record<string, ImageSourcePropType> = {
  'Other': require('../../assets/Equipment/UnselectedOrOtherGrip.png'),
  // Note: Other stance type images can be added here in the future
  // Options: "Neutral (Feet Forward)", "Toes Out (External Rotation)", "Toes In (Internal Rotation)", "Split Stance", "Other"
};
