import { responsiveFont } from './responsive';

export const COLORS = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  background: '#F7F7F7',
  white: '#FFFFFF',
  text: '#333333',
  textLight: '#666666',
  error: '#E74C3C',
  success: '#2ECC71',
  border: '#E0E0E0',
};

export const SPACING_STEPS = {
  base: 8,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const SPACING = {
  xs: SPACING_STEPS.xs,
  sm: SPACING_STEPS.sm,
  md: SPACING_STEPS.md,
  lg: SPACING_STEPS.lg,
  xl: SPACING_STEPS.xl,
  xxl: SPACING_STEPS.xxl,
};

export const FONT_SIZES = {
  xs: responsiveFont(12),
  sm: responsiveFont(14),
  md: responsiveFont(16),
  lg: responsiveFont(18),
  xl: responsiveFont(24),
  xxl: responsiveFont(32),
};

export const CATEGORIES = [
  { id: 1, name: 'Playa', icon: 'beach', color: '#4ECDC4' },
  { id: 2, name: 'Montaña', icon: 'mountain', color: '#95E1D3' },
  { id: 3, name: 'Ciudad', icon: 'city', color: '#F38181' },
  { id: 4, name: 'Aventura', icon: 'rocket', color: '#FFE66D' },
  { id: 5, name: 'Cultural', icon: 'library', color: '#AA96DA' },
  { id: 6, name: 'Gastronómico', icon: 'restaurant', color: '#FCBAD3' },
];

export const PLACE_SERVICES = [
  { id: 'wifi', label: 'WiFi Gratis', icon: 'wifi' },
  { id: 'parking', label: 'Parqueadero', icon: 'local-parking' },
  { id: 'rest', label: 'Restaurante', icon: 'restaurant' },
  { id: 'pet', label: 'Pet Friendly', icon: 'pets' },
  { id: 'wc', label: 'Baños Públicos', icon: 'wc' },
  { id: 'access', label: 'Accesibilidad', icon: 'accessible' },
  { id: 'guide', label: 'Guía Turístico', icon: 'person' },
  { id: 'ba', label: 'Bar / Café', icon: 'local-cafe' },
  { id: 'pool', label: 'Piscina', icon: 'pool' },
  { id: 'ac', label: 'Aire Acondicionado', icon: 'ac-unit' }
];
