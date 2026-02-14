/**
 * Stance type image imports - keyed by option id (see STANCE_TYPES in data.js)
 */
import type { ImageSourcePropType } from 'react-native';

export const StanceTypeImages: Record<string, ImageSourcePropType> = {
  neutral_feet_forward: require('../../assets/Equipment/NeutralStance.png'),
  toes_out_external_rotation: require('../../assets/Equipment/ExternalRotationStance.png'),
  toes_in_internal_rotation: require('../../assets/Equipment/InternalRotationStance.png'),
  split_stance: require('../../assets/Equipment/SplitStance.png'),
  // other: inline circle-outline icon in StanceTypeWidthPicker
};
