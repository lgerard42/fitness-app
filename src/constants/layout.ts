/**
 * Layout constants for consistent spacing, sizing, and z-index values
 * across the application
 */

// Z-Index Layers
export const Z_INDEX = {
  backdrop: 85,
  dropdown: 90,
  header: 100,
  headerTop: 101,
  headerRight: 102,
  modal: 200,
  dragItem: 999,
  dragActive: 9999,
} as const;

// Padding Values
export const PADDING = {
  xs: 4,
  sm: 6,
  md: 8,
  base: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  icon: 4,
  button: {
    horizontal: 12,
    vertical: 6,
    horizontalLarge: 16,
    verticalLarge: 8,
  },
  container: {
    horizontal: 16,
    vertical: 12,
    top: 8,
    bottom: 12,
  },
} as const;

// Border Radius
export const BORDER_RADIUS = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 10,
  full: 999,
  circle: 12,
} as const;

// Spacing (Gap)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
} as const;

// Shadow Values
export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 10,
  },
} as const;
