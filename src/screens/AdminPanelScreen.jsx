import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
} from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { getAgencies, createAgency, updateAgency, deleteAgency, getAgencyUsers, addAgencyUser, updateAgencyUser, deleteAgencyUser } from '../services/api';
import { PremiumModal } from '../components/ui/PremiumModal';
import { useAuth } from '../context/AuthContext';

const ACCENT = "#0E7490";
const COLORS = {
    bg: "#FFFFFF",
    text: "#0F172A",
    textLight: "#64748B",
    card: "#F8FAFC",
};

const normalizeEmail = (value) => (value || '').trim().toLowerCase();

const CreateAgencyModal = ({ visible, onClose, onSuccess, initialData, currentUserEmail }) => {
    const creatorEmail = (currentUserEmail || '').trim();
    const creatorKey = normalizeEmail(creatorEmail);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [repEmails, setRepEmails] = useState([{ id: null, email: '', isNew: true, isCreator: false, isLocked: false }]);
    const [originalReps, setOriginalReps] = useState([]);
    const [deletedRepIds, setDeletedRepIds] = useState([]);
    const [repError, setRepError] = useState('');
    const [statusModal, setStatusModal] = useState({ visible: false, type: 'success', title: '', message: '' });

    const loadUsers = useCallback(async (agencyId) => {
        try {
            console.log(`[DEBUG] Cargando usuarios para agencia ${agencyId}...`);
            const res = await getAgencyUsers(agencyId);
            const users = res.data?.data || res.data || [];
            console.log("[DEBUG] Usuarios recibidos:", JSON.stringify(users, null, 2));
            
            // Normalizar usuarios a objetos { id, email }
            const normalized = users.map(u => {
                if (typeof u === 'string') return { id: null, email: u };
                return { id: u.id || null, email: u.email || u };
            });
            
            let repsWithCreator = normalized.map((u) => ({
                ...u,
                isNew: !u.id,
                isCreator: creatorKey && normalizeEmail(u.email) === creatorKey,
                isLocked: creatorKey && normalizeEmail(u.email) === creatorKey,
            }));

            if (creatorKey && !repsWithCreator.some((u) => u.isCreator)) {
                repsWithCreator = [
                    { id: null, email: creatorEmail, isNew: true, isCreator: true, isLocked: true },
                    ...repsWithCreator,
                ];
            }

            setOriginalReps(normalized);
            if (repsWithCreator.length > 0) {
                repsWithCreator.sort((a, b) => (a.isCreator === b.isCreator ? 0 : a.isCreator ? -1 : 1));
                setRepEmails(repsWithCreator);
            } else if (creatorKey) {
                setRepEmails([{ id: null, email: creatorEmail, isNew: true, isCreator: true, isLocked: true }]);
            } else {
                setRepEmails([{ id: null, email: '', isNew: true, isCreator: false, isLocked: false }]);
            }
        } catch (err) {
            console.error("Error loading agency users:", err);
        }
    }, [creatorEmail, creatorKey]);

    useEffect(() => {
        if (visible) {
            if (initialData) {
                setName(initialData.name || '');
                setEmail(initialData.email || '');
                setPhone(initialData.phone || '');
                setLogoUrl(initialData.logoUrl || '');
                loadUsers(initialData.id);
            } else {
                setName('');
                setEmail('');
                setPhone('');
                setLogoUrl('');
                if (creatorKey) {
                    setRepEmails([{ id: null, email: creatorEmail, isNew: true, isCreator: true, isLocked: true }]);
                } else {
                    setRepEmails([{ id: null, email: '', isNew: true, isCreator: false, isLocked: false }]);
                }
                setOriginalReps([]);
            }
            setDeletedRepIds([]);
            setRepError('');
        }
    }, [initialData, visible, creatorEmail, creatorKey, loadUsers]);

    const updateRepEmail = (value, idx) => {
        setRepEmails(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            if (item.isLocked) return item;
            return { ...item, email: value };
        }));
    };

    const addRepEmail = () => {
        setRepEmails(prev => [...prev, { id: null, email: '', isNew: true, isCreator: false, isLocked: false }]);
    };

    const removeRepEmail = (idx) => {
        const target = repEmails[idx];
        if (!target || target.isLocked) return;
        if (target.id) {
            setDeletedRepIds(prev => [...prev, target.id]);
        }
        setRepEmails(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async () => {
        if (!name || !email) return;

        const creatorRep = repEmails.find((r) => r.isCreator);
        if (creatorKey && (!creatorRep || normalizeEmail(creatorRep.email) !== creatorKey)) {
            setRepError('El correo del creador es obligatorio y no se puede quitar.');
            return;
        }

        const filledEmails = repEmails.filter(r => r.email.trim() !== '');
        if (filledEmails.length === 0 && !initialData) {
            setRepError('Debes ingresar al menos un correo de representante.');
            return;
        }

        setRepError('');
        setLoading(true);
        try {
            let agencyId = initialData?.id;
            if (agencyId) {
                await updateAgency(agencyId, { name, email, phone, logoUrl });
            } else {
                const res = await createAgency({ name, email, phone, logoUrl });
                agencyId = (res.data?.data || res.data)?.id;
            }

            if (agencyId) {
                // 1. Eliminar los desvinculados (solo si tienen ID)
                for (const userId of deletedRepIds) {
                    if (userId) {
                        await deleteAgencyUser(agencyId, userId);
                    }
                }

                // 2. Procesar los representantes actuales
                for (const rep of filledEmails) {
                    if (rep.isNew) {
                        // Nuevo: POST (Enviamos el correo de la agencia y el nuevo correo para vincularlos)
                        await addAgencyUser({ emailAgencia: email, email: rep.email });
                    } else if (rep.id) {
                        // Existente y con ID: Ver si cambio (PATCH)
                        const original = originalReps.find(o => o.id === rep.id);
                        if (original && original.email !== rep.email) {
                            await updateAgencyUser(agencyId, rep.id, { email: rep.email });
                        }
                    } else {
                        // Caso: Existente pero sin ID (error en GET)
                        console.warn(`[WARN] No se puede editar el usuario ${rep.email} porque no tiene ID. Saltando...`);
                    }
                }
            }

            setStatusModal({
                visible: true,
                type: 'success',
                title: 'Agencia Actualizada',
                message: initialData ? 'Los datos y representantes se han actualizado correctamente.' : 'La agencia ha sido creada exitosamente.',
            });
            onSuccess();
        } catch (err) {
            console.error(err);
            setStatusModal({
                visible: true,
                type: 'error',
                title: 'Error',
                message: 'No se pudieron guardar todos los cambios. Por favor revisa los datos.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <BlurView intensity={20} style={styles.modalOverlay}>
                <KeyboardAvoidingView
                    style={styles.modalKeyboard}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
                >
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{initialData ? 'Editar Agencia' : 'Nueva Agencia'}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={styles.modalFormScroll}
                        contentContainerStyle={styles.modalFormContent}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                        automaticallyAdjustKeyboardInsets
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.inputLabel}>Nombre de la Agencia</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ej. Turismo Huila" />
                        <Text style={styles.inputLabel}>Correo Electronico</Text>
                        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="agencia@ejemplo.com" keyboardType="email-address" />
                        <Text style={styles.inputLabel}>Telefono</Text>
                        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="300 123 4567" keyboardType="phone-pad" />
                        <Text style={styles.inputLabel}>URL del Logo</Text>
                        <TextInput style={styles.input} value={logoUrl} onChangeText={setLogoUrl} placeholder="https://..." />

                        {/* SECCION CREADOR Y COLABORADORES */}
                        <View style={styles.repSection}>
                            <View style={styles.repSectionHeader}>
                                <Ionicons name="people" size={16} color={ACCENT} />
                                <Text style={styles.repSectionTitle}>Creador y Colaboradores</Text>
                            </View>
                            <Text style={styles.repSectionHint}>El creador queda vinculado por defecto. Puedes agregar mas usuarios.</Text>

                            {repEmails.map((rep, idx) => (
                                <View key={idx} style={styles.repRow}>
                                    <TextInput
                                        style={[styles.input, styles.repInput, rep.isLocked && styles.repInputLocked]}
                                        value={rep.email}
                                        onChangeText={(v) => updateRepEmail(v, idx)}
                                        placeholder={rep.isCreator ? 'Correo del creador' : `Correo usuario ${idx + 1}`}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        editable={!rep.isLocked}
                                    />
                                    {rep.isCreator ? (
                                        <View style={styles.creatorBadge}>
                                            <Text style={styles.creatorBadgeText}>Creador</Text>
                                        </View>
                                    ) : (
                                        <TouchableOpacity onPress={() => removeRepEmail(idx)} style={styles.repRemoveBtn}>
                                            <Ionicons name="close-circle" size={22} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}

                            {repError ? <Text style={styles.repError}>{repError}</Text> : null}

                            <TouchableOpacity style={styles.addRepBtn} onPress={addRepEmail}>
                                <Ionicons name="add-circle-outline" size={18} color={ACCENT} />
                                <Text style={styles.addRepText}>Agregar otro usuario</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>{initialData ? 'Guardar Cambios' : 'Crear Agencia'}</Text>}
                        </TouchableOpacity>
                        <View style={{ height: 40 }} />
                    </ScrollView>
                </View>
                </KeyboardAvoidingView>
            </BlurView>
            <PremiumModal 
                {...statusModal} 
                onClose={() => {
                    setStatusModal({ ...statusModal, visible: false });
                    if (statusModal.type === 'success') onClose();
                }} 
            />
        </Modal>
    );
};

const AdminPanelScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [agencies, setAgencies] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAgency, setEditingAgency] = useState(null);

    const loadAgencies = async () => {
        setLoading(true);
        try {
            const response = await getAgencies();
            setAgencies(response.data?.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAgencies();
    }, []);

    const handleDeleteAgency = (id) => {
        import('react-native').then(({ Alert }) => {
            Alert.alert(
                "Eliminar Agencia",
                "Estas seguro de eliminar esta agencia? Los paquetes asociados tambien seran eliminados.",
                [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Eliminar", style: "destructive", onPress: async () => {
                        setLoading(true);
                        try {
                            await deleteAgency(id);
                            loadAgencies();
                        } catch (err) {
                            console.error(err);
                            setLoading(false);
                        }
                    }}
                ]
            );
        });
    };

    const renderAgencyCard = (item) => (
        <View key={item.id} style={styles.agencyCard}>
            <View style={styles.agencyCardLogo}>
                {item.logoUrl ? (
                    <Image source={{ uri: item.logoUrl }} style={styles.logoImage} />
                ) : (
                    <FontAwesome name="building" size={24} color={ACCENT} />
                )}
            </View>
            <View style={styles.agencyCardInfo}>
                <Text style={styles.agencyCardName}>{item.name}</Text>
                <Text style={styles.agencyCardEmail}>{item.email}</Text>
                <View style={styles.badgeRow}>
                    <Text style={styles.cardPhone}>{item.phone || "Sin telefono"}</Text>
                </View>
            </View>
            <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => {
                    setEditingAgency(item);
                    setShowCreateModal(true);
                }} style={styles.iconButton}>
                    <MaterialIcons name="edit" size={22} color={COLORS.textLight} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAgency(item.id)} style={styles.iconButton}>
                    <MaterialIcons name="delete-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Centro de Control</Text>
                    <Text style={styles.headerSubtitle}>Gestion global de agencias</Text>
                </View>
                <TouchableOpacity style={styles.addBtnHeader} onPress={() => {
                    setEditingAgency(null);
                    setShowCreateModal(true);
                }}>
                    <Ionicons name="add" size={28} color="#FFF" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={ACCENT} size="large" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Agencias Aliadas</Text>
                        <Text style={styles.sectionCount}>{agencies.length} Total</Text>
                    </View>

                    {agencies.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="business-outline" size={64} color="rgba(0,0,0,0.05)" />
                            <Text style={styles.emptyText}>No hay agencias registradas.</Text>
                        </View>
                    ) : (
                        agencies.map(renderAgencyCard)
                    )}
                </ScrollView>
            )}

            <CreateAgencyModal 
                visible={showCreateModal} 
                onClose={() => setShowCreateModal(false)} 
                onSuccess={loadAgencies}
                initialData={editingAgency}
                currentUserEmail={user?.email || ''}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F7FCFE" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 14,
        paddingBottom: 14,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E7F0F3",
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#EAF4F6",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 15,
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
    headerSubtitle: { fontSize: 12, color: "#64748B", fontWeight: "500" },
    addBtnHeader: {
        marginLeft: "auto",
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: ACCENT,
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
    },
    scrollContent: { padding: 20 },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" },
    sectionCount: {
        fontSize: 12,
        fontWeight: "600",
        color: ACCENT,
        backgroundColor: "rgba(14, 116, 144, 0.1)",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    agencyCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        padding: 18,
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E7F0F3",
        elevation: 1,
    },
    agencyCardLogo: {
        width: 54,
        height: 54,
        borderRadius: 18,
        backgroundColor: "#F8FAFC",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 15,
        overflow: "hidden",
    },
    logoImage: { width: "100%", height: "100%" },
    agencyCardInfo: { flex: 1 },
    agencyCardName: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
    agencyCardEmail: { fontSize: 12, color: "#64748B", marginBottom: 4 },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    roleBadge: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    roleBadgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#475569",
        textTransform: "uppercase",
    },
    cardPhone: { fontSize: 11, color: "#94A3B8" },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 10 },
    iconButton: { padding: 4 },
    modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.24)" },
    modalKeyboard: { width: "100%", justifyContent: "flex-end" },
    modalContent: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: "88%",
        borderWidth: 1,
        borderColor: "#E7F0F3",
    },
    modalFormScroll: { flexGrow: 0 },
    modalFormContent: { paddingBottom: 24 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
    inputLabel: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8 },
    input: {
        backgroundColor: "#FBFEFF",
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        borderWidth: 1,
        borderColor: "#D9EAF0",
        marginBottom: 16,
        fontSize: 14,
        color: "#0F172A",
        minHeight: 50,
    },
    submitButton: {
        backgroundColor: ACCENT,
        height: 56,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    submitButtonText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
    centered: { flex: 1, alignItems: "center", justifyCenter: "center" },
    emptyContainer: { alignItems: "center", paddingVertical: 60 },
    emptyText: { marginTop: 10, color: "#94A3B8" },
    repSection: {
        backgroundColor: "rgba(14,116,144,0.08)",
        borderRadius: 20,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "rgba(14,116,144,0.2)",
    },
    repSectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
    },
    repSectionTitle: {
        fontSize: 14,
        fontWeight: "800",
        color: ACCENT,
    },
    repSectionHint: {
        fontSize: 12,
        color: "#64748B",
        marginBottom: 14,
        lineHeight: 18,
    },
    repRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    repInput: {
        flex: 1,
        marginBottom: 10,
    },
    repInputLocked: {
        backgroundColor: "#EEF6F8",
        borderColor: "rgba(14,116,144,0.35)",
        color: "#0E7490",
    },
    creatorBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: "rgba(14,116,144,0.12)",
        borderWidth: 1,
        borderColor: "rgba(14,116,144,0.3)",
        marginBottom: 10,
    },
    creatorBadgeText: {
        color: ACCENT,
        fontSize: 11,
        fontWeight: "700",
    },
    repRemoveBtn: {
        paddingBottom: 10,
        paddingLeft: 4,
    },
    repError: {
        color: "#EF4444",
        fontSize: 12,
        fontWeight: "600",
        marginBottom: 8,
    },
    addRepBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 10,
        paddingHorizontal: 4,
    },
    addRepText: {
        color: ACCENT,
        fontSize: 13,
        fontWeight: "700",
    },
});

export default AdminPanelScreen;
