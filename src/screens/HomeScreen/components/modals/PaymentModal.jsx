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
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS } from "../../../../utils/constants";
import styles from "../../styles";

const PaymentModal = ({
  visible,
  onClose,
  selectedPackage,
  paymentForm,
  onPaymentChange,
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
            colors={["#f4f0ff", "#fdf4ff"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.paymentHeader}
          >
            <View style={styles.paymentHeaderLeft}>
              <View style={styles.paymentIcon}>
                <FontAwesome name="credit-card" size={14} color="#5B3CF0" />
              </View>
              <View>
                <Text style={styles.paymentTitle}>Pasarela de Pago</Text>
                <Text style={styles.paymentSubtitle}>
                  Reserva tu paquete turístico
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtnSmall}>
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
                    ? `${selectedPackage.days} días / ${selectedPackage.nights} noches`
                    : "Duración flexible"}
                </Text>
              </View>
              <View style={styles.paymentPackagePrice}>
                <Text style={styles.paymentPackagePriceLabel}>Total</Text>
                <Text style={styles.paymentPackagePriceValue}>
                  {formatPrice(selectedPackage?.price || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.paymentInput}
                placeholder="tu@email.com"
                keyboardType="email-address"
                value={paymentForm.email}
                onChangeText={(text) => onPaymentChange("email", text)}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Número de Tarjeta</Text>
              <TextInput
                style={styles.paymentInput}
                placeholder="1234 5678 9012 3456"
                keyboardType="number-pad"
                value={paymentForm.cardNumber}
                onChangeText={(text) => onPaymentChange("cardNumber", text)}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre en la Tarjeta</Text>
              <TextInput
                style={styles.paymentInput}
                placeholder="Juan Pérez"
                value={paymentForm.cardName}
                onChangeText={(text) => onPaymentChange("cardName", text)}
              />
            </View>
            <View style={styles.paymentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Fecha de Vencimiento</Text>
                <TextInput
                  style={styles.paymentInput}
                  placeholder="MM/AA"
                  value={paymentForm.expiry}
                  onChangeText={(text) => onPaymentChange("expiry", text)}
                />
              </View>
              <View style={{ width: 100 }}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.paymentInput}
                  placeholder="123"
                  secureTextEntry
                  value={paymentForm.cvv}
                  onChangeText={(text) => onPaymentChange("cvv", text)}
                />
              </View>
            </View>

            <View style={styles.paymentSecureRow}>
              <View style={styles.paymentSecureIcon}>
                <FontAwesome name="lock" size={12} color="#059669" />
              </View>
              <Text style={styles.paymentSecureText}>
                Pago seguro con encriptación SSL
              </Text>
            </View>

            <TouchableOpacity style={styles.paymentConfirm} onPress={onClose}>
              <LinearGradient
                colors={["#7B5BFF", "#D66DFF"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.paymentConfirmGradient}
              >
                <Text style={styles.paymentConfirmText}>
                  Confirmar Pago - {formatPrice(selectedPackage?.price || 0)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(PaymentModal);
