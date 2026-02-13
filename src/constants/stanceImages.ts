/**
 * Stance type image imports - maps stance type options to assets/Equipment icons
 */
import type { ImageSourcePropType } from 'react-native';

export const StanceTypeImages: Record<string, ImageSourcePropType> = {
  'Neutral (Feet Forward)': require('../../assets/Equipment/NeutralStance.png'),
  'Toes Out (External Rotation)': require('../../assets/Equipment/ExternalRotationStance.png'),
  'Toes In (Internal Rotation)': require('../../assets/Equipment/InternalRotationStance.png'),
  'Split Stance': require('../../assets/Equipment/SplitStance.png'),
  // 'Other' uses an inline circle-outline icon in StanceTypeWidthPicker
};
