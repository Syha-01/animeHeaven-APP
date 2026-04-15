export const colors = {
    // Primary colors - Deep purple/violet theme
    primary: '#8B5CF6',
    primaryDark: '#7C3AED',
    primaryLight: '#A78BFA',

    // Accent colors
    accent: '#F472B6',
    accentDark: '#EC4899',
    accentLight: '#F9A8D4',

    // Background colors - Dark theme
    background: '#0F0F1A',
    backgroundSecondary: '#1A1A2E',
    backgroundTertiary: '#252542',
    card: '#1E1E32',
    cardHover: '#2A2A45',

    // Surface colors
    surface: '#16162A',
    surfaceLight: '#1F1F3A',

    // Text colors
    text: '#FFFFFF',
    textSecondary: '#A1A1B5',
    textTertiary: '#6B6B80',
    textMuted: '#4A4A5A',

    // Status colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',

    // Special
    sub: '#10B981',
    dub: '#3B82F6',
    gradient: ['#8B5CF6', '#EC4899'] as const,
    gradientDark: ['#1A1A2E', '#0F0F1A'] as const,

    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
    overlayLight: 'rgba(0, 0, 0, 0.4)',

    // Border
    border: '#2A2A45',
    borderLight: '#3A3A55',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
};

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    full: 9999,
};

export const typography = {
    // Font families - using system fonts with fallbacks
    fontFamily: {
        regular: 'System',
        medium: 'System',
        semiBold: 'System',
        bold: 'System',
    },

    // Font sizes
    fontSize: {
        xs: 10,
        sm: 12,
        md: 14,
        lg: 16,
        xl: 18,
        xxl: 22,
        xxxl: 28,
        display: 36,
    },

    // Line heights
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75,
    },
};

export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    glow: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 10,
    },
};

export const theme = {
    colors,
    spacing,
    borderRadius,
    typography,
    shadows,
};

export type Theme = typeof theme;
export default theme;
