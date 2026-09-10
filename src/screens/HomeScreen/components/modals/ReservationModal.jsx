import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import styles from "../../styles";

const CONTACT_OPTIONS = [
  { value: "EMAIL", label: "Email", icon: "envelope-o" },
  { value: "IN_APP", label: "En la app", icon: "bell-o" },
];

const ReservationModal = ({
  visible,
  onClose,
  selectedPackage,
  reservationForm,
  reservationQuote,
  onReservationChange,
  onSubmit,
  loading,
  formatPrice,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.paymentCard}>
          <LinearGradient
            colors={["#ECFEFF", "#FFF7ED"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.paymentHeader}
          >
            <View style={styles.paymentHeaderLeft}>
              <View style={styles.paymentIcon}>
                <FontAwesome name="calendar-check-o" size={14} color="#156436" />
              </View>
              <View>
                <Text style={styles.paymentTitle}>Solicitud de reserva</Text>
                <Text style={styles.paymentSubtitle}>
                  La agencia confirmara disponibilidad
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtnSmall} disabled={loading}>
              <FontAwesome name="times" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView
            contentContainerStyle={styles.paymentBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.paymentPackageRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentPackageTitle}>
                  {selectedPackage?.title || "Paquete seleccionado"}
                </Text>
                <Text style={styles.paymentPackageSubtitle}>
                  {selectedPackage
                    ? `${selectedPackage.days ?? "-"} dias / ${selectedPackage.nights ?? "-"} noches`
                    : "Duracion por confirmar"}
                </Text>
              </View>
              <View style={styles.paymentPackagePrice}>
                <Text style={styles.paymentPackagePriceLabel}>Referencia</Text>
                <Text style={styles.paymentPackagePriceValue}>
                  {formatPrice(reservationQuote?.finalPrice ?? selectedPackage?.price ?? 0)}
                </Text>
              </View>
            </View>

            {reservationQuote ? (
              <Text style={styles.paymentSecureText}>
                Cotización del servidor: {formatPrice(reservationQuote.finalPrice)}. El precio queda congelado al crear la reserva.
              </Text>
            ) : null}

            <View style={styles.paymentSecureRow}>
              <View style={styles.paymentSecureIcon}>
                <FontAwesome name="info" size={12} color="#059669" />
              </View>
              <Text style={styles.paymentSecureText}>
                No se realizara ningun pago ahora. La agencia gestionara la reserva y el pago contigo.
              </Text>
            </View>

            <View style={styles.paymentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Fecha inicio</Text>
                <TextInput
                  style={styles.paymentInput}
                  placeholder="2026-07-20"
                  value={reservationForm.startDate}
                  onChangeText={(text) => onReservationChange("startDate", text)}
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Fecha final opcional</Text>
                <TextInput
                  style={styles.paymentInput}
                  placeholder="Backend la calcula"
                  value={reservationForm.endDate}
                  onChangeText={(text) => onReservationChange("endDate", text)}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.paymentRow}>
              <View style={{ width: 118 }}>
                <Text style={styles.inputLabel}>Viajeros</Text>
                <TextInput
                  style={styles.paymentInput}
                  placeholder="2"
                  keyboardType="number-pad"
                  value={reservationForm.travelers}
                  onChangeText={(text) => onReservationChange("travelers", text.replace(/[^0-9]/g, ""))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Telefono opcional</Text>
                <TextInput
                  style={styles.paymentInput}
                  placeholder="3001234567"
                  keyboardType="phone-pad"
                  value={reservationForm.customerPhone}
                  onChangeText={(text) => onReservationChange("customerPhone", text)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Preferencia de contacto</Text>
              <View style={styles.reservationOptionRow}>
                {CONTACT_OPTIONS.map((option) => {
                  const active = reservationForm.contactPreference === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.reservationOption,
                        active && styles.reservationOptionActive,
                      ]}
                      onPress={() => onReservationChange("contactPreference", option.value)}
                      activeOpacity={0.86}
                    >
                      <FontAwesome
                        name={option.icon}
                        size={13}
                        color={active ? "#156436" : "#64748B"}
                      />
                      <Text
                        style={[
                          styles.reservationOptionText,
                          active && styles.reservationOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mensaje opcional</Text>
              <TextInput
                style={[styles.paymentInput, styles.reservationMessageInput]}
                placeholder="Deseo confirmar disponibilidad"
                multiline
                value={reservationForm.message}
                onChangeText={(text) => onReservationChange("message", text)}
              />
            </View>

            <TouchableOpacity
              style={styles.reservationConsentRow}
              onPress={() => onReservationChange("consentAccepted", !reservationForm.consentAccepted)}
              activeOpacity={0.86}
            >
              <View
                style={[
                  styles.reservationCheckbox,
                  reservationForm.consentAccepted && styles.reservationCheckboxActive,
                ]}
              >
                {reservationForm.consentAccepted ? (
                  <FontAwesome name="check" size={11} color="#FFFFFF" />
                ) : null}
              </View>
              <Text style={styles.reservationConsentText}>
                Acepto el tratamiento de datos para gestionar esta solicitud de reserva.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paymentConfirm, loading && { opacity: 0.72 }]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#4E9A5F", "#FE6C01"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.paymentConfirmGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.paymentConfirmText}>Solicitar reserva</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(ReservationModal);
