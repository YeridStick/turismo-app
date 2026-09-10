import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS } from "../../../../utils/constants";
import styles from "../../styles";

const VerificationModal = ({
  visible,
  onClose,
  email,
  loading,
  status, // { type: 'success' | 'error', message: string }
  token,
  setToken,
  onRequestToken,
  onVerifyToken,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.verificationCard}
        >
          <View style={styles.verificationHeader}>
            <View style={styles.verificationIconBg}>
              <FontAwesome name="shield" size={20} color="#156436" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.verificationTitle}>Verificar Correo</Text>
              <Text style={styles.verificationSubtitle}>{email}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtnSmall}>
              <FontAwesome name="times" size={14} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.verificationBody}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.verificationText}>
              Para mayor seguridad, necesitamos confirmar que eres el dueño de
              esta cuenta.
            </Text>

            <View style={styles.verificationActionRow}>
              <TouchableOpacity
                style={[
                  styles.verificationRequestBtn,
                  loading && { opacity: 0.7 },
                ]}
                onPress={onRequestToken}
                disabled={loading}
              >
                <FontAwesome name="paper-plane" size={12} color="#156436" />
                <Text style={styles.verificationRequestBtnText}>
                  {loading ? "Enviando..." : "Solicitar código"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tokenInputGroup}>
              <Text style={styles.tokenInputLabel}>
                Ingresa el código / token:
              </Text>
              <TextInput
                style={styles.tokenInput}
                placeholder="Ej: aWdlPmPi..."
                value={token}
                onChangeText={setToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {status && (
              <View
                style={[
                  styles.verificationStatusBox,
                  status.type === "error"
                    ? styles.statusBoxError
                    : styles.statusBoxSuccess,
                ]}
              >
                <FontAwesome
                  name={
                    status.type === "error" ? "exclamation-circle" : "check-circle"
                  }
                  size={14}
                  color={status.type === "error" ? "#ef4444" : "#10b981"}
                />
                <Text
                  style={[
                    styles.verificationStatusText,
                    status.type === "error"
                      ? { color: "#ef4444" }
                      : { color: "#10b981" },
                  ]}
                >
                  {status.message}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.verificationFooter}>
            <TouchableOpacity
              style={styles.verifyModalCloseBtn}
              onPress={onClose}
            >
              <Text style={styles.verifyModalCloseBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.verifyModalConfirmBtn}
              onPress={onVerifyToken}
              disabled={loading || !token}
            >
              <Text style={styles.verifyModalConfirmBtnText}>Verificar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default React.memo(VerificationModal);
