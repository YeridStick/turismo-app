import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
import { Animated, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { theme } from '../../theme/theme';

export const PremiumCard = ({
    image,
    onPress,
    children,
    style,
    imageStyle,
    aspectRatio = 1,
    gradientOverlay = false,
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (!onPress) return;
        Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    const handlePressOut = () => {
        if (!onPress) return;
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
        }).start();
    };

    const CardContent = (
        <Animated.View style={[
            styles.container,
            theme.shadows.md,
            { transform: [{ scale: scaleAnim }] },
            style
        ]}>
            {image && (
                <View style={[styles.imageContainer, { aspectRatio }]}>
                    <Image
                        source={{ uri: image }}
                        style={[StyleSheet.absoluteFillObject, imageStyle]}
                        contentFit="cover"
                        transition={300}
                    />
                    {gradientOverlay && (
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.7)']}
                            style={StyleSheet.absoluteFillObject}
                            start={{ x: 0.5, y: 0.3 }}
                            end={{ x: 0.5, y: 1 }}
                        />
                    )}
                </View>
            )}
            <View style={styles.content}>
                {children}
            </View>
        </Animated.View>
    );

    if (onPress) {
        return (
            <TouchableWithoutFeedback
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                {CardContent}
            </TouchableWithoutFeedback>
        );
    }

    return CardContent;
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        overflow: 'hidden',
        marginBottom: theme.spacing.md,
    },
    imageContainer: {
        width: '100%',
        backgroundColor: theme.colors.surfaceDarker, // Placeholder color
    },
    content: {
        padding: theme.spacing.lg,
    }
});
