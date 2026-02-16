/**
 * Grip type image imports - keyed by option id (see GRIP_TYPES in data.js)
 * Supports both legacy IDs and new database IDs for backward compatibility
 */
import type { ImageSourcePropType } from 'react-native';

const gripImageMap: Record<string, ImageSourcePropType> = {
  // Legacy IDs (for backward compatibility)
  neutral: require('../../assets/Equipment/NeutralGrip.png'),
  pronated: require('../../assets/Equipment/PronatedGrip.png'),
  supinated: require('../../assets/Equipment/SupinatedGrip.png'),
  semi_pronated: require('../../assets/Equipment/SemiPronatedGrip.png'),
  semi_supinated: require('../../assets/Equipment/SemiSupinatedGrip.png'),
  '1up_1down': require('../../assets/Equipment/1u1downGrip.png'),
  rotating: require('../../assets/Equipment/Rotating.png'),
  flat_palms_up: require('../../assets/Equipment/FlatPalmsUpGrip.png'),
  other: require('../../assets/Equipment/UnselectedOrOtherGrip.png'),
  // New database IDs
  GRIP_NEUTRAL: require('../../assets/Equipment/NeutralGrip.png'),
  GRIP_PRONATED: require('../../assets/Equipment/PronatedGrip.png'),
  GRIP_SUPINATED: require('../../assets/Equipment/SupinatedGrip.png'),
  GRIP_SEMI_PRONATED: require('../../assets/Equipment/SemiPronatedGrip.png'),
  GRIP_SEMI_SUPINATED: require('../../assets/Equipment/SemiSupinatedGrip.png'),
  GRIP_ALTERNATING: require('../../assets/Equipment/1u1downGrip.png'),
  GRIP_ROTATING: require('../../assets/Equipment/Rotating.png'),
  GRIP_FLAT: require('../../assets/Equipment/FlatPalmsUpGrip.png'),
  GRIP_OTHER: require('../../assets/Equipment/UnselectedOrOtherGrip.png'),
};

export const GripImages: Record<string, ImageSourcePropType> = gripImageMap;
