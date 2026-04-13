// PlantCare Design System
// Fonte bruger system fonts for at undgå ekstern afhængighed

export const Colors = {
  forest: {
    900: '#0D2418',
    800: '#1A3A2A',
    700: '#224D38',
    600: '#2D6647',
    500: '#3A7D55',
    400: '#52A373',
    300: '#7CC49A',
    200: '#B0DEC3',
    100: '#DFF2E8',
    50:  '#F2FAF5',
  },
  earth: {
    600: '#9B4A2A',
    500: '#C4612F',
    400: '#E07A45',
    300: '#F0A070',
    200: '#F7C9A8',
    100: '#FDE8D8',
  },
  stone: {
    900: '#1C1917',
    800: '#292524',
    700: '#44403C',
    600: '#57534E',
    500: '#78716C',
    400: '#A8A29E',
    300: '#D6D3D1',
    200: '#E7E5E4',
    100: '#F5F5F4',
    50:  '#FAFAF9',
  },
  water: '#4A90C4',
  waterLight: '#D4EAFA',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  success: '#16A34A',
  successLight: '#DCFCE7',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// Bruger system fonts – virker altid uden ekstra opsætning
export const Typography = {
  serif: undefined, // falder tilbage på system font
  sans: undefined,  // falder tilbage på system font
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 30,
    '3xl': 38,
    '4xl': 48,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
};

export const Radii = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
};
