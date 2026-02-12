/**
 * Equipment image imports - filenames have been renamed to remove spaces and special characters
 * for better compatibility with React Native's Metro bundler
 */
import type { ImageSourcePropType } from 'react-native';

export const EquipmentImages: Record<string, ImageSourcePropType> = {
  'Barbell': require('../../assets/Equipment/Barbell.png'),
  'EZ Bar': require('../../assets/Equipment/EZBar.png'),
  'Trap Bar (Hex Bar)': require('../../assets/Equipment/TrapHexBar.png'),
  'Safety Squat Bar': require('../../assets/Equipment/SafetySquatBar.png'),
  'Swiss / Football Bar': require('../../assets/Equipment/SwissFootballBar.png'),
  'Cambered Bar': require('../../assets/Equipment/CamberedBar.png'),
  'Dumbbell': require('../../assets/Equipment/Dumbbell.png'),
  'Kettlebell': require('../../assets/Equipment/Kettlebell.png'),
  'Plate': require('../../assets/Equipment/Plate.png'),
  'Medicine Ball': require('../../assets/Equipment/MedicineBall.png'),
  'Sandbag': require('../../assets/Equipment/Sandbag.png'),
  'Weighted Vest': require('../../assets/Equipment/Vest.png'),
  'Bodyweight': require('../../assets/Equipment/Bodyweight.png'),
  'Band': require('../../assets/Equipment/ExerciseBand.png'),
  'Chains': require('../../assets/Equipment/Chains.png'),
  'Machine (Selectorized)': require('../../assets/Equipment/MachineSelective.png'),
  'Plate Loaded (Machine)': require('../../assets/Equipment/PlateLoadedMachine.png'),
  'Smith Machine': require('../../assets/Equipment/SmithMachine.png'),
  'Cable': require('../../assets/Equipment/CableMachine.png'),
  'TRX / Suspension Trainer': require('../../assets/Equipment/TRX.png'),
  'Rings': require('../../assets/Equipment/Rings.png'),
  'Stability Ball': require('../../assets/Equipment/StabilityBall.png'),
  'BOSU': require('../../assets/Equipment/BOSUHalfStabilityBall.png'),
  'Balance Pad': require('../../assets/Equipment/BalancePad.png'),
  'Sled / Prowler': require('../../assets/Equipment/SledProwler.png'),
  'Sliders': require('../../assets/Equipment/Sliders.png'),
  'Log': require('../../assets/Equipment/Log.png'),
  'Yoke': require('../../assets/Equipment/Yoke.png'),
  'Tire': require('../../assets/Equipment/Tire.png'),
  'Mace': require('../../assets/Equipment/Mace.png'),
  'Steel / Indian Club': require('../../assets/Equipment/IndianClub.png'),
  'Ropes': require('../../assets/Equipment/Ropes.png'),
};
