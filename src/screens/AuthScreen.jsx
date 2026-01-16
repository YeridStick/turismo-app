import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
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

const AuthScreen = () => {
  const navigation = useNavigation();
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
  const [identificationType, setIdentificationType] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [urlAvatar, setUrlAvatar] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [docTypeOpen, setDocTypeOpen] = useState(false);

  const docTypeOptions = [
    { value: 'CC', label: 'Cédula de ciudadanía (CC)' },
    { value: 'TI', label: 'Tarjeta de identidad (TI)' },
    { value: 'CE', label: 'Cédula de extranjería (CE)' },
    { value: 'PA', label: 'Pasaporte (PA)' },
    { value: 'NIT', label: 'NIT' },
  ];

  const resetFlow = () => {
    setStep('login');
    setQrData(null);
    setManualCode('');
    setVerifyCode('');
    setTotpCode('');
    setStatusMessage('');
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
    Alert.alert('Bienvenido', 'Inicio de sesión exitoso.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const handleRegister = async () => {
    if (!fullName || !email) {
      Alert.alert('Campos faltantes', 'Completa nombre y correo.');
      return;
    }
    setLoading(true);
    const result = await register({
      fullName: fullName.trim(),
      email: email.trim(),
      identificationType: identificationType.trim() || undefined,
      identificationNumber: identificationNumber.trim() || undefined,
      urlAvatar: urlAvatar.trim() || undefined,
    });
    setLoading(false);
    if (!result.success) {
      Alert.alert('No se pudo crear la cuenta', result.error || 'Intenta nuevamente.');
      return;
    }
    Alert.alert('Cuenta creada', 'Ahora configura tu autenticación TOTP.', [
      { text: 'Configurar TOTP', onPress: () => handleSetupTotp() },
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
      const statusRes = await totpStatus(email.trim()).catch(() => null);
      const enabled = Boolean(statusRes?.data?.data?.enabled);
      if (enabled) {
        setStatusMessage('Tu cuenta ya tiene TOTP habilitado.');
        setStep('success');
        return;
      }
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
      <TextInput
        style={styles.input}
        placeholder="Correo Electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
      {step === 'login' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Código TOTP"
            value={totpCode}
            onChangeText={setTotpCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Tengo TOTP</Text>}
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
      <Text style={styles.subtitle}>
        Crea tu cuenta para administrar rutas y lugares. Luego podrás configurar autenticación TOTP.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Correo Electrónico"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <View style={styles.inputRow}>
        <View style={[styles.inputHalf, { zIndex: 2 }]}>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setDocTypeOpen((prev) => !prev)}
            activeOpacity={0.9}
          >
            <Text style={identificationType ? styles.selectText : styles.selectPlaceholder}>
              {identificationType
                ? docTypeOptions.find((opt) => opt.value === identificationType)?.label
                : 'Tipo de documento'}
            </Text>
            <FontAwesome
              name={docTypeOpen ? 'chevron-up' : 'chevron-down'}
              size={12}
              color="#5B3CF0"
            />
          </TouchableOpacity>
          {docTypeOpen ? (
            <View style={styles.dropdown}>
              <ScrollView
                style={styles.dropdownScroll}
                contentContainerStyle={styles.dropdownContent}
              >
                {docTypeOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setIdentificationType(opt.value);
                      setDocTypeOpen(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
        <TextInput
          style={[styles.input, styles.inputHalf]}
          placeholder="Número"
          value={identificationNumber}
          onChangeText={setIdentificationNumber}
          keyboardType="default"
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="URL del avatar (opcional)"
        value={urlAvatar}
        onChangeText={setUrlAvatar}
        autoCapitalize="none"
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
      <TextInput
        style={styles.input}
        placeholder="Código de verificación"
        value={verifyCode}
        onChangeText={setVerifyCode}
        keyboardType="number-pad"
        maxLength={6}
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
      <Text style={styles.infoText}>
        {statusMessage || 'Tu cuenta está protegida con autenticación de dos factores.'}
      </Text>
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f5f7fb' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#eef0ff', '#f8f9fb']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            <FontAwesome name="shield" size={18} color="#5B3CF0" />
            <Text style={styles.headerTitle}>Seguridad</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        {renderTabs()}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {activeTab === 'login' ? renderLogin() : renderRegister()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
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
  inputRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  inputHalf: {
    flex: 1,
  },
  selectInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  selectPlaceholder: {
    color: '#9ca3af',
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 6,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownContent: {
    paddingVertical: 6,
  },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  dropdownItemText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.md,
  },
  statusText: {
    color: '#5B3CF0',
    fontWeight: '600',
    marginBottom: SPACING.sm,
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
  headerRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // mini panel styles reused from AR aesthetic kept minimal here
  quickHint: {
    color: COLORS.textLight,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default AuthScreen;
