import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { PremiumButton } from './PremiumButton';

const { width, height } = Dimensions.get('window');

/**
 * PremiumModal - A high-end feedback component
 * @param {boolean} visible 
 * @param {string} type - 'success' | 'error' | 'warning' | 'info'
 * @param {string} title 
 * @param {string} message 
 * @param {function} onClose 
 * @param {string} confirmText 
 * @param {function} onConfirm 
 */
export const PremiumModal = ({
  visible,
  type = 'success',
  title,
  message,
  onClose,
  confirmText = 'Entendido',
  onConfirm,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <MaterialIcons name="error-outline" size={50} color={theme.colors.error} />;
      case 'warning':
        return <Ionicons name="warning-outline" size={50} color={theme.colors.warning} />;
      case 'info':
        return <Ionicons name="information-circle-outline" size={50} color={theme.colors.info} />;
      case 'success':
      default:
        return <MaterialIcons name="check-circle-outline" size={50} color={theme.colors.success} />;
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case 'error': return 'rgba(239, 68, 68, 0.1)';
      case 'warning': return 'rgba(245, 158, 11, 0.1)';
      case 'info': return 'rgba(59, 130, 246, 0.1)';
      default: return 'rgba(16, 185, 129, 0.1)';
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.iconWrapper, { backgroundColor: getHeaderColor() }]}>
            {getIcon()}
          </View>

          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          <View style={styles.actions}>
            <PremiumButton
              title={confirmText}
              onPress={onConfirm || onClose}
              style={{ width: '100%' }}
              size="md"
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  card: {
    width: Math.min(width * 0.85, 340),
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  iconWrapper: {
    width: '100%',
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    padding: 24,
    paddingTop: 0,
  },
});
