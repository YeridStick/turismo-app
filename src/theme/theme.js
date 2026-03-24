export const theme = {
    colors: {
        // Primary brand colors
        primary: '#6366f1', // Indigo 500
        primaryLight: '#818cf8',
        primaryDark: '#4f46e5',

        // Secondary brand colors
        secondary: '#ec4899', // Pink 500
        secondaryLight: '#f472b6',

        // Backgrounds
        background: '#f8fafc', // Slate 50
        surface: '#ffffff',
        surfaceDarker: '#f1f5f9',

        // Text
        text: '#0f172a', // Slate 900
        textMuted: '#64748b', // Slate 500
        textInverted: '#ffffff',

        // Status
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',

        // UI elements
        border: '#e2e8f0', // Slate 200
        divider: '#f1f5f9', // Slate 100

        // Gradients
        gradientPrimary: ['#6366f1', '#a855f7', '#ec4899'], // Indigo to Purple to Pink
        gradientOverlay: ['transparent', 'rgba(0,0,0,0.8)'],
    },

    typography: {
        fontFamily: {
            regular: 'System', // Fallback, recommend adding custom fonts later
            medium: 'System',
            bold: 'System',
        },
        sizes: {
            xs: 12,
            sm: 14,
            md: 16,
            lg: 18,
            xl: 20,
            xxl: 24,
            hero: 32,
        },
        lineHeights: {
            tight: 1.2,
            normal: 1.5,
            relaxed: 1.75,
        }
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        pill: 9999,
    },

    shadows: {
        sm: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
        },
        md: {
            shadowColor: '#64748b',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
        },
        lg: {
            shadowColor: '#64748b',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 15,
            elevation: 8,
        },
        primary: {
            shadowColor: '#6366f1',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 6,
        }
    }
};
