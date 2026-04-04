import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { FontAwesome, Feather, Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../../../utils/constants";
import styles from "../../styles";
import api from "../../../../services/api";
import { ENDPOINTS } from "../../../../config/api.config";
import { useAuth } from "../../../../context/AuthContext";
import { PremiumModal } from "../../../../components/ui/PremiumModal";

const ProfileModal = ({
  visible,
  onClose,
  user,
  logout,
  allowedRoutes, 
  onRoutePress,
  onOpenVerification,
}) => {
  const { updateUser } = useAuth();
  const [currentView, setCurrentView] = useState('summary'); // 'summary' | 'settings'

  // Feedback State
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: ''
  });

  // Perfil Form State
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [urlAvatar, setUrlAvatar] = useState(user?.urlAvatar || "");
  const [idType, setIdType] = useState(user?.identificationType || "CC");
  const [idNumber, setIdNumber] = useState(user?.identificationNumber || "");

  // Seguridad Form State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI State
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setFullName(user.fullName || "");
      setUrlAvatar(user.urlAvatar || "");
      setIdType(user.identificationType || "CC");
      setIdNumber(user.identificationNumber || "");
      setCurrentView('summary'); // Reset a summary al abrir
    }
  }, [visible, user]);

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'El nombre es obligatorio'
      });
      return;
    }
    setLoadingProfile(true);
    try {
      const response = await api.patch(ENDPOINTS.USERS_ME, {
        fullName,
        urlAvatar,
        identificationType: idType,
        identificationNumber: idNumber,
      });
      const updatedData = response.data?.data || response.data;
      if (updatedData) {
        await updateUser(updatedData);
        setStatusModal({
          visible: true,
          type: 'success',
          title: 'Éxito',
          message: 'Perfil actualizado correctamente'
        });
        setCurrentView('summary');
      }
    } catch (error) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'No se pudo actualizar'
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Las contraseñas no coinciden'
      });
      return;
    }
    setLoadingPassword(true);
    try {
      await api.patch(ENDPOINTS.USERS_ME_PASSWORD, { password: newPassword });
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Éxito',
        message: 'Contraseña actualizada'
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Error al actualizar'
      });
    } finally {
      setLoadingPassword(false);
    }
  };

  if (!user) return null;

  const avatar =
    urlAvatar ||
    user.urlAvatar ||
    user.avatar ||
    "https://api.dicebear.com/7.x/miniavs/svg?seed=" + (user.email || "turismo");

  const fullDisplayName = user.fullName || user.email || "Usuario";

  const formatDate = (dateString) => {
    if (!dateString) return "No disponible";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
    } catch (e) { return "Error"; }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.profileCard}>
          {/* Header Dinámico */}
          <View style={styles.profileHeaderRow}>
            {currentView === 'summary' ? (
              <View style={styles.profileHeaderTitle}>
                <FontAwesome name="user-circle" size={20} color="#5B3CF0" />
                <Text style={styles.profileTitleText}>Mi perfil</Text>
                <TouchableOpacity onPress={() => setCurrentView('settings')} style={{ marginLeft: 10 }}>
                   <Feather name="settings" size={18} color="#5B3CF0" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setCurrentView('summary')} style={styles.profileHeaderTitle}>
                <Feather name="arrow-left" size={20} color="#5B3CF0" />
                <Text style={styles.profileTitleText}>Configuración</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.profileCloseBtn}>
              <FontAwesome name="times" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.md }}>
            {currentView === 'summary' ? (
              // --- VISTA RESUMEN ---
              <>
                {user.emailVerified === false && (
                  <View style={styles.unverifiedAlert}>
                    <View style={styles.unverifiedAlertContent}>
                      <FontAwesome name="envelope-o" size={16} color="#B45309" style={{ marginRight: 10 }} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.unverifiedAlertTitle}>Correo no verificado</Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.unverifiedAlertButton} onPress={onOpenVerification}>
                      <Text style={styles.unverifiedAlertButtonText}>Verificar ahora</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.profileAvatarWrapper}>
                  <Image source={{ uri: avatar }} style={styles.profileAvatar} contentFit="cover" transition={200} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.profileName} numberOfLines={1}>{fullDisplayName}</Text>
                    <Text style={styles.profileEmail} numberOfLines={1}>{user.email}</Text>
                    <View style={styles.profileUnverifiedBadge}>
                      <FontAwesome name={user.emailVerified ? "check-circle" : "exclamation-circle"} size={12} color={user.emailVerified ? "#10B981" : "#D97706"} />
                      <Text style={[styles.profileUnverifiedText, { color: user.emailVerified ? "#10B981" : "#D97706" }]}>{user.emailVerified ? "Verificado" : "Sin verificar"}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.profileInfoGroup}>
                  <Text style={styles.profileItemLabel}>Información personal</Text>
                  <View style={styles.profileItem}>
                    <FontAwesome name="id-card" size={13} color="#5B3CF0" style={{ width: 20 }} />
                    <Text style={styles.profileItemText}><Text style={{ fontWeight: "bold" }}>Documento: </Text>{user.identificationType || "CC"} {user.identificationNumber || "No registrado"}</Text>
                  </View>
                  <View style={styles.profileItem}>
                    <FontAwesome name="calendar" size={13} color="#5B3CF0" style={{ width: 20 }} />
                    <Text style={styles.profileItemText}><Text style={{ fontWeight: "bold" }}>Miembro desde: </Text>{formatDate(user.createdAt)}</Text>
                  </View>
                </View>

                {allowedRoutes && allowedRoutes.length > 0 && (
                  <View style={styles.profileInfoGroup}>
                    <Text style={styles.profileItemLabel}>Accesos y herramientas</Text>
                    {allowedRoutes.map((route) => {
                      if (route.id === 'profile-settings') return null; // Ocultamos el viejo botón grande
                      return (
                        <TouchableOpacity key={route.id} style={styles.profileRouteItem} onPress={() => onRoutePress(route.route)}>
                          <View style={styles.profileRouteIconWrapper}><FontAwesome name={route.icon || "circle-o"} size={16} color="#5B3CF0" /></View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.profileRouteTitle}>{route.label}</Text>
                            <Text style={styles.profileRouteDesc}>{route.description}</Text>
                          </View>
                          <FontAwesome name="angle-right" size={16} color="#5B3CF0" />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            ) : (
              // --- VISTA CONFIGURACION ---
              <View style={{ paddingVertical: 10, gap: SPACING.lg }}>
                <View style={{ alignItems: 'center', marginBottom: 10 }}>
                   <View style={{ position: 'relative' }}>
                      <Image source={{ uri: urlAvatar || avatar }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                      <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#5B3CF0', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }}>
                         <Feather name="camera" size={12} color="#fff" />
                      </View>
                   </View>
                </View>

                <View style={styles.inputGroup}>
                   <Text style={styles.inputLabel}>Nombre Completo</Text>
                   <TextInput style={styles.fieldInput} value={fullName} onChangeText={setFullName} placeholder="Tu nombre" />
                </View>
                
                <View style={styles.inputGroup}>
                   <Text style={styles.inputLabel}>Avatar (URL)</Text>
                   <TextInput style={styles.fieldInput} value={urlAvatar} onChangeText={setUrlAvatar} placeholder="https://..." autoCapitalize="none" />
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                   <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Tipo ID</Text>
                      <TextInput style={styles.fieldInput} value={idType} onChangeText={setIdType} />
                   </View>
                   <View style={{ flex: 2 }}>
                      <Text style={styles.inputLabel}>Número ID</Text>
                      <TextInput style={styles.fieldInput} value={idNumber} onChangeText={setIdNumber} keyboardType="numeric" />
                   </View>
                </View>

                <TouchableOpacity 
                   style={[styles.modalPrimary, { backgroundColor: '#5B3CF0', width: '100%', marginLeft: 0 }]} 
                   onPress={handleUpdateProfile}
                   disabled={loadingProfile}
                >
                   {loadingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>Guardar Perfil</Text>}
                </TouchableOpacity>

                <View style={{ height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 }} />

                <Text style={[styles.profileItemLabel, { marginBottom: 0 }]}>Seguridad</Text>
                
                <View style={styles.inputGroup}>
                   <Text style={styles.inputLabel}>Nueva Contraseña</Text>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TextInput 
                        style={[styles.fieldInput, { flex: 1 }]} 
                        value={newPassword} 
                        onChangeText={setNewPassword} 
                        secureTextEntry={!showPassword} 
                        placeholder="••••••••"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 15 }}>
                         <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#94A3B8" />
                      </TouchableOpacity>
                   </View>
                </View>

                <View style={styles.inputGroup}>
                   <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
                   <TextInput 
                     style={styles.fieldInput} 
                     value={confirmPassword} 
                     onChangeText={setConfirmPassword} 
                     secureTextEntry={!showPassword} 
                     placeholder="••••••••"
                   />
                </View>

                <TouchableOpacity 
                   style={[styles.modalPrimary, { backgroundColor: '#5B3CF0', width: '100%', marginLeft: 0 }]} 
                   onPress={handleUpdatePassword}
                   disabled={loadingPassword}
                >
                   {loadingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>Cambiar Contraseña</Text>}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer Fijo */}
          <View style={styles.profileActions}>
            <TouchableOpacity style={[styles.modalSecondary, { height: 48, justifyContent: 'center' }]} onPress={onClose}>
              <Text style={styles.modalSecondaryText}>Cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalPrimary, { backgroundColor: '#5B3CF0' }]} 
              onPress={currentView === 'summary' ? logout : () => setCurrentView('summary')}
            >
              <Text style={styles.modalPrimaryText}>{currentView === 'summary' ? 'Cerrar sesión' : 'Cancelar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <PremiumModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal({ ...statusModal, visible: false })}
      />
    </Modal>
  );
};

export default React.memo(ProfileModal);
