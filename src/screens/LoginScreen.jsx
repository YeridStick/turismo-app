import { FontAwesome } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';
import AuthAnimatedBackground from '../components/ui/AuthAnimatedBackground';
import { PremiumModal } from '../components/ui/PremiumModal';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, type: 'error', title: '', message: '' });
  const navigation = useNavigation();
  const { login, loginWithPassword } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    let result = null;
    if (loginMethod === 'password') {
      if (!email || !password) {
        setLoading(false);
        setModal({
          visible: true,
          type: 'warning',
          title: 'Datos requeridos',
          message: 'Por favor ingresa tu correo y contraseña para continuar.'
        });
        return;
      }
      result = await loginWithPassword(email.trim(), password.trim());
    } else {
      if (!email || !totpCode) {
        setLoading(false);
        setModal({
          visible: true,
          type: 'warning',
          title: 'Datos de seguridad',
          message: 'Por favor ingresa tu correo y el código TOTP de 6 dígitos.'
        });
        return;
      }
      result = await login(email.trim(), totpCode.trim());
    }
    setLoading(false);

    if (!result.success) {
      setModal({
        visible: true,
        type: 'error',
        title: 'Error de acceso',
        message: result.error || 'Verifica tus credenciales e intenta de nuevo.'
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <AuthAnimatedBackground />
      <View style={styles.content}>
        <View style={styles.panel}>
          <LinearGradient
            colors={['#156436', '#FED201']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <Text style={styles.heroKicker}>TurApp</Text>
            <Text style={styles.heroTitle}>Tu proximo destino empieza aqui</Text>
            <View style={styles.heroTags}>
              <View style={styles.heroTag}>
                <FontAwesome name="map-marker" size={11} color="#FED201" />
                <Text style={styles.heroTagText}>Rutas</Text>
              </View>
              <View style={styles.heroTag}>
                <FontAwesome name="camera" size={11} color="#FFFFFF" />
                <Text style={styles.heroTagText}>Postales</Text>
              </View>
            </View>
          </LinearGradient>
          <Text style={styles.title}>Bienvenido</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar</Text>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleButton, loginMethod === 'totp' && styles.toggleButtonActive]}
              onPress={() => setLoginMethod('totp')}
              disabled={loading}
            >
              <Text style={[styles.toggleText, loginMethod === 'totp' && styles.toggleTextActive]}>
                Código
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, loginMethod === 'password' && styles.toggleButtonActive]}
              onPress={() => setLoginMethod('password')}
              disabled={loading}
            >
              <Text style={[styles.toggleText, loginMethod === 'password' && styles.toggleTextActive]}>
                Contraseña
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#94A3B8"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          {loginMethod === 'password' ? (
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Contraseña"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <FontAwesome name={showPassword ? "eye" : "eye-slash"} size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          ) : (
            <TextInput
              style={styles.input}
              placeholder="Código TOTP"
              placeholderTextColor="#94A3B8"
              value={totpCode}
              onChangeText={setTotpCode}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
            />
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <View style={styles.linksRow}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Auth', { showRecovery: true })}
              disabled={loading}
            >
              <Text style={styles.linkText}>¿Perdiste tu acceso?</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Auth')}
              disabled={loading}
            >
              <Text style={styles.linkText}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <PremiumModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal(prev => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  panel: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(14, 116, 144, 0.14)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: SPACING.lg,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 9,
  },
  heroCard: {
    borderRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#156436',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroKicker: {
    color: '#CCFBF1',
    textTransform: 'uppercase',
    fontSize: FONT_SIZES.xs,
    letterSpacing: 1.1,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xl,
    fontWeight: '900',
    lineHeight: 30,
    marginBottom: SPACING.sm,
  },
  heroTags: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroTagText: {
    color: '#ECFEFF',
    fontWeight: '700',
    fontSize: FONT_SIZES.xs,
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.lg,
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9EAF0',
    borderRadius: 18,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    shadowColor: '#156436',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9EAF0',
    borderRadius: 18,
    marginBottom: SPACING.md,
    shadowColor: '#156436',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  passwordInput: {
    flex: 1,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
  },
  eyeIcon: {
    padding: SPACING.md,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 18,
    alignItems: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    padding: 5,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  toggleButton: {
    flex: 1,
    minHeight: 42,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    borderWidth: 0,
    borderColor: 'transparent',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  toggleText: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: COLORS.white,
    fontWeight: '700',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  linkText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  linksRow: {
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
