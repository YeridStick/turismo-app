import { FontAwesome } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AuthAnimatedBackground from "../components/ui/AuthAnimatedBackground";
import { PremiumModal } from "../components/ui/PremiumModal";
import { useAuth } from "../context/AuthContext";
import { FONT_SIZES, SPACING } from "../utils/constants";

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
  const [step, setStep] = useState("login");
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
  const [recoveryStep, setRecoveryStep] = useState("request");
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
    setDocTypeOpen(false);
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

    showNotification(
      "Cuenta creada. Ahora configura tu TOTP.",
      "success",
    );

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
      await confirmTotp({
        email: email.trim(),
        code: verifyCode.trim(),
      });

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
      const message =
        payload.message || "Revisa tu correo para validar.";

      setRecoveryMessage(message);
      setRecoveryStep(
        status === "already_verified" ? "request" : "pending",
      );
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
      await requestRecovery({
        email: recoveryEmail.trim(),
      });

      setRecoveryStep("requested");
      setRecoveryMessage(
        "Te enviamos un correo con el código de recuperación.",
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "No se pudo enviar la recuperación";

      setRecoveryMessage(msg);
      await handleRecoveryValidate(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRecoveryConfirm = async () => {
    if (
      !recoveryEmail ||
      !recoveryCode ||
      !recoveryPassword
    ) {
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
      <TouchableOpacity
        style={styles.closeButton}
        activeOpacity={0.8}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <TabButton
        label="Iniciar sesión"
        active={activeTab === "login"}
        onPress={() => {
          setActiveTab("login");
          resetFlow();
        }}
      />

      <TabButton
        label="Crear cuenta"
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
      <Text style={styles.subtitle}>
        Elige cómo quieres iniciar sesión.
      </Text>

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            loginMethod === "totp" &&
              styles.toggleButtonActive,
          ]}
          onPress={() => setLoginMethod("totp")}
        >
          <Text
            style={[
              styles.toggleText,
              loginMethod === "totp" &&
                styles.toggleTextActive,
            ]}
          >
            Código
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            loginMethod === "password" &&
              styles.toggleButtonActive,
          ]}
          onPress={() => setLoginMethod("password")}
        >
          <Text
            style={[
              styles.toggleText,
              loginMethod === "password" &&
                styles.toggleTextActive,
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
        <Text style={styles.statusText}>
          {statusMessage}
        </Text>
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
                onPress={() =>
                  setShowPassword(!showPassword)
                }
              >
                <FontAwesome
                  name={
                    showPassword
                      ? "eye"
                      : "eye-slash"
                  }
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
                    onPress={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    <FontAwesome
                      name={
                        showPassword
                          ? "eye"
                          : "eye-slash"
                      }
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
                  <Text style={styles.linkText}>
                    Volver a código TOTP
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLogin}
            disabled={
              loading || showTotpPassword
            }
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>
                Iniciar sesión
              </Text>
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
                {showTotpPassword
                  ? "Generar código TOTP"
                  : "Configurar TOTP"}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              setShowRecovery(true);
              setRecoveryStep("validate");
              setRecoveryMessage("");

              if (email) {
                setRecoveryEmail(email.trim());
              }
            }}
          >
            <Text style={styles.linkText}>
              ¿Perdiste tu acceso?
            </Text>
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
        Crea tu cuenta y elige si deseas usar
        contraseña o código.
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
          onPress={() =>
            setShowPassword(!showPassword)
          }
        >
          <FontAwesome
            name={
              showPassword
                ? "eye"
                : "eye-slash"
            }
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
            secureTextEntry={
              !showConfirmPassword
            }
          />

          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() =>
              setShowConfirmPassword(
                !showConfirmPassword,
              )
            }
          >
            <FontAwesome
              name={
                showConfirmPassword
                  ? "eye"
                  : "eye-slash"
              }
              size={20}
              color="#9ca3af"
            />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <TouchableOpacity
            style={[
              styles.selectInput,
              docTypeOpen &&
                styles.selectInputActive,
            ]}
            onPress={() =>
              setDocTypeOpen((prev) => !prev)
            }
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
                ? docTypeOptions.find(
                    (option) =>
                      option.value ===
                      identificationType,
                  )?.label
                : "Tipo de documento"}
            </Text>

            <FontAwesome
              name={
                docTypeOpen
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={12}
              color={
                docTypeOpen
                  ? "#EA580C"
                  : "#156436"
              }
            />
          </TouchableOpacity>
        </View>

        <TextInput
          style={[
            styles.input,
            styles.inputHalf,
          ]}
          placeholder="Número"
          placeholderTextColor="#9ca3af"
          value={identificationNumber}
          onChangeText={
            setIdentificationNumber
          }
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
          <Text style={styles.primaryText}>
            Crear Cuenta
          </Text>
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
              <ActivityIndicator color="#156436" />
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
            <ActivityIndicator color="#156436" />
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
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <AuthAnimatedBackground />

      <View style={styles.header}>
        {showRecovery ? null : renderTabs()}
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {showRecovery ? (
          renderRecovery()
        ) : (
          <View style={styles.authPanel}>
            {activeTab === "login" ? renderLogin() : renderRegister()}
          </View>
        )}
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

      <Modal
        visible={docTypeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDocTypeOpen(false)}
      >
        <TouchableOpacity
          style={styles.selectorBackdrop}
          activeOpacity={1}
          onPress={() => setDocTypeOpen(false)}
        >
          <View style={styles.selectorSheet}>
            <Text style={styles.selectorTitle}>Tipo de documento</Text>

            <ScrollView
              style={styles.selectorScroll}
              contentContainerStyle={styles.selectorContent}
              nestedScrollEnabled
            >
              {docTypeOptions.map((opt) => {
                const active = identificationType === opt.value;

                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.selectorOption,
                      active && styles.selectorOptionActive,
                    ]}
                    onPress={() => {
                      setIdentificationType(opt.value);
                      setDocTypeOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.selectorOptionText,
                        active && styles.selectorOptionTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingTop: 30,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  body: {
    minHeight: "100%",
    padding: SPACING.lg,
    paddingTop: 0,
    paddingBottom: 40,
  },
  authPanel: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    padding: SPACING.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "rgba(255,255,255,0.96)",
  },

  tabs: {
    width: "100%",
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  closeText: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "700",
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: "#156436",
  },
  tabButtonText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  subtitle: {
    marginBottom: SPACING.md,
    color: "#64748B",
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 4,
    marginBottom: SPACING.lg,
    padding: 4,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  toggleButton: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  toggleButtonActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  toggleText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: "#156436",
    fontWeight: "700",
  },

  card: {
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  stepLabel: {
    color: "#156436",
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: FONT_SIZES.lg + 1,
    fontWeight: "700",
  },
  infoText: {
    marginBottom: SPACING.xs,
    color: "#64748B",
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
  },
  statusText: {
    marginBottom: SPACING.sm,
    color: "#156436",
    fontSize: 13,
    fontWeight: "600",
  },

  input: {
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    fontSize: FONT_SIZES.md,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: "#0F172A",
    fontSize: FONT_SIZES.md,
  },
  eyeIcon: {
    padding: 14,
  },
  inputRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  inputHalf: {
    flex: 1,
  },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  selectInputActive: {
    borderColor: "#156436",
  },
  selectText: {
    flex: 1,
    color: "#0F172A",
    fontSize: FONT_SIZES.md,
  },
  selectPlaceholder: {
    flex: 1,
    color: "#64748B",
    fontSize: FONT_SIZES.md,
  },

  primaryButton: {
    alignItems: "center",
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: "#156436",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  secondaryText: {
    color: "#156436",
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
  linkButton: {
    alignItems: "center",
    marginTop: SPACING.sm,
    paddingVertical: 6,
  },
  linkText: {
    color: "#156436",
    fontSize: 14,
    fontWeight: "600",
  },

  qrImage: {
    width: "100%",
    height: 210,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
  },
  manualBox: {
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
  },
  manualLabel: {
    marginBottom: 6,
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  manualCode: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 2,
  },

  successIcon: {
    marginBottom: 4,
    fontSize: 32,
    textAlign: "center",
  },
  successBox: {
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "#F0F9FF",
  },
  successTitle: {
    color: "#0F172A",
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  successMessage: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
  },

  selectorBackdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  selectorSheet: {
    maxHeight: "65%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  selectorTitle: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    color: "#0F172A",
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  selectorScroll: {
    maxHeight: 300,
  },
  selectorContent: {
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  selectorOption: {
    marginTop: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 10,
  },
  selectorOptionActive: {
    backgroundColor: "#F0F9FF",
  },
  selectorOptionText: {
    color: "#334155",
    fontSize: FONT_SIZES.md,
    fontWeight: "500",
  },
  selectorOptionTextActive: {
    color: "#156436",
    fontWeight: "700",
  },
});

export default AuthScreen;
