import { FontAwesome } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
  rightIcon,
  onRightIconPress,
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
    {rightIcon && (
      <TouchableOpacity style={styles.rightIcon} onPress={onRightIconPress} activeOpacity={0.7}>
        <FontAwesome name={rightIcon} size={16} color="#6b7280" />
      </TouchableOpacity>
    )}
  </View>
);

const AuthModal = ({ visible, onClose }) => {
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
  const [loginMethod, setLoginMethod] = useState('totp');
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
  const [recoveryStep, setRecoveryStep] = useState('request');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryPassword, setRecoveryPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTotpPassword, setShowTotpPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);

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
    setLoginMethod('totp');
    setShowRecovery(false);
    setRecoveryStep('request');
    setRecoveryEmail('');
    setRecoveryMessage('');
    setRecoveryCode('');
    setRecoveryPassword('');
    setConfirmPassword('');
    setShowTotpPassword(false);
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
    Alert.alert('Bienvenido', 'Inicio de sesión exitoso.', [{ text: 'OK', onPress: onClose }]);
  };

  const handleRegister = async () => {
    if (!fullName || !email) {
      Alert.alert('Campos faltantes', 'Completa nombre y correo.');
      return;
    }
    if (password && password !== confirmPassword) {
      Alert.alert('Contraseña no coincide', 'Repite la contraseña correctamente.');
      return;
    }
    setLoading(true);
    const result = await register({
      fullName: fullName.trim(),
      email: email.trim(),
      password: password.trim() || undefined,
      confirmPassword: confirmPassword.trim() || undefined,
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

  const handleRecoveryRequest = async () => {
    if (!recoveryEmail) {
      Alert.alert('Correo requerido', 'Ingresa tu correo para recuperar la cuenta.');
      return;
    }
    setLoading(true);
    try {
      await requestRecovery({ email: recoveryEmail.trim() });
      setRecoveryStep('confirm');
      setRecoveryMessage('Te enviamos un correo con el código de recuperación.');
    } catch (err) {
      const msg = err.response?.data?.message || 'No se pudo enviar el código';
      setRecoveryMessage(msg);
      try {
        await requestEmailValidation(recoveryEmail.trim());
        setRecoveryMessage('Necesitas verificar tu correo. Revisa tu bandeja y vuelve a intentar.');
      } catch (_e) {
        // silencioso
      }
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
      setRecoveryStep('success');
    } catch (err) {
      Alert.alert('No se pudo confirmar', err.response?.data?.message || 'Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyManualCode = async () => {
    if (!manualCode) return;
    await Clipboard.setStringAsync(manualCode);
    Alert.alert('Copiado', 'Código manual copiado.');
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
      <Text style={styles.inputLabel}>Correo Electrónico</Text>
      <InputWithIcon
        icon="envelope"
        placeholder="Correo electrónico (ej. ana@example.com)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
      {step === 'login' && (
        <>
          {loginMethod === 'password' ? (
            <>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <InputWithIcon
                icon="lock"
                placeholder="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                rightIcon={showPassword ? 'eye' : 'eye-slash'}
                onRightIconPress={() => setShowPassword(!showPassword)}
              />
            </>
          ) : (
            <>
              {showTotpPassword ? (
                <>
                  <Text style={styles.inputLabel}>Contraseña (para configurar TOTP)</Text>
                  <InputWithIcon
                    icon="lock"
                    placeholder="Contraseña"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    rightIcon={showPassword ? 'eye' : 'eye-slash'}
                    onRightIconPress={() => setShowPassword(!showPassword)}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.linkButton} onPress={() => { setShowTotpPassword(false); setPassword(''); }}>
                    <Text style={styles.linkText}>Volver a código TOTP</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>Código TOTP</Text>
                  <InputWithIcon
                    icon="key"
                    placeholder="Código TOTP de 6 dígitos"
                    value={totpCode}
                    onChangeText={setTotpCode}
                    keyboardType="number-pad"
                  />
                </>
              )}
            </>
          )}
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading || showTotpPassword}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Iniciar sesión</Text>}
          </TouchableOpacity>
          {loginMethod === 'totp' ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                if (!showTotpPassword) {
                  setShowTotpPassword(true);
                  return;
                }
                handleSetupTotp();
              }}
              disabled={loading}
            >
              <Text style={styles.secondaryText}>
                {showTotpPassword ? 'Generar código TOTP' : 'Configurar TOTP'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.linkButton} onPress={() => setShowRecovery(true)}>
            <Text style={styles.linkText}>¿Olvidaste tu cuenta?</Text>
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
      <Text style={styles.inputLabel}>Contraseña (opcional)</Text>
      <InputWithIcon
        icon="lock"
        placeholder="Crea una contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
        rightIcon={showPassword ? 'eye' : 'eye-slash'}
        onRightIconPress={() => setShowPassword(!showPassword)}
      />
      {password ? (
        <>
          <Text style={styles.inputLabel}>Confirmar contraseña</Text>
          <InputWithIcon
            icon="lock"
            placeholder="Repite la contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            rightIcon={showConfirmPassword ? 'eye' : 'eye-slash'}
            onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
          />
        </>
      ) : null}
      <View style={styles.docRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>Tipo de documento</Text>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setDocTypeOpen((prev) => !prev)}
            activeOpacity={0.9}
          >
            <Text style={identificationType ? styles.selectText : styles.selectPlaceholder}>
              {identificationType
                ? docTypeOptions.find((opt) => opt.value === identificationType)?.label
                : 'Selecciona'}
            </Text>
            <FontAwesome
              name={docTypeOpen ? 'chevron-up' : 'chevron-down'}
              size={12}
              color="#156436"
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
        <View style={{ flex: 1 }}>
          <Text style={styles.inputLabel}>Número</Text>
          <InputWithIcon
            icon="id-card"
            placeholder="Número"
            value={identificationNumber}
            onChangeText={setIdentificationNumber}
            autoCapitalize="none"
          />
        </View>
      </View>
      <Text style={styles.inputLabel}>URL del avatar (opcional)</Text>
      <InputWithIcon
        icon="image"
        placeholder="https://..."
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
      <Text style={styles.infoText}>
        Descarga Google Authenticator y agrega este código para validar tu cuenta.
      </Text>
      {qrData ? (
        <Image source={{ uri: qrData }} style={styles.qrImage} contentFit="contain" />
      ) : (
        <Text style={styles.infoText}>Generando QR...</Text>
      )}
      {manualCode ? (
        <View style={styles.manualBox}>
          <Text style={styles.manualLabel}>Código manual</Text>
          <Text style={styles.manualCode}>{manualCode}</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyManualCode}
            activeOpacity={0.9}
          >
            <FontAwesome name="copy" size={12} color="#156436" />
            <Text style={styles.copyButtonText}>Copiar código</Text>
          </TouchableOpacity>
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
      <Text style={styles.cardTitle}>Recuperar cuenta</Text>
      <Text style={styles.infoText}>
        Recibe un código en tu correo para reconfigurar la autenticación.
      </Text>
      {recoveryMessage ? <Text style={styles.statusText}>{recoveryMessage}</Text> : null}
      <Text style={styles.inputLabel}>Correo Electrónico</Text>
      <InputWithIcon
        icon="envelope"
        placeholder="Correo electrónico"
        value={recoveryEmail}
        onChangeText={setRecoveryEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => requestEmailValidation({ email: recoveryEmail.trim() })}
        disabled={loading || !recoveryEmail}
      >
        <Text style={styles.secondaryText}>Validar correo</Text>
      </TouchableOpacity>
      {recoveryStep === 'request' ? (
        <TouchableOpacity style={styles.primaryButton} onPress={handleRecoveryRequest} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Enviar código</Text>}
        </TouchableOpacity>
      ) : null}
      {recoveryStep === 'confirm' ? (
        <>
          <Text style={styles.inputLabel}>Código de recuperación</Text>
          <InputWithIcon
            icon="key"
            placeholder="Pega el token del correo"
            value={recoveryCode}
            onChangeText={setRecoveryCode}
            autoCapitalize="none"
          />
          <Text style={styles.inputLabel}>Nueva contraseña</Text>
          <InputWithIcon
            icon="lock"
            placeholder="Nueva contraseña"
            value={recoveryPassword}
            onChangeText={setRecoveryPassword}
            secureTextEntry={!showRecoveryPassword}
            rightIcon={showRecoveryPassword ? 'eye' : 'eye-slash'}
            onRightIconPress={() => setShowRecoveryPassword(!showRecoveryPassword)}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleRecoveryConfirm} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Confirmar</Text>}
          </TouchableOpacity>
        </>
      ) : null}
      {recoveryStep === 'success' ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Cuenta recuperada</Text>
          <Text style={styles.successMessage}>
            Ya puedes configurar tu autenticación nuevamente.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setShowRecovery(false);
              setRecoveryStep('request');
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
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <LinearGradient colors={['#156436', '#FED201']} style={styles.header}>
              <View style={styles.headerRow}>
                <View style={styles.headerTitleRow}>
                  <FontAwesome name="shield" size={18} color="#CCFBF1" />
                  <Text style={styles.headerTitle}>Seguridad</Text>
                </View>
                <TouchableOpacity onPress={() => { resetFlow(); onClose?.(); }}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.headerChips}>
                <View style={styles.headerChip}>
                  <FontAwesome name="map-marker" size={11} color="#FDBA74" />
                  <Text style={styles.headerChipText}>Rutas</Text>
                </View>
                <View style={styles.headerChip}>
                  <FontAwesome name="camera" size={11} color="#A7F3D0" />
                  <Text style={styles.headerChipText}>Momentos</Text>
                </View>
              </View>
              {showRecovery ? null : renderTabs()}
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
              {showRecovery ? renderRecovery() : activeTab === 'login' ? renderLogin() : renderRegister()}
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
    backgroundColor: '#F7FCFE',
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
    color: '#ffffff',
    fontSize: FONT_SIZES.lg,
  },
  closeText: {
    fontSize: 20,
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  headerChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.md,
  },
  headerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  headerChipText: {
    color: '#ECFEFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.14)',
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
    color: '#ECFEFF',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#9A3412',
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
    backgroundColor: '#156436',
    borderColor: '#156436',
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
  docRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  selectInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
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
    maxHeight: 220,
  },
  dropdownScroll: {
    maxHeight: 220,
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
    color: '#156436',
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  linkText: {
    color: '#156436',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#156436',
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
    backgroundColor: '#ECFEFF',
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: '#D9EAF0',
  },
  secondaryText: {
    color: '#156436',
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
    color: '#FE6C01',
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
  copyButton: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFEFF',
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  copyButtonText: {
    color: '#156436',
    fontWeight: '700',
  },
  successIcon: {
    fontSize: 32,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#ECFEFF',
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
  rightIcon: {
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
