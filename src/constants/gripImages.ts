/**
 * Grip type image imports - filenames end with "Grip" for easy identification
 */
import type { ImageSourcePropType } from 'react-native';

export const GripImages: Record<string, ImageSourcePropType> = {
  'Neutral': require('../../assets/Equipment/NeutralGrip.png'),
  'Pronated': require('../../assets/Equipment/PronatedGrip.png'),
  'Supinated': require('../../assets/Equipment/SupinatedGrip.png'),
  'Semi-Pronated': require('../../assets/Equipment/SemiPronatedGrip.png'),
  'Semi-Supinated': require('../../assets/Equipment/SemiSupinatedGrip.png'),
  '1up/1down': require('../../assets/Equipment/1u1downGrip.png'),
  // Note: "Flat Palms" and "Other" don't have images - will show no icon
};
