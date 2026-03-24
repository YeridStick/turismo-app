import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { Animated, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { theme } from '../../theme/theme';
import { Typography } from './Typography';

export const PremiumButton = ({
    title,
    onPress,
    variant = 'primary', // 'primary', 'secondary', 'outline', 'ghost'
    size = 'md', // 'sm', 'md', 'lg'
    icon,
    style,
    disabled = false
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    const getPadding = () => {
        switch (size) {
            case 'sm': return { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md };
            case 'lg': return { paddingVertical: theme.spacing.lg, paddingHorizontal: theme.spacing.xl };
            case 'md':
            default: return { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg };
        }
    };

    const getContent = () => {
        const textColor = variant === 'outline' || variant === 'ghost' ? theme.colors.primary : theme.colors.textInverted;
        const textVariant = size === 'lg' ? 'h3' : size === 'sm' ? 'caption' : 'bodyLg';

        return (
            <View style={styles.contentContainer}>
                {icon && <View style={styles.iconContainer}>{icon}</View>}
                <Typography variant={textVariant} weight="bold" color={textColor}>
                    {title}
                </Typography>
            </View>
        );
    };

    const animatedStyle = {
        transform: [{ scale: scaleAnim }],
        opacity: disabled ? 0.6 : 1,
    };

    if (variant === 'primary') {
        return (
            <TouchableWithoutFeedback
                onPress={disabled ? null : onPress}
                onPressIn={disabled ? null : handlePressIn}
                onPressOut={disabled ? null : handlePressOut}
            >
                <Animated.View style={[styles.container, getPadding(), animatedStyle, theme.shadows.primary, style]}>
                    <LinearGradient
                        colors={theme.colors.gradientPrimary}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    {getContent()}
                </Animated.View>
            </TouchableWithoutFeedback>
        );
    }

    const containerStyles = [
        styles.container,
        getPadding(),
        animatedStyle,
        variant === 'secondary' && { backgroundColor: theme.colors.surface },
        variant === 'secondary' && theme.shadows.sm,
        variant === 'outline' && { borderWidth: 1, borderColor: theme.colors.border },
        style
    ];

    return (
        <TouchableWithoutFeedback
            onPress={disabled ? null : onPress}
            onPressIn={disabled ? null : handlePressIn}
            onPressOut={disabled ? null : handlePressOut}
        >
            <Animated.View style={containerStyles}>
                {getContent()}
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: theme.borderRadius.pill,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    iconContainer: {
        marginRight: theme.spacing.sm,
    }
});
