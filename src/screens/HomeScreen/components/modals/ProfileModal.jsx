import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { FontAwesome, Feather } from "@expo/vector-icons";
import { SPACING } from "../../../../utils/constants";
import styles from "../../styles";
import api from "../../../../services/api";
import { ENDPOINTS } from "../../../../config/api.config";
import { useAuth } from "../../../../context/AuthContext";
import { PremiumModal } from "../../../../components/ui/PremiumModal";

const AUTO_VISIT_PREF_KEY = "turismo_auto_visit_enabled";

const ProfileModal = ({
  visible,
  onClose,
  user,
  logout,
  allowedRoutes, 
  onRoutePress,
  onOpenVerification,
  onAddAccount,
}) => {
  const { updateUser, savedAccounts, switchAccount, removeSavedAccount } = useAuth();
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
  const [autoVisitEnabled, setAutoVisitEnabled] = useState(false);
  const [savingAutoVisit, setSavingAutoVisit] = useState(false);

  // UI State
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [switchingEmail, setSwitchingEmail] = useState("");

  useEffect(() => {
    if (visible && user) {
      setFullName(user.fullName || "");
      setUrlAvatar(user.urlAvatar || "");
      setIdType(user.identificationType || "CC");
      setIdNumber(user.identificationNumber || "");
      setCurrentView('summary'); // Reset a summary al abrir
      AsyncStorage.getItem(AUTO_VISIT_PREF_KEY)
        .then(async (value) => {
          if (value === null) {
            setAutoVisitEnabled(true);
            await AsyncStorage.setItem(AUTO_VISIT_PREF_KEY, "true");
            return;
          }
          setAutoVisitEnabled(value === "true");
        })
        .catch(() => setAutoVisitEnabled(true));
    }
  }, [visible, user]);

  const persistAutoVisitPreference = async (nextValue) => {
    setSavingAutoVisit(true);
    try {
      await AsyncStorage.setItem(AUTO_VISIT_PREF_KEY, nextValue ? "true" : "false");
      setAutoVisitEnabled(nextValue);
    } catch (_err) {
      setStatusModal({
        visible: true,
        type: "error",
        title: "Error",
        message: "No se pudo guardar la preferencia de visita automatica.",
      });
    } finally {
      setSavingAutoVisit(false);
    }
  };

  const handleToggleAutoVisit = (nextValue) => {
    const action = nextValue ? "activar" : "desactivar";
    setStatusModal({
      visible: true,
      type: "warning",
      title: "Confirmar cambio",
      message: `Vas a ${action} la validacion automatica de visita. Deseas continuar?`,
      confirmText: "Aceptar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        setStatusModal((prev) => ({ ...prev, visible: false }));
        await persistAutoVisitPreference(nextValue);
      },
      onCancel: () => setStatusModal((prev) => ({ ...prev, visible: false })),
    });
  };

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
          title: 'Exito',
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
        message: 'Las contrasenas no coinciden'
      });
      return;
    }
    setLoadingPassword(true);
    try {
      await api.patch(ENDPOINTS.USERS_ME_PASSWORD, { password: newPassword });
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Exito',
        message: 'Contrasena actualizada'
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

  const handleSwitchAccount = async (account) => {
    if (!account?.email || account.email === user.email) return;

    setSwitchingEmail(account.email);
    const result = await switchAccount(account.email);
    setSwitchingEmail("");

    if (result.success) {
      setStatusModal({
        visible: true,
        type: "success",
        title: "Cuenta cambiada",
        message: `Ahora estas usando ${account.user?.fullName || account.email}.`,
        confirmText: "Entendido",
        onConfirm: () => {
          setStatusModal((prev) => ({ ...prev, visible: false }));
          onClose?.();
        },
      });
      return;
    }

    setStatusModal({
      visible: true,
      type: "warning",
      title: "Sesion expirada",
      message: result.error || "Debes iniciar sesion nuevamente con esa cuenta.",
      confirmText: "Entendido",
      onConfirm: () => setStatusModal((prev) => ({ ...prev, visible: false })),
    });
  };

  const handleRemoveSavedAccount = async (account) => {
    if (!account?.email || account.email === user.email) return;
    await removeSavedAccount(account.email);
  };

  const handleAddAccount = () => {
    onClose?.();
    onAddAccount?.();
  };

  if (!user) return null;

  const avatar =
    urlAvatar ||
    user.urlAvatar ||
    user.avatar ||
    "https://api.dicebear.com/7.x/miniavs/svg?seed=" + (user.email || "turismo");

  const fullDisplayName = user.fullName || user.email || "Usuario";
  const rememberedAccounts = (savedAccounts || []).filter(
    (account) => account?.email && account.email !== user.email,
  );
  const currentAccountStored = (savedAccounts || []).some(
    (account) => account?.email === user.email,
  );
  const canAddAccount = (savedAccounts || []).length < 2;

  const formatDate = (dateString) => {
    if (!dateString) return "No disponible";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
    } catch (_e) { return "Error"; }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.profileCard}>
          {/* Header Dinamico */}
          <View style={styles.profileHeaderRow}>
            {currentView === 'summary' ? (
              <View style={styles.profileHeaderTitle}>
                <FontAwesome name="user-circle" size={20} color="#0E7490" />
                <Text style={styles.profileTitleText}>Mi perfil</Text>
                <TouchableOpacity onPress={() => setCurrentView('settings')} style={{ marginLeft: 10 }}>
                   <Feather name="settings" size={18} color="#0E7490" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setCurrentView('summary')} style={styles.profileHeaderTitle}>
                <Feather name="arrow-left" size={20} color="#0E7490" />
                <Text style={styles.profileTitleText}>Configuracion</Text>
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
                  <Text style={styles.profileItemLabel}>Informacion personal</Text>
                  <View style={styles.profileItem}>
                    <FontAwesome name="id-card" size={13} color="#0E7490" style={{ width: 20 }} />
                    <Text style={styles.profileItemText}><Text style={{ fontWeight: "bold" }}>Documento: </Text>{user.identificationType || "CC"} {user.identificationNumber || "No registrado"}</Text>
                  </View>
                  <View style={styles.profileItem}>
                    <FontAwesome name="calendar" size={13} color="#0E7490" style={{ width: 20 }} />
                    <Text style={styles.profileItemText}><Text style={{ fontWeight: "bold" }}>Miembro desde: </Text>{formatDate(user.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.profileInfoGroup}>
                  <Text style={styles.profileItemLabel}>Cuentas</Text>
                  <View style={styles.savedAccountItem}>
                    <View style={[styles.savedAccountMain, styles.savedAccountCurrent]}>
                      <Image
                        source={{ uri: avatar }}
                        style={styles.savedAccountAvatar}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedAccountName} numberOfLines={1}>
                          {fullDisplayName}
                        </Text>
                        <Text style={styles.savedAccountEmail} numberOfLines={1}>
                          {user.email}
                        </Text>
                      </View>
                      <View style={styles.currentAccountBadge}>
                        <Text style={styles.currentAccountBadgeText}>
                          Actual
                        </Text>
                      </View>
                    </View>
                  </View>

                  {rememberedAccounts.length > 0 ? (
                    <>
                    {rememberedAccounts.map((account) => {
                      const accountName =
                        account.user?.fullName ||
                        account.user?.name ||
                        account.email;
                      const accountAvatar =
                        account.user?.urlAvatar ||
                        account.user?.avatar ||
                        "https://api.dicebear.com/7.x/miniavs/svg?seed=" + account.email;
                      const switching = switchingEmail === account.email;

                      return (
                        <View key={account.email} style={styles.savedAccountItem}>
                          <TouchableOpacity
                            style={styles.savedAccountMain}
                            onPress={() => handleSwitchAccount(account)}
                            disabled={switching}
                            activeOpacity={0.86}
                          >
                            <Image
                              source={{ uri: accountAvatar }}
                              style={styles.savedAccountAvatar}
                              contentFit="cover"
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={styles.savedAccountName} numberOfLines={1}>
                                {accountName}
                              </Text>
                              <Text style={styles.savedAccountEmail} numberOfLines={1}>
                                {account.email}
                              </Text>
                            </View>
                            {switching ? (
                              <ActivityIndicator size="small" color="#0E7490" />
                            ) : (
                              <FontAwesome name="exchange" size={15} color="#0E7490" />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.savedAccountRemove}
                            onPress={() => handleRemoveSavedAccount(account)}
                            disabled={switching}
                          >
                            <Feather name="x" size={16} color="#94A3B8" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                    </>
                  ) : (
                    <Text style={styles.savedAccountHint}>
                      Agrega otra cuenta para alternar sin cerrar esta sesión.
                    </Text>
                  )}

                  {canAddAccount ? (
                    <TouchableOpacity
                      style={styles.addAccountButton}
                      onPress={handleAddAccount}
                      activeOpacity={0.86}
                    >
                      <Feather name="user-plus" size={16} color="#0E7490" />
                      <Text style={styles.addAccountButtonText}>
                        Agregar otra cuenta
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.savedAccountHint}>
                      Máximo 2 cuentas guardadas. Elimina una para agregar otra.
                    </Text>
                  )}

                  {!currentAccountStored ? (
                    <Text style={styles.savedAccountHint}>
                      Esta cuenta quedará recordada al iniciar sesión nuevamente.
                    </Text>
                  ) : null}
                </View>

                {allowedRoutes && allowedRoutes.length > 0 && (
                  <View style={styles.profileInfoGroup}>
                    <Text style={styles.profileItemLabel}>Accesos y herramientas</Text>
                    {allowedRoutes.map((route) => {
                      if (route.id === 'profile-settings') return null; // Ocultamos el viejo boton grande
                      return (
                        <TouchableOpacity key={route.id} style={styles.profileRouteItem} onPress={() => onRoutePress(route.route)}>
                          <View style={styles.profileRouteIconWrapper}><FontAwesome name={route.icon || "circle-o"} size={16} color="#0E7490" /></View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.profileRouteTitle}>{route.label}</Text>
                            <Text style={styles.profileRouteDesc}>{route.description}</Text>
                          </View>
                          <FontAwesome name="angle-right" size={16} color="#0E7490" />
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
                      <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0E7490', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' }}>
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
                      <Text style={styles.inputLabel}>Numero ID</Text>
                      <TextInput style={styles.fieldInput} value={idNumber} onChangeText={setIdNumber} keyboardType="numeric" />
                   </View>
                </View>

                <TouchableOpacity 
                   style={[styles.modalPrimary, { backgroundColor: '#0E7490', width: '100%', marginLeft: 0 }]} 
                   onPress={handleUpdateProfile}
                   disabled={loadingProfile}
                >
                   {loadingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>Guardar Perfil</Text>}
                </TouchableOpacity>

                <View style={{ height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 }} />

                <Text style={[styles.profileItemLabel, { marginBottom: 0 }]}>Seguridad</Text>
                
                <View style={styles.inputGroup}>
                   <Text style={styles.inputLabel}>Nueva Contrasena</Text>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TextInput 
                        style={[styles.fieldInput, { flex: 1 }]} 
                        value={newPassword} 
                        onChangeText={setNewPassword} 
                        secureTextEntry={!showPassword} 
                        placeholder="********"
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 15 }}>
                         <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#94A3B8" />
                      </TouchableOpacity>
                   </View>
                </View>

                <View style={styles.inputGroup}>
                   <Text style={styles.inputLabel}>Confirmar Contrasena</Text>
                   <TextInput 
                     style={styles.fieldInput} 
                     value={confirmPassword} 
                     onChangeText={setConfirmPassword} 
                     secureTextEntry={!showPassword} 
                     placeholder="********"
                   />
                </View>

                <TouchableOpacity 
                   style={[styles.modalPrimary, { backgroundColor: '#0E7490', width: '100%', marginLeft: 0 }]} 
                   onPress={handleUpdatePassword}
                   disabled={loadingPassword}
                >
                   {loadingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalPrimaryText}>Cambiar Contrasena</Text>}
                </TouchableOpacity>
                <View style={{ height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 }} />

                <Text style={[styles.profileItemLabel, { marginBottom: 0 }]}>Terminos y condiciones</Text>
                <View style={styles.profileItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#1E293B", fontWeight: "700", fontSize: 14 }}>
                      Marcar visita automatica
                    </Text>
                    <Text style={{ color: "#64748B", fontSize: 12, marginTop: 3 }}>
                      Check-in y confirmacion automatica al estar en el sitio.
                    </Text>
                  </View>
                  {savingAutoVisit ? (
                    <ActivityIndicator size="small" color="#0E7490" />
                  ) : (
                    <Switch
                      value={autoVisitEnabled}
                      onValueChange={handleToggleAutoVisit}
                      thumbColor={autoVisitEnabled ? "#0E7490" : "#E2E8F0"}
                      trackColor={{ false: "#CBD5E1", true: "#A5F3FC" }}
                    />
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer Fijo */}
          <View style={styles.profileActions}>
            <TouchableOpacity style={[styles.modalSecondary, { height: 48, justifyContent: 'center' }]} onPress={onClose}>
              <Text style={styles.modalSecondaryText}>Cerrar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalPrimary, { backgroundColor: '#0E7490' }]} 
              onPress={currentView === 'summary' ? logout : () => setCurrentView('summary')}
            >
              <Text style={styles.modalPrimaryText}>{currentView === 'summary' ? 'Cerrar sesion' : 'Cancelar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <PremiumModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        confirmText={statusModal.confirmText}
        cancelText={statusModal.cancelText}
        onConfirm={statusModal.onConfirm}
        onCancel={statusModal.onCancel}
        onClose={() => setStatusModal({ ...statusModal, visible: false })}
      />
    </Modal>
  );
};

export default React.memo(ProfileModal);
