import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { getAgencies, createAgency } from '../services/api';

const ACCENT = "#5B3CF0";
const COLORS = {
    bg: "#FFFFFF",
    text: "#0F172A",
    textLight: "#64748B",
    card: "#F8FAFC",
};

const CreateAgencyModal = ({ visible, onClose, onSuccess }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!name || !email) return;
        setLoading(true);
        try {
            await createAgency({ name, email, phone, logoUrl });
            onSuccess();
            onClose();
            setName(''); setEmail(''); setPhone(''); setLogoUrl('');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <BlurView intensity={20} style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Nueva Agencia</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.inputLabel}>Nombre de la Agencia</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ej. Turismo Huila" />
                        <Text style={styles.inputLabel}>Correo Electrónico</Text>
                        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="agencia@ejemplo.com" keyboardType="email-address" />
                        <Text style={styles.inputLabel}>Teléfono</Text>
                        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="300 123 4567" keyboardType="phone-pad" />
                        <Text style={styles.inputLabel}>URL del Logo</Text>
                        <TextInput style={styles.input} value={logoUrl} onChangeText={setLogoUrl} placeholder="https://..." />
                        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Crear Agencia</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </BlurView>
        </Modal>
    );
};

const AdminPanelScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [agencies, setAgencies] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);

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
                    <Text style={styles.cardPhone}>{item.phone || "Sin teléfono"}</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Centro de Control</Text>
                    <Text style={styles.headerSubtitle}>Gestión global de agencias</Text>
                </View>
                <TouchableOpacity style={styles.addBtnHeader} onPress={() => setShowCreateModal(true)}>
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
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(0,0,0,0.03)",
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F8FAFC",
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
        backgroundColor: "rgba(91, 60, 240, 0.1)",
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
    },
    agencyCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        padding: 18,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        elevation: 2,
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
    cardPhone: { fontSize: 11, color: "#94A3B8" },
    modalOverlay: { flex: 1, justifyContent: "flex-end" },
    modalContent: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: "80%",
    },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
    inputLabel: { fontSize: 13, fontWeight: "700", color: "#334155", marginBottom: 8 },
    input: {
        backgroundColor: "#F8FAFC",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        marginBottom: 20,
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
});

export default AdminPanelScreen;
