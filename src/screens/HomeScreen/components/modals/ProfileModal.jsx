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
import { COLORS, SPACING } from "../../../../utils/constants";
import styles from "../../styles";

const ProfileModal = ({
  visible,
  onClose,
  user,
  logout,
  allowedRoutes, // List of routes based on roles
  onRoutePress,
  onOpenVerification,
}) => {
  if (!user) return null;

  const avatar =
    user.urlAvatar ||
    user.avatar ||
    "https://api.dicebear.com/7.x/miniavs/svg?seed=" + (user.email || "turismo");

  const fullDisplayName = user.fullName || user.email || "Usuario";

  const formatDate = (dateString) => {
    if (!dateString) return "No disponible";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Fecha inválida";
      return date.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (e) {
      return "Error de formato";
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.profileCard}>
          {/* Header */}
          <View style={styles.profileHeaderRow}>
            <View style={styles.profileHeaderTitle}>
              <FontAwesome name="user-circle" size={20} color="#5B3CF0" />
              <Text style={styles.profileTitleText}>Mi perfil</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.profileCloseBtn}>
              <FontAwesome name="times" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: SPACING.md }}
          >
            {/* ALERTA DE VERIFICACION */}
            {user.emailVerified === false && (
              <View style={styles.unverifiedAlert}>
                <View style={styles.unverifiedAlertContent}>
                  <View style={styles.unverifiedAlertIcon}>
                    <FontAwesome name="envelope-o" size={16} color="#B45309" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.unverifiedAlertTitle}>
                      Correo no verificado
                    </Text>
                    <Text style={styles.unverifiedAlertText}>
                      Tu cuenta tiene funciones limitadas hasta que confirmes tu
                      email.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.unverifiedAlertButton}
                  onPress={onOpenVerification}
                >
                  <Text style={styles.unverifiedAlertButtonText}>
                    Verificar ahora
                  </Text>
                  <FontAwesome name="arrow-right" size={10} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Avatar + info */}
            <View style={styles.profileAvatarWrapper}>
              <Image
                source={{ uri: avatar }}
                style={styles.profileAvatar}
                contentFit="cover"
                transition={200}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.profileName} numberOfLines={1}>
                  {fullDisplayName}
                </Text>
                <Text style={styles.profileEmail} numberOfLines={1}>
                  {user.email}
                </Text>
                {user.emailVerified === false ? (
                  <View style={styles.profileUnverifiedBadge}>
                    <FontAwesome
                      name="exclamation-circle"
                      size={12}
                      color="#D97706"
                    />
                    <Text style={styles.profileUnverifiedText}>
                      Correo sin verificar
                    </Text>
                  </View>
                ) : (
                  <View style={styles.profileUnverifiedBadge}>
                    <FontAwesome
                      name="check-circle"
                      size={12}
                      color="#10B981"
                    />
                    <Text
                      style={[styles.profileUnverifiedText, { color: "#10B981" }]}
                    >
                      Verificado
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Info items */}
            <View style={styles.profileInfoGroup}>
              <Text style={styles.profileItemLabel}>Información personal</Text>

              <View style={styles.profileItem}>
                <FontAwesome
                  name="id-card"
                  size={13}
                  color="#5B3CF0"
                  style={{ width: 20 }}
                />
                <Text style={styles.profileItemText}>
                  <Text style={{ fontWeight: "bold" }}>Documento: </Text>
                  {user.identificationType || "CC"}{" "}
                  {user.identificationNumber || "No registrado"}
                </Text>
              </View>

              <View style={styles.profileItem}>
                <FontAwesome
                  name="calendar"
                  size={13}
                  color="#5B3CF0"
                  style={{ width: 20 }}
                />
                <Text style={styles.profileItemText}>
                  <Text style={{ fontWeight: "bold" }}>Miembro desde: </Text>
                  {formatDate(user.createdAt)}
                </Text>
              </View>
            </View>

            {/* Rutas accesibles */}
            {allowedRoutes && allowedRoutes.length > 0 && (
              <View style={styles.profileInfoGroup}>
                <Text style={styles.profileItemLabel}>
                  Accesos y herramientas
                </Text>
                {allowedRoutes.map((route) => (
                  <TouchableOpacity
                    key={route.id}
                    style={styles.profileRouteItem}
                    onPress={() => onRoutePress(route.route)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.profileRouteTitle}>{route.label}</Text>
                      <Text style={styles.profileRouteDesc}>
                        {route.description}
                      </Text>
                    </View>
                    <FontAwesome name="angle-right" size={16} color="#5B3CF0" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Acciones */}
          <View style={styles.profileActions}>
            <TouchableOpacity 
              style={[styles.modalSecondary, { height: 48, justifyContent: 'center' }]} 
              onPress={onClose}
            >
              <Text style={styles.modalSecondaryText}>Cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalPrimary} onPress={logout}>
              <Text style={styles.modalPrimaryText}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(ProfileModal);
