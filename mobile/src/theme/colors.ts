/**
 * FixMate Mobile Design System
 * Strict Light-First Theme: Soft neutrals, crisp cards, professional indigo, dark charcoal text.
 * No pure black (#000000) primary surfaces.
 */

export const colors = {
  background: '#f8fafc', // Very light neutral
  card: '#ffffff',       // Crisp white surface
  cardBorder: '#e2e8f0', // Soft subtle border
  primary: '#4f46e5',    // Professional indigo
  primaryLight: '#eef2ff',
  primaryDark: '#4338ca',
  text: '#0f172a',       // Dark charcoal, never harsh black
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  success: '#10b981',    // Soft green
  successLight: '#ecfdf5',
  warning: '#f59e0b',    // Soft amber
  warningLight: '#fffbeb',
  danger: '#ef4444',     // Soft red
  dangerLight: '#fef2f2',
  info: '#3b82f6',
  infoLight: '#eff6ff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const typography = {
  h1: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '600' as const, color: colors.text },
  h3: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.text },
  caption: { fontSize: 12, fontWeight: '400' as const, color: colors.textSecondary },
  tiny: { fontSize: 10, fontWeight: '500' as const, color: colors.textMuted },
};

export const touchTarget = {
  minHeight: 44, // Minimum 44x44 px touch targets for accessibility
  minWidth: 44,
};

