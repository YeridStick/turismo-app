import { FontAwesome } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS, FONT_SIZES, SPACING } from "../utils/constants";
import { PremiumModal } from "../components/ui/PremiumModal";

const TabButton = ({ active, label, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.tabButton, active && styles.tabButtonActive]}
    activeOpacity={0.9}
  >
    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
      {label}
    </Text>
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

  const [activeTab, setActiveTab] = useState("login");
  const [loginMethod, setLoginMethod] = useState("password");
  const [step, setStep] = useState("login"); // login | setup | confirm | success
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [password, setPassword] = useState("");
  const [qrData, setQrData] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [identificationType, setIdentificationType] = useState("");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [urlAvatar, setUrlAvatar] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [docTypeOpen, setDocTypeOpen] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState("request"); // request | requested | sent | pending
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showTotpPassword, setShowTotpPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryPassword, setShowRecoveryPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [modal, setModal] = useState({
    visible: false,
    type: "error",
    title: "",
    message: "",
    onConfirm: null,
  });

  const showNotification = (message, type = "error", title = null) => {
    setModal({
      visible: true,
      type,
      title: title || (type === "error" ? "Error" : "Éxito"),
      message,
      onConfirm: null,
    });
  };

  useEffect(() => {
    if (route.params?.showRecovery) {
      setActiveTab("login");
      setShowRecovery(true);
      setRecoveryStep("request");
      setRecoveryMessage("");
    }
  }, [route.params]);

  const docTypeOptions = [
    { value: "CC", label: "Cédula de ciudadanía (CC)" },
    { value: "TI", label: "Tarjeta de identidad (TI)" },
    { value: "CE", label: "Cédula de extranjería (CE)" },
    { value: "PA", label: "Pasaporte (PA)" },
    { value: "NIT", label: "NIT" },
  ];

  const resetFlow = () => {
    setStep("login");
    setQrData(null);
    setManualCode("");
    setVerifyCode("");
    setTotpCode("");
    setPassword("");
    setStatusMessage("");
    setLoginMethod("password");
    setShowRecovery(false);
    setRecoveryStep("request");
    setRecoveryEmail("");
    setRecoveryMessage("");
    setRecoveryCode("");
    setRecoveryPassword("");
    setConfirmPassword("");
    setShowTotpPassword(false);
  };

  const handleLogin = async () => {
    setLoading(true);
    let result = null;
    if (loginMethod === "password") {
      if (!email || !password) {
        setLoading(false);
        showNotification("Ingresa tu correo y contraseña.", "error");
        return;
      }
      result = await loginWithPassword(email.trim(), password.trim());
    } else {
      if (!email || !totpCode) {
        setLoading(false);
        showNotification("Ingresa tu correo y el código TOTP.", "error");
        return;
      }
      result = await login(email.trim(), totpCode.trim());
    }
    setLoading(false);
    if (!result.success) {
      showNotification(result.error || "Intenta nuevamente.", "error");
      return;
    }
    showNotification("Inicio de sesión exitoso.", "success");
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const handleRegister = async () => {
    if (!fullName || !email) {
      showNotification("Completa nombre y correo.", "error");
      return;
    }
    if (password && password !== confirmPassword) {
      showNotification("Repite la contraseña correctamente.", "error");
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
      showNotification(result.error || "Intenta nuevamente.", "error");
      return;
    }

    showNotification("Cuenta creada. Ahora configura tu TOTP.", "success");
    setActiveTab("login");
    setStep("setup");
    handleSetupTotp();
  };

  const handleSetupTotp = async () => {
    if (!email) {
      showNotification(
        "Ingresa tu correo para generar el código.",
        "warning",
        "Correo requerido",
      );
      return;
    }
    if (!password) {
      showNotification(
        "Necesitamos tu contraseña para generar el código TOTP.",
        "warning",
        "Contraseña requerida",
      );
      return;
    }
    setLoading(true);
    try {
      const statusRes = await totpStatus(email.trim()).catch(() => null);
      const enabled = Boolean(statusRes?.data?.data?.enabled);
      if (enabled) {
        setStatusMessage("Tu cuenta ya tiene TOTP habilitado.");
        setStep("success");
        return;
      }
      const res = await setupTotp({
        email: email.trim(),
        password: password.trim(),
      });
      const data = res.data?.data || res.data || {};
      setQrData(data.qrImage || data.qrImageUrl || data.qr);
      setManualCode(data.secretBase32 || data.secret || "");
      setStep("setup");
    } catch (err) {
      if (err.response?.status === 409) {
        setStatusMessage(
          err.response?.data?.message ||
            "TOTP ya habilitado para este usuario.",
        );
        setStep("success");
      } else if (err.response?.status === 400) {
        showNotification(
          err.response?.data?.message || "Verifica tu contraseña.",
          "error",
          "Credenciales requeridas",
        );
      } else {
        showNotification(
          err.response?.data?.message || "Intenta de nuevo.",
          "error",
          "No se pudo generar el QR",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTotp = async () => {
    if (!verifyCode || !email) {
      showNotification(
        "Ingresa el código de 6 dígitos.",
        "warning",
        "Datos requeridos",
      );
      return;
    }
    setLoading(true);
    try {
      await confirmTotp({ email: email.trim(), code: verifyCode.trim() });
      setStep("success");
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Intenta nuevamente.",
        "error",
        "Código inválido",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryValidate = async (silent = false) => {
    if (!recoveryEmail) {
      showNotification(
        "Ingresa tu correo para validar y recuperar la cuenta.",
        "warning",
        "Correo requerido",
      );
      return;
    }
    setLoading(true);
    try {
      const res = await requestEmailValidation(recoveryEmail.trim());
      const payload = res.data?.data || res.data || {};
      const status = payload.status;
      const message = payload.message || "Revisa tu correo para validar.";
      setRecoveryMessage(message);
      setRecoveryStep(status === "already_verified" ? "request" : "pending");
    } catch (err) {
      if (!silent) {
        showNotification(
          err.response?.data?.message || "Intenta nuevamente.",
          "error",
          "No se pudo validar",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryRequest = async () => {
    if (!recoveryEmail) {
      showNotification(
        "Ingresa tu correo para recuperar la cuenta.",
        "warning",
        "Correo requerido",
      );
      return;
    }
    setLoading(true);
    try {
      await requestRecovery({ email: recoveryEmail.trim() });
      setRecoveryStep("requested");
      setRecoveryMessage(
        "Te enviamos un correo con el código de recuperación.",
      );
    } catch (err) {
      const msg =
        err.response?.data?.message || "No se pudo enviar la recuperación";
      setRecoveryMessage(msg);
      // Si falla (ej. correo no verificado) forzamos validación
      await handleRecoveryValidate(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryConfirm = async () => {
    if (!recoveryEmail || !recoveryCode || !recoveryPassword) {
      showNotification(
        "Ingresa el código y la nueva contraseña.",
        "warning",
        "Datos requeridos",
      );
      return;
    }
    setLoading(true);
    try {
      await confirmRecovery({
        token: recoveryCode.trim(),
        newPassword: recoveryPassword.trim(),
      });
      setRecoveryStep("sent");
      setRecoveryMessage(
        "Listo. Tu contraseña fue actualizada, inicia sesión con tu nueva clave.",
      );
    } catch (err) {
      showNotification(
        err.response?.data?.message || "Intenta nuevamente.",
        "error",
        "No se pudo confirmar",
      );
    } finally {
      setLoading(false);
    }
  };

  const renderTabs = () => (
    <View style={styles.tabs}>
      <TabButton
        label="Iniciar Sesión"
        active={activeTab === "login"}
        onPress={() => {
          setActiveTab("login");
          resetFlow();
        }}
      />
      <TabButton
        label="Crear Cuenta"
        active={activeTab === "register"}
        onPress={() => {
          setActiveTab("register");
          resetFlow();
        }}
      />
    </View>
  );

  const renderLogin = () => (
    <>
      <Text style={styles.subtitle}>Elige cómo quieres iniciar sesión.</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            loginMethod === "totp" && styles.toggleButtonActive,
          ]}
          onPress={() => setLoginMethod("totp")}
        >
          <Text
            style={[
              styles.toggleText,
              loginMethod === "totp" && styles.toggleTextActive,
            ]}
          >
            Código
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            loginMethod === "password" && styles.toggleButtonActive,
          ]}
          onPress={() => setLoginMethod("password")}
        >
          <Text
            style={[
              styles.toggleText,
              loginMethod === "password" && styles.toggleTextActive,
            ]}
          >
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
      {statusMessage ? (
        <Text style={styles.statusText}>{statusMessage}</Text>
      ) : null}
      {step === "login" && (
        <>
          {loginMethod === "password" ? (
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Contraseña"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <FontAwesome
                  name={showPassword ? "eye" : "eye-slash"}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {showTotpPassword ? (
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Contraseña (para configurar TOTP)"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <FontAwesome
                      name={showPassword ? "eye" : "eye-slash"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Código TOTP"
                  placeholderTextColor="#9ca3af"
                  value={totpCode}
                  onChangeText={setTotpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              )}
              {showTotpPassword ? (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => {
                    setShowTotpPassword(false);
                    setPassword("");
                  }}
                >
                  <Text style={styles.linkText}>Volver a código TOTP</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLogin}
            disabled={loading || showTotpPassword}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>
          {loginMethod === "totp" ? (
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
                {showTotpPassword ? "Generar código TOTP" : "Configurar TOTP"}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              setShowRecovery(true);
              setRecoveryStep("validate");
              setRecoveryMessage("");
              if (email) setRecoveryEmail(email.trim());
            }}
          >
            <Text style={styles.linkText}>¿Perdiste tu acceso?</Text>
          </TouchableOpacity>
        </>
      )}
      {step === "setup" && renderSetup()}
      {step === "confirm" && renderConfirm()}
      {step === "success" && renderSuccess()}
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
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Contraseña (opcional)"
          placeholderTextColor="#9ca3af"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <FontAwesome
            name={showPassword ? "eye" : "eye-slash"}
            size={20}
            color="#9ca3af"
          />
        </TouchableOpacity>
      </View>
      {password ? (
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirmar contraseña"
            placeholderTextColor="#9ca3af"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <FontAwesome
              name={showConfirmPassword ? "eye" : "eye-slash"}
              size={20}
              color="#9ca3af"
            />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <View style={[styles.inputHalf, { zIndex: 2 }]}>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setDocTypeOpen((prev) => !prev)}
            activeOpacity={0.9}
          >
            <Text
              style={
                identificationType
                  ? styles.selectText
                  : styles.selectPlaceholder
              }
            >
              {identificationType
                ? docTypeOptions.find((opt) => opt.value === identificationType)
                    ?.label
                : "Tipo de documento"}
            </Text>
            <FontAwesome
              name={docTypeOpen ? "chevron-up" : "chevron-down"}
              size={12}
              color="#5B3CF0"
            />
          </TouchableOpacity>
          {docTypeOpen ? (
            <View style={styles.dropdown}>
              <ScrollView
                style={styles.dropdownScroll}
                contentContainerStyle={styles.dropdownContent}
                nestedScrollEnabled={true}
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
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Crear Cuenta</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderSetup = () => (
    <View style={styles.card}>
      <Text style={styles.stepLabel}>Paso 1 de 2</Text>
      <Text style={styles.cardTitle}>Escanea el código QR</Text>
      {qrData ? (
        <Image
          source={{ uri: qrData }}
          style={styles.qrImage}
          contentFit="contain"
        />
      ) : (
        <Text style={styles.infoText}>Generando QR...</Text>
      )}
      {manualCode ? (
        <TouchableOpacity
          style={styles.manualBox}
          onPress={async () => {
            await Clipboard.setStringAsync(manualCode);
            showNotification(
              "Código manual copiado al portapapeles",
              "success",
              "Copiado",
            );
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.manualLabel}>
            Código manual (toca para copiar)
          </Text>
          <Text style={styles.manualCode}>{manualCode}</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setStep("confirm")}
        disabled={loading || !qrData}
      >
        <Text style={styles.primaryText}>Ya escaneé el código</Text>
      </TouchableOpacity>
      {password ? (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => {
            setStep("login");
            setStatusMessage(
              "Puedes seguir iniciando con tu contraseña. Activa TOTP más tarde desde seguridad.",
            );
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
      <Text style={styles.infoText}>
        Ingresa el código de 6 dígitos de tu app de autenticación.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Código de verificación"
        value={verifyCode}
        onChangeText={setVerifyCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleConfirmTotp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Verificar Código</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.card}>
      <Text style={styles.successIcon}>✅</Text>
      <Text style={styles.cardTitle}>¡Autenticación configurada!</Text>
      <Text style={styles.infoText}>
        {statusMessage ||
          "Tu cuenta está protegida con autenticación de dos factores."}
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          setStep("login");
          setTotpCode("");
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
        Primero validamos tu correo. Si ya está verificado te enviaremos el
        enlace de recuperación.
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
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Validar correo</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.secondaryButton, { marginTop: SPACING.xs }]}
        onPress={() => handleRecoveryValidate()}
        disabled={loading}
      >
        <Text style={styles.secondaryText}>Enviar validación de correo</Text>
      </TouchableOpacity>

      {recoveryMessage ? (
        <Text style={styles.statusText}>{recoveryMessage}</Text>
      ) : null}

      {recoveryStep === "pending" ? (
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

      {recoveryStep === "request" || recoveryStep === "ready" ? (
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

      {recoveryStep === "requested" ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Código de recuperación"
            placeholderTextColor="#9ca3af"
            value={recoveryCode}
            onChangeText={setRecoveryCode}
            autoCapitalize="none"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Nueva contraseña"
              placeholderTextColor="#9ca3af"
              value={recoveryPassword}
              onChangeText={setRecoveryPassword}
              secureTextEntry={!showRecoveryPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowRecoveryPassword(!showRecoveryPassword)}
            >
              <FontAwesome
                name={showRecoveryPassword ? "eye" : "eye-slash"}
                size={20}
                color="#9ca3af"
              />
            </TouchableOpacity>
          </View>
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

      {recoveryStep === "sent" ? (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>Solicitud enviada</Text>
          <Text style={styles.successMessage}>
            Te enviamos un correo con instrucciones. Luego podrás iniciar sesión
            con contraseña y reconfigurar tu TOTP.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              setShowRecovery(false);
              setRecoveryStep("validate");
              setRecoveryMessage("");
            }}
          >
            <Text style={styles.primaryText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => setShowRecovery(false)}
      >
        <Text style={styles.linkText}>Volver</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f5f7fb" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={["#1a0a3d", "#2d1b6e"]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        {showRecovery ? null : renderTabs()}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {showRecovery
          ? renderRecovery()
          : activeTab === "login"
            ? renderLogin()
            : renderRegister()}
      </ScrollView>

      <PremiumModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={
          modal.onConfirm ||
          (() => setModal((prev) => ({ ...prev, visible: false })))
        }
        onClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  // ─── ESTRUCTURA ──────────────────────────────────────────────────────────
  header: {
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: "#1a0a3d",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontWeight: "800",
    color: "#1a0a3d",
    fontSize: FONT_SIZES.lg,
    letterSpacing: -0.3,
  },
  closeText: {
    fontSize: 18,
    color: "#5B3CF0",
    fontWeight: "300",
    padding: 4,
  },
  body: {
    padding: SPACING.lg,
    paddingBottom: 48,
    gap: SPACING.md,
    backgroundColor: "#f5f3ff",
    minHeight: "100%",
  },

  // ─── TABS ────────────────────────────────────────────────────────────────
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(91, 60, 240, 0.1)",
    borderRadius: 18,
    padding: 5,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  tabButtonActive: {
    backgroundColor: "#5B3CF0",
    shadowColor: "#5B3CF0",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  tabButtonText: {
    color: "#7c6aad", // ← morado visible (no blanco)
    fontWeight: "600",
    fontSize: 14,
  },
  tabButtonTextActive: {
    color: "#ffffff", // blanco sobre el tab activo morado
    fontWeight: "800",
    fontSize: 14,
  },

  // ─── TOGGLE LOGIN METHOD ─────────────────────────────────────────────────
  toggleRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  toggleButtonActive: {
    backgroundColor: "#5B3CF0",
    borderColor: "#5B3CF0",
    shadowColor: "#5B3CF0",
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  toggleText: {
    color: "#7c6aad",
    fontWeight: "600",
    fontSize: 14,
  },
  toggleTextActive: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // ─── CARD ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: SPACING.xl,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: "#ede9fe",
    shadowColor: "#4a2fb0",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  // ─── TIPOGRAFÍA ──────────────────────────────────────────────────────────
  subtitle: {
    color: "#6b5b95",
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
    marginBottom: SPACING.sm,
    fontWeight: "500",
  },
  stepLabel: {
    color: "#a78bfa",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontSize: FONT_SIZES.xs,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg + 2,
    fontWeight: "800",
    color: "#1a0a3d",
    letterSpacing: -0.4,
  },
  infoText: {
    color: "#7c6aad",
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  statusText: {
    color: "#5B3CF0",
    fontWeight: "700",
    fontSize: 13,
    marginBottom: SPACING.sm,
  },

  // ─── INPUTS ──────────────────────────────────────────────────────────────
  input: {
    backgroundColor: "#faf9ff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: "#1a0a3d",
    shadowColor: "#4a2fb0",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#faf9ff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
    marginBottom: SPACING.md,
    shadowColor: "#4a2fb0",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: "#1a0a3d",
  },
  eyeIcon: {
    padding: 16,
  },
  inputRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  inputHalf: {
    flex: 1,
  },
  selectInput: {
    backgroundColor: "#faf9ff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  selectText: {
    color: "#1a0a3d",
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  selectPlaceholder: {
    color: "#b0a0d6",
    fontSize: FONT_SIZES.md,
    flex: 1,
  },
  dropdown: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: "#4a2fb0",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  dropdownScroll: { maxHeight: 200 },
  dropdownContent: { paddingVertical: 8 },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
  },
  dropdownItemText: {
    color: "#2d1b6e",
    fontSize: FONT_SIZES.md,
    fontWeight: "500",
  },

  // ─── BOTONES ─────────────────────────────────────────────────────────────
  primaryButton: {
    backgroundColor: "#5B3CF0",
    borderRadius: 18,
    paddingVertical: SPACING.lg,
    alignItems: "center",
    marginTop: SPACING.md,
    shadowColor: "#5B3CF0",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  primaryText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: FONT_SIZES.md + 2,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    backgroundColor: "#f3f0ff",
    borderRadius: 18,
    paddingVertical: SPACING.lg,
    alignItems: "center",
    marginTop: SPACING.md,
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
  },
  secondaryText: {
    color: "#5B3CF0",
    fontWeight: "700",
    fontSize: FONT_SIZES.md,
  },
  linkButton: {
    alignItems: "center",
    marginTop: SPACING.sm,
    paddingVertical: 4,
  },
  linkText: {
    color: "#7c5cf6",
    fontWeight: "600",
    fontSize: 14,
  },

  // ─── QR / TOTP ────────────────────────────────────────────────────────────
  qrImage: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "#faf9ff",
  },
  manualBox: {
    backgroundColor: "#f3f0ff",
    borderRadius: 14,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: "#ddd6fe",
  },
  manualLabel: {
    color: "#9b8ec4",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  manualCode: {
    fontWeight: "800",
    letterSpacing: 2,
    color: "#2d1b6e",
    fontSize: 15,
  },

  // ─── SUCCESS / INFO BOXES ─────────────────────────────────────────────────
  successIcon: {
    fontSize: 36,
    textAlign: "center",
    marginBottom: 4,
  },
  successBox: {
    backgroundColor: "#f3f0ff",
    borderRadius: 16,
    padding: SPACING.md,
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: "#ddd6fe",
  },
  successTitle: {
    color: "#1a0a3d",
    fontWeight: "800",
    fontSize: FONT_SIZES.md,
  },
  successMessage: {
    color: "#7c6aad",
    fontSize: 14,
    lineHeight: 20,
  },

  // ─── NOTIFICACIONES ───────────────────────────────────────────────────────
  topNotification: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 10,
    left: SPACING.lg,
    right: SPACING.lg,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 99,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  notifError: { backgroundColor: "#ef4444" },
  notifSuccess: { backgroundColor: "#5B3CF0" },
  notifIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  topNotificationText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },

  // ─── MISC ─────────────────────────────────────────────────────────────────
  headerRow2: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickHint: { color: "#9b8ec4", fontSize: 13 },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});

export default AuthScreen;
