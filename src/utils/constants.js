import { responsiveFont } from './responsive';

export const COLORS = {
  primary: '#0E7490',
  secondary: '#14B8A6',
  accent: '#FB923C',
  background: '#F7FCFE',
  white: '#FFFFFF',
  text: '#0F172A',
  textLight: '#64748B',
  error: '#EF4444',
  success: '#10B981',
  border: '#D9EAF0',
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
  { id: 1, name: 'Playa', icon: 'beach', color: '#14B8A6' },
  { id: 2, name: 'Montana', icon: 'mountain', color: '#22C55E' },
  { id: 3, name: 'Ciudad', icon: 'city', color: '#38BDF8' },
  { id: 4, name: 'Aventura', icon: 'rocket', color: '#FB923C' },
  { id: 5, name: 'Cultural', icon: 'library', color: '#F97316' },
  { id: 6, name: 'Gastronomico', icon: 'restaurant', color: '#F59E0B' },
];

export const PLACE_SERVICES = [
  { id: 'wifi', label: 'WiFi Gratis', icon: 'wifi' },
  { id: 'parking', label: 'Parqueadero', icon: 'local-parking' },
  { id: 'rest', label: 'Restaurante', icon: 'restaurant' },
  { id: 'pet', label: 'Pet Friendly', icon: 'pets' },
  { id: 'wc', label: 'Banos Publicos', icon: 'wc' },
  { id: 'access', label: 'Accesibilidad', icon: 'accessible' },
  { id: 'guide', label: 'Guia Turistico', icon: 'person' },
  { id: 'ba', label: 'Bar / Cafe', icon: 'local-cafe' },
  { id: 'pool', label: 'Piscina', icon: 'pool' },
  { id: 'ac', label: 'Aire Acondicionado', icon: 'ac-unit' }
];
