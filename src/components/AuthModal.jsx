import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONT_SIZES, SPACING } from '../utils/constants';

const TabButton = ({ active, label, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.tabButton, active && styles.tabButtonActive]}
    activeOpacity={0.9}
  >
    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const InputWithIcon = ({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  secureTextEntry,
  autoCapitalize = 'none',
}) => (
  <View style={styles.inputRow}>
    <View style={styles.inputIcon}>
      <FontAwesome name={icon} size={16} color="#6b7280" />
    </View>
    <TextInput
      style={styles.inputControl}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
    />
  </View>
);

const AuthModal = ({ visible, onClose }) => {
  const { login, register, setupTotp, confirmTotp, totpStatus } = useAuth();

  const [activeTab, setActiveTab] = useState('login');
  const [step, setStep] = useState('login'); // login | setup | confirm | success
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [qrData, setQrData] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');

  const resetFlow = () => {
    setStep('login');
    setQrData(null);
    setManualCode('');
    setVerifyCode('');
    setTotpCode('');
  };

  const handleLogin = async () => {
    if (!email || !totpCode) {
      Alert.alert('Completa los datos', 'Ingresa tu correo y el código TOTP.');
      return;
    }
    setLoading(true);
    const result = await login(email.trim(), totpCode.trim());
    setLoading(false);
    if (!result.success) {
      Alert.alert('No se pudo iniciar sesión', result.error || 'Intenta nuevamente.');
      return;
    }
    Alert.alert('Bienvenido', 'Inicio de sesión exitoso.', [{ text: 'OK', onPress: onClose }]);
  };

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Campos faltantes', 'Completa nombre, correo y contraseña.');
      return;
    }
    setLoading(true);
    const result = await register({
      fullName: fullName.trim(),
      email: email.trim(),
      password: password.trim(),
    });
    setLoading(false);
    if (!result.success) {
      Alert.alert('No se pudo crear la cuenta', result.error || 'Intenta nuevamente.');
      return;
    }
    Alert.alert('Cuenta creada', 'Ahora configura tu autenticación.', [
      { text: 'Configurar TOTP', onPress: () => setStep('setup') },
    ]);
    setActiveTab('login');
    setStep('setup');
  };

  const handleSetupTotp = async () => {
    if (!email) {
      Alert.alert('Correo requerido', 'Ingresa tu correo para generar el código.');
      return;
    }
    setLoading(true);
    try {
      await totpStatus(email.trim()).catch(() => null);
      const res = await setupTotp(email.trim());
      const data = res.data?.data || res.data || {};
      setQrData(data.qrImage || data.qrImageUrl || data.qr);
      setManualCode(data.secretBase32 || data.secret || '');
      setStep('setup');
    } catch (err) {
      Alert.alert('No se pudo generar el QR', err.response?.data?.message || 'Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTotp = async () => {
    if (!verifyCode || !email) {
      Alert.alert('Datos requeridos', 'Ingresa el código de 6 dígitos.');
      return;
    }
    setLoading(true);
    try {
      await confirmTotp({ email: email.trim(), code: verifyCode.trim() });
      setStep('success');
    } catch (err) {
      Alert.alert('Código inválido', err.response?.data?.message || 'Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderTabs = () => (
    <View style={styles.tabs}>
      <TabButton label="Iniciar Sesión" active={activeTab === 'login'} onPress={() => { setActiveTab('login'); resetFlow(); }} />
      <TabButton label="Crear Cuenta" active={activeTab === 'register'} onPress={() => { setActiveTab('register'); resetFlow(); }} />
    </View>
  );

  const renderLogin = () => (
    <>
      <Text style={styles.subtitle}>Usa tu correo y el código de tu autenticador.</Text>
      <Text style={styles.inputLabel}>Correo Electrónico</Text>
      <InputWithIcon
        icon="envelope"
        placeholder="Correo electrónico (ej. ana@example.com)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {step === 'login' && (
        <>
          <Text style={styles.inputLabel}>Código TOTP</Text>
          <InputWithIcon
            icon="key"
            placeholder="Código TOTP de 6 dígitos"
            value={totpCode}
            onChangeText={setTotpCode}
            keyboardType="number-pad"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Iniciar Sesión</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSetupTotp} disabled={loading}>
            <Text style={styles.secondaryText}>Configurar TOTP</Text>
          </TouchableOpacity>
        </>
      )}
      {step === 'setup' && renderSetup()}
      {step === 'confirm' && renderConfirm()}
      {step === 'success' && renderSuccess()}
    </>
  );

  const renderRegister = () => (
    <>
      <Text style={styles.subtitle}>Crea tu cuenta y activa autenticación en dos pasos.</Text>
      <Text style={styles.inputLabel}>Nombre completo</Text>
      <InputWithIcon
        icon="user"
        placeholder="Nombre completo"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
      <Text style={styles.inputLabel}>Correo Electrónico</Text>
      <InputWithIcon
        icon="envelope"
        placeholder="Correo electrónico (ej. ana@example.com)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Text style={styles.inputLabel}>Contraseña</Text>
      <InputWithIcon
        icon="lock"
        placeholder="Contraseña segura"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Crear Cuenta</Text>}
      </TouchableOpacity>
    </>
  );

  const renderSetup = () => (
    <View style={styles.card}>
      <Text style={styles.stepLabel}>Paso 1 de 2</Text>
      <Text style={styles.cardTitle}>Escanea el código QR</Text>
      {qrData ? (
        <Image source={{ uri: qrData }} style={styles.qrImage} contentFit="contain" />
      ) : (
        <Text style={styles.infoText}>Generando QR...</Text>
      )}
      {manualCode ? (
        <View style={styles.manualBox}>
          <Text style={styles.manualLabel}>Código manual</Text>
          <Text style={styles.manualCode}>{manualCode}</Text>
        </View>
      ) : null}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep('confirm')}
        disabled={loading || !qrData}
      >
        <Text style={styles.primaryText}>Ya escaneé el código</Text>
      </TouchableOpacity>
    </View>
  );

  const renderConfirm = () => (
    <View style={styles.card}>
      <Text style={styles.stepLabel}>Paso 2 de 2</Text>
      <Text style={styles.cardTitle}>Verificar Código</Text>
      <Text style={styles.infoText}>Ingresa el código de 6 dígitos de tu app de autenticación.</Text>
      <Text style={styles.inputLabel}>Código de Verificación</Text>
      <InputWithIcon
        icon="key"
        placeholder="Código de verificación (6 dígitos)"
        value={verifyCode}
        onChangeText={setVerifyCode}
        keyboardType="number-pad"
      />
      <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmTotp} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verificar Código</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.card}>
      <Text style={styles.successIcon}>✅</Text>
      <Text style={styles.cardTitle}>¡Autenticación configurada!</Text>
      <Text style={styles.infoText}>Tu cuenta está protegida con autenticación de dos factores.</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          setStep('login');
          setTotpCode('');
        }}
      >
        <Text style={styles.primaryText}>Volver al inicio de sesión</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <LinearGradient colors={['#eef0ff', '#f8f9fb']} style={styles.header}>
              <View style={styles.headerRow}>
                <View style={styles.headerTitleRow}>
                  <FontAwesome name="shield" size={18} color="#5B3CF0" />
                  <Text style={styles.headerTitle}>Seguridad</Text>
                </View>
                <TouchableOpacity onPress={() => { resetFlow(); onClose?.(); }}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>
              {renderTabs()}
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              {activeTab === 'login' ? renderLogin() : renderRegister()}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#1f2937',
    fontSize: FONT_SIZES.lg,
  },
  closeText: {
    fontSize: 20,
    color: '#4b5563',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    elevation: 2,
  },
  tabButtonText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#5B3CF0',
    fontWeight: '700',
  },
  body: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  subtitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.sm,
  },
  inputLabel: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs / 2,
    color: COLORS.textLight,
    fontWeight: '600',
    fontSize: FONT_SIZES.sm,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    fontSize: FONT_SIZES.md,
  },
  primaryButton: {
    backgroundColor: '#5B3CF0',
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONT_SIZES.md,
  },
  secondaryButton: {
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryText: {
    color: '#5B3CF0',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  stepLabel: {
    color: '#6366f1',
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '800',
    color: COLORS.text,
  },
  infoText: {
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  qrImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  manualBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  manualLabel: {
    color: COLORS.textLight,
    marginBottom: 4,
  },
  manualCode: {
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.text,
  },
  successIcon: {
    fontSize: 32,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  inputIcon: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputControl: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
});

export default AuthModal;
