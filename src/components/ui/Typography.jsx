import React from 'react';
import { Text } from 'react-native';
import { theme } from '../../theme/theme';

export const Typography = ({
    variant = 'body',
    color = theme.colors.text,
    align = 'left',
    weight = 'regular',
    style,
    children,
    numberOfLines
}) => {
    const getVariantStyle = () => {
        switch (variant) {
            case 'hero':
                return { fontSize: theme.typography.sizes.hero, lineHeight: theme.typography.sizes.hero * theme.typography.lineHeights.tight };
            case 'h1':
                return { fontSize: theme.typography.sizes.xxl, lineHeight: theme.typography.sizes.xxl * theme.typography.lineHeights.tight };
            case 'h2':
                return { fontSize: theme.typography.sizes.xl, lineHeight: theme.typography.sizes.xl * theme.typography.lineHeights.tight };
            case 'h3':
                return { fontSize: theme.typography.sizes.lg, lineHeight: theme.typography.sizes.lg * theme.typography.lineHeights.normal };
            case 'bodyLg':
                return { fontSize: theme.typography.sizes.md, lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.relaxed };
            case 'body':
                return { fontSize: theme.typography.sizes.sm, lineHeight: theme.typography.sizes.sm * theme.typography.lineHeights.relaxed };
            case 'caption':
                return { fontSize: theme.typography.sizes.xs, lineHeight: theme.typography.sizes.xs * theme.typography.lineHeights.normal };
            default:
                return { fontSize: theme.typography.sizes.sm };
        }
    };

    const getWeightStyle = () => {
        switch (weight) {
            case 'bold':
                return { fontWeight: '700' };
            case 'medium':
                return { fontWeight: '500' };
            case 'regular':
            default:
                return { fontWeight: '400' };
        }
    };

    return (
        <Text
            numberOfLines={numberOfLines}
            style={[
                getVariantStyle(),
                getWeightStyle(),
                { color, textAlign: align },
                style
            ]}
        >
            {children}
        </Text>
    );
};
