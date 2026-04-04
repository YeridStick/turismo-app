import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { ENDPOINTS } from "../config/api.config";
import { useAuth } from "../context/AuthContext";
import api, { createAgency, getAgencies, getAgencyByEmail, getPackages } from "../services/api";
import { COLORS, FONT_SIZES, SPACING } from "../utils/constants";
import { RefreshControl } from "react-native";

const { width } = Dimensions.get("window");
const ACCENT = "#5B3CF0";

// --- Sub-componente: Modal de Creación de Agencia ---
const CreateAgencyModal = ({ visible, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "",
        description: "",
        phone: "",
        email: "",
        website: "",
        logoUrl: "https://i.pinimg.com/originals/68/1e/ca/681eca13696a2d964975dc49a7506a4b.png",
    });

    const handleSubmit = async () => {
        if (!form.name || !form.email) {
            Alert.alert("Error", "El nombre y el email son obligatorios.");
            return;
        }
        setLoading(true);
        try {
            await createAgency(form);
            Alert.alert("Éxito", "Agencia creada correctamente.");
            onSuccess();
            onClose();
            setForm({ name: "", description: "", phone: "", email: "", website: "", logoUrl: "https://i.pinimg.com/originals/68/1e/ca/681eca13696a2d964975dc49a7506a4b.png" });
        } catch (error) {
            Alert.alert("Error", "No se pudo crear la agencia.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} />
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Nueva Agencia</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.text} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.inputLabel}>Nombre de la Agencia</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ej. Turismo Huila"
                            value={form.name}
                            onChangeText={(t) => setForm({ ...form, name: t })}
                        />
                        <Text style={styles.inputLabel}>Descripción breve</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            placeholder="Describe tu agencia..."
                            multiline
                            value={form.description}
                            onChangeText={(t) => setForm({ ...form, description: t })}
                        />
                        <View style={{ flexDirection: "row", gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>Teléfono</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="314..."
                                    keyboardType="phone-pad"
                                    value={form.phone}
                                    onChangeText={(t) => setForm({ ...form, phone: t })}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>E-mail</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="agencia@mail.com"
                                    keyboardType="email-address"
                                    value={form.email}
                                    onChangeText={(t) => setForm({ ...form, email: t })}
                                />
                            </View>
                        </View>
                        <Text style={styles.inputLabel}>Sitio Web (Opcional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="https://..."
                            value={form.website}
                            onChangeText={(t) => setForm({ ...form, website: t })}
                        />
                        <TouchableOpacity 
                            style={[styles.submitButton, loading && { opacity: 0.7 }]} 
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitButtonText}>Crear Agencia</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const formatCurrency = (value) => {
    if (value == null || Number.isNaN(Number(value))) return "$ 0";
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0,
    }).format(Number(value));
};

const AgencyDashboardScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // Estados para Admin
    const [agencies, setAgencies] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // Estados para Agency/Owner
    const [agency, setAgency] = useState(null);
    const [dashboard, setDashboard] = useState(null);

    const isAdmin = useMemo(() => {
        return user?.roles?.map(r => r.toLowerCase()).includes('admin');
    }, [user]);

    const loadData = async () => {
        if (!user?.email) return;
        setLoading(true);
        setError("");
        try {
            // 1. Siempre intentamos validar el correo contra una agencia
            const agencyResp = await getAgencyByEmail(user.email);
            const myAgency = agencyResp.data?.data || null;
            setAgency(myAgency);

            if (myAgency) {
                const now = new Date();
                const from = new Date(now);
                from.setDate(now.getDate() - 30);
                
                // 2. Cargar dashboard de estadísticas
                const dResp = await api.get(ENDPOINTS.AGENCY_DASHBOARD, {
                    params: {
                        email: user.email,
                        userEmail: user.email,
                        from: from.toISOString().slice(0, 10),
                        to: now.toISOString().slice(0, 10),
                    },
                });
                
                let dData = dResp.data?.data || dResp.data || null;

                // FALLBACK DE ORO: Si el dashboard no trae paquetes, los buscamos en el catálogo general
                if (!dData?.packages || dData.packages.length === 0) {
                    try {
                        const allPkgsResp = await getPackages();
                        const allPkgs = allPkgsResp.data?.data || [];
                        const myPkgs = allPkgs.filter(p => 
                            p.agencyId === myAgency.id || 
                            String(p.agencyName).toLowerCase() === String(myAgency.name).toLowerCase()
                        );
                        
                        if (!dData) dData = { packages: [], salesSummary: { totalSold: 0, totalRevenue: 0 } };
                        dData.packages = myPkgs;
                    } catch (pkgErr) {
                        console.error("Error in fallback package load:", pkgErr);
                    }
                }
                
                setDashboard(dData);
            }

            // 3. Si eres ADMIN, cargar además la lista global de agencias
            if (isAdmin) {
                const response = await getAgencies();
                setAgencies(response.data?.data || []);
            }
        } catch (err) {
            console.error("Error loading dashboard data:", err);
            setError("No pudimos conectar con los servicios centrales.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user?.email, isAdmin]);

    const topPackages = dashboard?.topPackages || [];
    const topPlaces = dashboard?.topPlaces || [];
    const maxSold = Math.max(1, ...topPackages.map((item) => item.sold || 0));
    const maxVisits = Math.max(1, ...topPlaces.map((item) => item.visits || 0));

    const renderAgencyCard = (item) => (
        <TouchableOpacity key={item.id} style={styles.agencyCard}>
            <View style={styles.agencyCardLogo}>
                {item.logoUrl ? (
                    <Image source={{ uri: item.logoUrl }} style={styles.logoImage} />
                ) : (
                    <FontAwesome name="building" size={24} color={ACCENT} />
                )}
            </View>
            <View style={styles.agencyCardInfo}>
                <Text style={styles.agencyCardName}>{item.name}</Text>
                <Text style={styles.agencyCardEmail} numberOfLines={1}>{item.email}</Text>
                <View style={styles.badgeRow}>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>Agencia</Text>
                    </View>
                    {item.phone && <Text style={styles.cardPhone}>{item.phone}</Text>}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header Branded */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Mi Panel</Text>
                    <Text style={styles.headerSubtitle}>Estadísticas de impacto</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator color={ACCENT} size="large" />
                    <Text style={styles.loadingText}>Sincronizando con el servidor...</Text>
                </View>
            ) : (
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={loadData} colors={[ACCENT]} />
                    }
                >
                    
                    {/* SECCIÓN MI AGENCIA: Visible si el usuario tiene una agencia vinculada */}
                    {agency ? (
                        <>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Impacto de {agency.name}</Text>
                            </View>
                            
                            <LinearGradient
                                colors={[ACCENT, "#7B5BFF"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.heroCard}
                            >
                                <View style={styles.heroLogoWrap}>
                                    {agency.logoUrl ? (
                                        <Image source={{ uri: agency.logoUrl }} style={styles.heroLogo} />
                                    ) : (
                                        <FontAwesome name="briefcase" size={32} color="rgba(255,255,255,0.3)" />
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.heroPretitle}>MI AGENCIA</Text>
                                    <Text style={styles.heroTitle} numberOfLines={1}>{agency.name}</Text>
                                    <View style={styles.heroRow}>
                                        <Ionicons name="mail-outline" size={12} color="rgba(255,255,255,0.7)" />
                                        <Text style={styles.heroDetail} numberOfLines={1}>{agency.email}</Text>
                                    </View>
                                </View>
                            </LinearGradient>

                            {/* Estadísticas Reales */}
                            <View style={styles.statsGrid}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Ventas del Mes</Text>
                                    <Text style={styles.statValue}>{dashboard?.salesSummary?.totalSold || 0}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Ingresos BR</Text>
                                    <Text style={styles.statValue}>{formatCurrency(dashboard?.salesSummary?.totalRevenue)}</Text>
                                </View>
                            </View>

                            {/* Rankings Reales */}
                            {topPackages.length > 0 && (
                                <View style={styles.cardRank}>
                                    <View style={styles.cardHeaderRank}>
                                        <FontAwesome name="star" size={16} color="#F39C12" />
                                        <Text style={styles.rankTitle}>Misión Cumplida (Tops)</Text>
                                    </View>
                                    {topPackages.map((item, i) => (
                                        <View key={`pkg-${item.packageId}`} style={styles.barRow}>
                                            <Text style={styles.barRank}>{i + 1}</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.barLabel} numberOfLines={1}>{item.title}</Text>
                                                <View style={styles.barTrack}>
                                                    <View style={[styles.barFill, { width: `${((item.sold || 0) / maxSold) * 100}%` }]} />
                                                </View>
                                            </View>
                                            <Text style={styles.barValue}>{item.sold || 0}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                            
                            {/* Catálogo Activo -> Ahora Gestión de Paquetes y Servicios */}
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Paquetes y Servicios</Text>
                                <TouchableOpacity 
                                    style={styles.addPackageBtn} 
                                    onPress={() => navigation.navigate("ManagePackages")}
                                >
                                    <Ionicons name="settings-outline" size={18} color={ACCENT} />
                                    <Text style={styles.addPackageText}>Gestionar</Text>
                                </TouchableOpacity>
                            </View>

                            {(dashboard?.packages || []).length === 0 ? (
                                <Text style={styles.emptyTextCatalog}>Aún no has publicado paquetes.</Text>
                            ) : (
                                dashboard.packages.slice(0, 3).map((pkg) => (
                                    <View key={`pkg-real-${pkg.id}`} style={styles.packageItemCard}>
                                        <View style={styles.packageIcon}>
                                            <FontAwesome name="suitcase" size={18} color={ACCENT} />
                                        </View>
                                        <View style={styles.packageInfo}>
                                            <Text style={styles.packageTitleLine} numberOfLines={1}>{pkg.title}</Text>
                                            <Text style={styles.packageSubtitleLine}>{pkg.city} • {pkg.days} días</Text>
                                        </View>
                                        <Text style={styles.packagePriceLine}>{formatCurrency(pkg.price)}</Text>
                                    </View>
                                ))
                            )}
                            
                            {dashboard?.packages?.length > 3 && (
                                <TouchableOpacity 
                                    style={styles.viewMoreBtn}
                                    onPress={() => navigation.navigate("ManagePackages")}
                                >
                                    <Text style={styles.viewMoreText}>Ver todos los paquetes ({dashboard.packages.length})</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="alert-circle-outline" size={64} color="rgba(0,0,0,0.05)" />
                            <Text style={styles.emptyText}>No tienes una agencia vinculada aún.</Text>
                            <Text style={styles.emptySubtext}>Contacta con el Administrador para registrar tu agencia.</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            <CreateAgencyModal 
                visible={showCreateModal} 
                onClose={() => setShowCreateModal(false)} 
                onSuccess={loadData}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF", // Fondo blanco puro para estética cristal
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: SPACING.lg,
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
    headerTitle: {
        fontSize: FONT_SIZES.xl,
        fontWeight: "800",
        color: "#0F172A",
    },
    headerSubtitle: {
        fontSize: FONT_SIZES.xs,
        color: "#64748B",
        fontWeight: "500",
    },
    addBtnHeader: {
        marginLeft: "auto",
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: ACCENT,
        alignItems: "center",
        justifyContent: "center",
        elevation: 4,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: 40,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1E293B",
    },
    sectionCount: {
        fontSize: 12,
        fontWeight: "600",
        color: ACCENT,
        backgroundColor: "rgba(91, 60, 240, 0.1)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    agencyCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        padding: 16,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    agencyCardLogo: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: "#F8FAFC",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 15,
        overflow: "hidden",
    },
    logoImage: {
        width: "100%",
        height: "100%",
    },
    agencyCardInfo: {
        flex: 1,
    },
    agencyCardName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        marginBottom: 2,
    },
    agencyCardEmail: {
        fontSize: 12,
        color: "#64748B",
        marginBottom: 8,
    },
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
    cardPhone: {
        fontSize: 11,
        color: "#94A3B8",
    },
    heroCard: {
        borderRadius: 32,
        padding: 24,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
        elevation: 8,
    },
    heroPretitle: {
        fontSize: 10,
        fontWeight: "800",
        color: "rgba(255,255,255,0.6)",
        letterSpacing: 1,
    },
    heroTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#FFF",
        marginVertical: 4,
    },
    heroRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    heroDetail: {
        fontSize: 12,
        color: "rgba(255,255,255,0.9)",
    },
    heroLogoWrap: {
        width: 60,
        height: 60,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 16,
        overflow: "hidden",
    },
    heroLogo: {
        width: "100%",
        height: "100%",
    },
    heroIconWrap: {
        opacity: 0.2,
    },
    divider: {
        height: 1,
        backgroundColor: "rgba(0,0,0,0.05)",
        marginVertical: 20,
    },
    statsGrid: {
        flexDirection: "row",
        gap: 15,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        backgroundColor: "#FFF",
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        elevation: 2,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#64748B",
        marginBottom: 5,
    },
    statValue: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0F172A",
    },
    actionBtn: {
        height: 60,
        borderRadius: 20,
        overflow: "hidden",
        elevation: 4,
    },
    actionBtnGrad: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
    },
    actionBtnText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "700",
    },
    modalOverlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFF",
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
        maxHeight: "85%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#0F172A",
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: "700",
        color: "#334155",
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: "#F8FAFC",
        borderRadius: 16,
        padding: 16,
        fontSize: 14,
        color: "#0F172A",
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
        marginTop: 10,
    },
    submitButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "700",
    },
    centered: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 12,
        color: "#64748B",
    },
    cardRank: {
        backgroundColor: "#FFF",
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        marginBottom: 24,
    },
    cardHeaderRank: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 16,
    },
    rankTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1E293B",
    },
    barRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    barRank: {
        width: 20,
        fontSize: 12,
        fontWeight: "700",
        color: "#94A3B8",
    },
    barLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 4,
    },
    barTrack: {
        height: 6,
        backgroundColor: "#F1F5F9",
        borderRadius: 3,
        overflow: "hidden",
    },
    barFill: {
        height: "100%",
        backgroundColor: ACCENT,
        borderRadius: 3,
    },
    barValue: {
        marginLeft: 10,
        fontSize: 12,
        fontWeight: "700",
        color: "#1E293B",
    },
    addPackageBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(91, 60, 240, 0.1)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4,
    },
    addPackageText: {
        fontSize: 12,
        fontWeight: "700",
        color: ACCENT,
    },
    emptyTextCatalog: {
        fontSize: 14,
        color: "#94A3B8",
        textAlign: "center",
        paddingVertical: 20,
    },
    packageItemCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        padding: 14,
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    packageIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(91, 60, 240, 0.05)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    packageInfo: {
        flex: 1,
    },
    packageTitleLine: {
        fontSize: 14,
        fontWeight: "700",
        color: "#0F172A",
    },
    packageSubtitleLine: {
        fontSize: 11,
        color: "#64748B",
    },
    packagePriceLine: {
        fontSize: 14,
        fontWeight: "800",
        color: ACCENT,
    },
    viewMoreBtn: {
        alignItems: "center",
        paddingVertical: 12,
        marginTop: 5,
    },
    viewMoreText: {
        fontSize: 14,
        fontWeight: "700",
        color: ACCENT,
        textDecorationLine: "underline",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 50,
    },
    emptyText: {
        marginTop: 10,
        fontSize: 14,
        color: "#94A3B8",
    }
});

export default AgencyDashboardScreen;
