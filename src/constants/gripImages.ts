/**
 * Grip type image imports - keyed by option id (see GRIP_TYPES in data.js)
 */
import type { ImageSourcePropType } from 'react-native';

export const GripImages: Record<string, ImageSourcePropType> = {
  neutral: require('../../assets/Equipment/NeutralGrip.png'),
  pronated: require('../../assets/Equipment/PronatedGrip.png'),
  supinated: require('../../assets/Equipment/SupinatedGrip.png'),
  semi_pronated: require('../../assets/Equipment/SemiPronatedGrip.png'),
  semi_supinated: require('../../assets/Equipment/SemiSupinatedGrip.png'),
  '1up_1down': require('../../assets/Equipment/1u1downGrip.png'),
  rotating: require('../../assets/Equipment/Rotating.png'),
  flat_palms_up: require('../../assets/Equipment/FlatPalmsUpGrip.png'),
  other: require('../../assets/Equipment/UnselectedOrOtherGrip.png'),
};
