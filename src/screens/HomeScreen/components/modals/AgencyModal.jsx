import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { FontAwesome } from "@expo/vector-icons";
import { SPACING } from "../../../../utils/constants";
import { IMAGE_PLACEHOLDER } from "../../utils/constants";
import styles from "../../styles";

const AgencyModal = ({
  visible,
  onClose,
  agency,
}) => {
  if (!agency) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.agencyModalCard}>
          <View style={styles.agencyModalHeader}>
            <View style={styles.agencyHeaderLeft}>
              <View style={styles.agencyIcon}>
                <FontAwesome name="building" size={14} color="#5B3CF0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.agencyTitle}>
                  {agency.name || "Agencia"}
                </Text>
                <Text style={styles.agencySubtitle}>
                  {agency.email || "contacto@agencia.com"}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtnSmall}>
              <FontAwesome name="times" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.agencyBody}
            showsVerticalScrollIndicator={false}
          >
            {agency.logoUrl ? (
              <Image
                source={{ uri: agency.logoUrl }}
                style={styles.agencyLogo}
                contentFit="cover"
                cachePolicy="disk"
                placeholder={IMAGE_PLACEHOLDER}
                transition={200}
              />
            ) : (
              <View style={[styles.agencyLogo, { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }]}>
                <FontAwesome name="building-o" size={40} color="#94A3B8" />
              </View>
            )}

            <View style={styles.agencyInfoBox}>
              <Text style={styles.agencyInfoTitle}>Sobre nosotros</Text>
              <Text style={styles.agencyDescription}>
                {agency.description || "Somos una agencia comprometida con el turismo sostenible en el Huila."}
              </Text>
            </View>

            <View style={styles.agencyContactBox}>
              <View style={styles.agencyContactItem}>
                <FontAwesome name="phone" size={14} color="#5B3CF0" />
                <Text style={styles.agencyContactText}>{agency.phone || "No disponible"}</Text>
              </View>
              <View style={styles.agencyContactItem}>
                <FontAwesome name="map-marker" size={14} color="#5B3CF0" />
                <Text style={styles.agencyContactText}>{agency.address || "Huila, Colombia"}</Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.agencyCloseButton} onPress={onClose}>
            <Text style={styles.agencyCloseButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(AgencyModal);
