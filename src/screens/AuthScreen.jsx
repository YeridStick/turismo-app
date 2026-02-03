import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
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
  const route = useRoute();
  const {
    login,
    loginWithPassword,
    register,
    setupTotp,
    confirmTotp,
    totpStatus,
    requestRecovery,
    confirmRecovery,
    requestEmailValidation,
  } = useAuth();

  const [activeTab, setActiveTab] = useState('login');
  const [loginMethod, setLoginMethod] = useState('password');
  const [step, setStep] = useState('login'); // login | setup | confirm | success
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [password, setPassword] = useState('');
  const [qrData, setQrData] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [identificationType, setIdentificationType] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [urlAvatar, setUrlAvatar] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [docTypeOpen, setDocTypeOpen] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState('request'); // request | requested | sent | pending
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');

  useEffect(() => {
    if (route.params?.showRecovery) {
      setActiveTab('login');
      setShowRecovery(true);
      setRecoveryStep('request');
      setRecoveryMessage('');
    }
  }, [route.params]);

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
    setPassword('');
    setStatusMessage('');
    setLoginMethod('password');
    setShowRecovery(false);
    setRecoveryStep('request');
    setRecoveryEmail('');
    setRecoveryMessage('');
    setRecoveryCode('');
    setRecoveryPassword('');
  };

  const handleLogin = async () => {
    setLoading(true);
    let result = null;
    if (loginMethod === 'password') {
      if (!email || !password) {
        setLoading(false);
        Alert.alert('Completa los datos', 'Ingresa tu correo y contraseña.');
        return;
      }
      result = await loginWithPassword(email.trim(), password.trim());
    } else {
      if (!email || !totpCode) {
        setLoading(false);
        Alert.alert('Completa los datos', 'Ingresa tu correo y el código TOTP.');
        return;
      }
      result = await login(email.trim(), totpCode.trim());
    }
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
      password: password.trim() || undefined,
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
    if (!password) {
      Alert.alert('Contraseña requerida', 'Necesitamos tu contraseña para generar el código TOTP.');
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
      const res = await setupTotp({ email: email.trim(), password: password.trim() });
      const data = res.data?.data || res.data || {};
      setQrData(data.qrImage || data.qrImageUrl || data.qr);
      setManualCode(data.secretBase32 || data.secret || '');
      setStep('setup');
    } catch (err) {
      if (err.response?.status === 409) {
        setStatusMessage(err.response?.data?.message || 'TOTP ya habilitado para este usuario.');
        setStep('success');
      } else if (err.response?.status === 400) {
        Alert.alert('Credenciales requeridas', err.response?.data?.message || 'Verifica tu contraseña.');
      } else {
        Alert.alert('No se pudo generar el QR', err.response?.data?.message || 'Intenta de nuevo.');
      }
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

  const handleRecoveryValidate = async (silent = false) => {
    if (!recoveryEmail) {
      Alert.alert('Correo requerido', 'Ingresa tu correo para validar y recuperar la cuenta.');
      return;
    }
    setLoading(true);
    try {
      const res = await requestEmailValidation(recoveryEmail.trim());
      const payload = res.data?.data || res.data || {};
      const status = payload.status;
      const message = payload.message || 'Revisa tu correo para validar.';
      setRecoveryMessage(message);
      setRecoveryStep(status === 'already_verified' ? 'request' : 'pending');
    } catch (err) {
      if (!silent) {
        Alert.alert('No se pudo validar', err.response?.data?.message || 'Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryRequest = async () => {
    if (!recoveryEmail) {
      Alert.alert('Correo requerido', 'Ingresa tu correo para recuperar la cuenta.');
      return;
    }
    setLoading(true);
    try {
      await requestRecovery({ email: recoveryEmail.trim() });
      setRecoveryStep('requested');
      setRecoveryMessage('Te enviamos un correo con el código de recuperación.');
    } catch (err) {
      const msg = err.response?.data?.message || 'No se pudo enviar la recuperación';
      setRecoveryMessage(msg);
      // Si falla (ej. correo no verificado) forzamos validación
      await handleRecoveryValidate(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryConfirm = async () => {
    if (!recoveryEmail || !recoveryCode || !recoveryPassword) {
      Alert.alert('Datos requeridos', 'Ingresa el código y la nueva contraseña.');
      return;
    }
    setLoading(true);
    try {
      await confirmRecovery({
        token: recoveryCode.trim(),
        newPassword: recoveryPassword.trim(),
      });
      setRecoveryStep('sent');
      setRecoveryMessage('Listo. Tu contraseña fue actualizada, inicia sesión con tu nueva clave.');
    } catch (err) {
      Alert.alert('No se pudo confirmar', err.response?.data?.message || 'Intenta nuevamente.');
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
      <Text style={styles.subtitle}>Elige cómo quieres iniciar sesión.</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleButton, loginMethod === 'totp' && styles.toggleButtonActive]}
          onPress={() => setLoginMethod('totp')}
        >
          <Text style={[styles.toggleText, loginMethod === 'totp' && styles.toggleTextActive]}>
            Código
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, loginMethod === 'password' && styles.toggleButtonActive]}
          onPress={() => setLoginMethod('password')}
        >
          <Text style={[styles.toggleText, loginMethod === 'password' && styles.toggleTextActive]}>
            Contraseña
          </Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Correo Electrónico"
        placeholderTextColor="#9ca3af"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
      {step === 'login' && (
        <>
          {loginMethod === 'password' ? (
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Código TOTP"
                placeholderTextColor="#9ca3af"
                value={totpCode}
                onChangeText={setTotpCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TextInput
                style={styles.input}
                placeholder="Contraseña (para configurar TOTP)"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </>
          )}
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Iniciar sesión</Text>}
          </TouchableOpacity>
          {loginMethod === 'totp' ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleSetupTotp} disabled={loading}>
              <Text style={styles.secondaryText}>Configurar TOTP</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              setShowRecovery(true);
              setRecoveryStep('validate');
              setRecoveryMessage('');
              if (email) setRecoveryEmail(email.trim());
            }}
          >
            <Text style={styles.linkText}>¿Perdiste tu acceso?</Text>
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
        Crea tu cuenta y elige si deseas usar contraseña o código.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Nombre completo"
        placeholderTextColor="#9ca3af"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Correo Electrónico"
        placeholderTextColor="#9ca3af"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Contraseña (opcional)"
        placeholderTextColor="#9ca3af"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
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
          placeholderTextColor="#9ca3af"
          value={identificationNumber}
          onChangeText={setIdentificationNumber}
          keyboardType="default"
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder="URL del avatar (opcional)"
        placeholderTextColor="#9ca3af"
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
        <TouchableOpacity
          style={styles.manualBox}
          onPress={async () => {
            await Clipboard.setStringAsync(manualCode);
            Alert.alert('Copiado', 'Código manual copiado al portapapeles');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.manualLabel}>Código manual (toca para copiar)</Text>
          <Text style={styles.manualCode}>{manualCode}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep('confirm')}
        disabled={loading || !qrData}
      >
        <Text style={styles.primaryText}>Ya escaneé el código</Text>
      </TouchableOpacity>
      {password ? (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => {
            setStep('login');
            setStatusMessage('Puedes seguir iniciando con tu contraseña. Activa TOTP más tarde desde seguridad.');
          }}
        >
          <Text style={styles.linkText}>Saltar por ahora</Text>
        </TouchableOpacity>
      ) : null}
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

  const renderRecovery = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Recuperar acceso</Text>
      <Text style={styles.infoText}>
        Primero validamos tu correo. Si ya está verificado te enviaremos el enlace de recuperación.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Correo Electrónico"
        placeholderTextColor="#9ca3af"
        value={recoveryEmail}
        onChangeText={setRecoveryEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleRecoveryValidate}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Validar correo</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, { marginTop: SPACING.xs }]}
        onPress={() => handleRecoveryValidate()}
        disabled={loading}
      >
        <Text style={styles.secondaryText}>Enviar validación de correo</Text>
      </TouchableOpacity>

      {recoveryMessage ? <Text style={styles.statusText}>{recoveryMessage}</Text> : null}

      {recoveryStep === 'pending' ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Correo pendiente</Text>
          <Text style={styles.successMessage}>
            Revisa tu bandeja de entrada y verifica tu correo para continuar.
          </Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => handleRecoveryValidate()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#5B3CF0" />
            ) : (
              <Text style={styles.secondaryText}>Reintentar validación</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {recoveryStep === 'request' || recoveryStep === 'ready' ? (
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleRecoveryRequest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#5B3CF0" />
          ) : (
            <Text style={styles.secondaryText}>Solicitar recuperación</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {recoveryStep === 'requested' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Código de recuperación"
            placeholderTextColor="#9ca3af"
            value={recoveryCode}
            onChangeText={setRecoveryCode}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            placeholderTextColor="#9ca3af"
            value={recoveryPassword}
            onChangeText={setRecoveryPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRecoveryConfirm}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Confirmar</Text>
            )}
          </TouchableOpacity>
        </>
      ) : null}

      {recoveryStep === 'sent' ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Solicitud enviada</Text>
          <Text style={styles.successMessage}>
            Te enviamos un correo con instrucciones. Luego podrás iniciar sesión con contraseña y reconfigurar tu TOTP.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setShowRecovery(false);
              setRecoveryStep('validate');
              setRecoveryMessage('');
            }}
          >
            <Text style={styles.primaryText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity style={styles.linkButton} onPress={() => setShowRecovery(false)}>
        <Text style={styles.linkText}>Volver</Text>
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
        {showRecovery ? null : renderTabs()}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {showRecovery ? renderRecovery() : activeTab === 'login' ? renderLogin() : renderRegister()}
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
  toggleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  toggleButtonActive: {
    backgroundColor: '#5B3CF0',
    borderColor: '#5B3CF0',
  },
  toggleText: {
    color: '#6b7280',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
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
    color: COLORS.text,
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
  linkButton: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  linkText: {
    color: '#5B3CF0',
    fontWeight: '600',
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
  successBox: {
    backgroundColor: '#eef2ff',
    borderRadius: 14,
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  successTitle: {
    color: '#1f2937',
    fontWeight: '800',
    fontSize: FONT_SIZES.md,
  },
  successMessage: {
    color: COLORS.textLight,
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
