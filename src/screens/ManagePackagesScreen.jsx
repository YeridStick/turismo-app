import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    TextInput,
    StatusBar,
} from 'react-native';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { getPackages, deletePackage, getAgencyPackages } from '../services/api';
import { useRoute } from '@react-navigation/native';

const COLORS = {
    primary: '#0E7490',
    accent: '#0E7490',
    bg: '#FFFFFF',
    text: '#0F172A',
    textLight: '#64748B',
    white: '#FFFFFF',
    card: '#F8FAFC',
    border: '#E2E8F0',
};

const ManagePackagesScreen = ({ navigation }) => {
    const { user } = useAuth();
    const route = useRoute();
    const agencyId = route.params?.agencyId;
    
    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);

    const isAdmin = useMemo(() => {
        return user?.roles?.map(r => r.toLowerCase()).includes('admin');
    }, [user]);

    const loadPackages = async () => {
        setLoading(true);
        setError(null);
        try {
            let response;
            if (agencyId) {
                // Caso: Venimos de una agencia específica en el Dashboard
                response = await getAgencyPackages(agencyId);
            } else {
                // Caso: Acceso general (ej. Admin o Menú lateral)
                response = await getPackages();
            }
            
            const allPkgs = response.data?.data || response.data || [];
            
            // Si no es admin y no hay agencyId, podrías filtrar o mostrar vacío
            // Pero con los nuevos endpoints, getMyAgencies + getAgencyPackages es el flujo ideal
            setPackages(allPkgs);
        } catch (err) {
            console.error("Error loading packages:", err);
            setError("No se pudieron cargar los servicios.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPackages();
    }, []);

    const filteredPackages = packages.filter(pkg => 
        pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleDeletePackage = (id) => {
        import('react-native').then(({ Alert }) => {
            Alert.alert(
                "Eliminar Paquete",
                "¿Estás seguro que deseas eliminar este paquete turístico?",
                [
                    { text: "Cancelar", style: "cancel" },
                    { text: "Eliminar", style: "destructive", onPress: async () => {
                        setLoading(true);
                        try {
                            await deletePackage(id);
                            loadPackages();
                        } catch (err) {
                            console.error(err);
                            setLoading(false);
                        }
                    }}
                ]
            );
        });
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(value);
    };

    const renderPackageCard = (pkg) => (
        <TouchableOpacity 
            key={pkg.id} 
            style={styles.pkgCard}
            onPress={() => navigation.navigate("CreatePackage", { packageId: pkg.id })}
        >
            <View style={styles.pkgHeader}>
                <View style={styles.pkgBadge}>
                    <Text style={styles.pkgBadgeText}>{pkg.tag || "Activo"}</Text>
                </View>
                <Text style={styles.pkgPrice}>{formatCurrency(pkg.price)}</Text>
            </View>

            <View style={styles.pkgBody}>
                <Text style={styles.pkgTitle}>{pkg.title}</Text>
                <View style={styles.pkgInfoRow}>
                    <Ionicons name="location-sharp" size={14} color={COLORS.accent} />
                    <Text style={styles.pkgCity}>{pkg.city}</Text>
                    <View style={styles.dot} />
                    <Text style={styles.pkgDays}>{pkg.days} Días / {pkg.nights} Noches</Text>
                </View>

                {/* Atractivos Incluidos */}
                <View style={styles.placesContainer}>
                    <Text style={styles.placesLabel}>Atractivos vinculados:</Text>
                    <View style={styles.placesList}>
                        {pkg.places && pkg.places.length > 0 ? (
                            pkg.places.map((place, idx) => (
                                <View key={idx} style={styles.placeTag}>
                                    <Text style={styles.placeTagName}>{place.name}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.noPlacesText}>Sin lugares vinculados</Text>
                        )}
                    </View>
                </View>
            </View>

            <View style={styles.pkgFooter}>
                <View style={styles.pkgStats}>
                    <View style={styles.pkgStat}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.pkgStatText}>{pkg.rating}</Text>
                    </View>
                    <Text style={styles.pkgStatReviews}>({pkg.reviews} reseñas)</Text>
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate("CreatePackage", { packageId: pkg.id })}>
                        <MaterialIcons name="edit" size={18} color={COLORS.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeletePackage(pkg.id)}>
                        <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Gestión de Paquetes</Text>
                <TouchableOpacity style={styles.refreshBtn} onPress={loadPackages}>
                    <Ionicons name="refresh" size={20} color={COLORS.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={COLORS.textLight} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar paquete o ciudad..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholderTextColor={COLORS.textLight}
                    />
                </View>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Sincronizando servicios...</Text>
                </View>
            ) : error ? (
                <View style={styles.centered}>
                    <Ionicons name="cloud-offline-outline" size={60} color={COLORS.textLight} />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadPackages}>
                        <Text style={styles.retryBtnText}>Reintentar</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView 
                    contentContainerStyle={styles.scrollContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Catálogo Publicado</Text>
                        <Text style={styles.pkgCount}>{filteredPackages.length} Total</Text>
                    </View>

                    {filteredPackages.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <FontAwesome5 name="suitcase-rolling" size={50} color="rgba(0,0,0,0.05)" />
                            <Text style={styles.emptyText}>No se encontraron paquetes</Text>
                        </View>
                    ) : (
                        filteredPackages.map(renderPackageCard)
                    )}

                    <TouchableOpacity 
                        style={styles.addBtnFloating}
                        onPress={() => navigation.navigate("CreatePackage")}
                    >
                        <LinearGradient
                            colors={[COLORS.primary, '#14B8A6']}
                            style={styles.addBtnGrad}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="add" size={30} color="#FFF" />
                            <Text style={styles.addBtnText}>Nuevo Paquete</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.03)',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
    },
    refreshBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        paddingHorizontal: 15,
        height: 50,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: COLORS.text,
    },
    scrollContainer: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    pkgCount: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.primary,
        backgroundColor: 'rgba(14, 116, 144, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pkgCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 3,
    },
    pkgHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    pkgBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    pkgBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#10B981',
        textTransform: 'uppercase',
    },
    pkgPrice: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.primary,
    },
    pkgTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 8,
    },
    pkgInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    pkgCity: {
        fontSize: 13,
        color: COLORS.textLight,
        marginLeft: 4,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.textLight,
        marginHorizontal: 8,
    },
    pkgDays: {
        fontSize: 13,
        color: COLORS.textLight,
    },
    placesContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 12,
        marginBottom: 15,
    },
    placesLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textLight,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    placesList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    placeTag: {
        backgroundColor: COLORS.white,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    placeTagName: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.text,
    },
    noPlacesText: {
        fontSize: 11,
        fontStyle: 'italic',
        color: COLORS.textLight,
    },
    pkgFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.03)',
    },
    pkgStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pkgStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pkgStatText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.text,
    },
    pkgStatReviews: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    editBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(14, 116, 144, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addBtnFloating: {
        marginTop: 10,
        height: 60,
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 6,
    },
    addBtnGrad: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    addBtnText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFF',
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 14,
        color: COLORS.textLight,
    },
    errorText: {
        marginTop: 15,
        fontSize: 15,
        color: COLORS.textLight,
        textAlign: 'center',
    },
    retryBtn: {
        marginTop: 20,
        paddingHorizontal: 30,
        paddingVertical: 12,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
    },
    retryBtnText: {
        color: '#FFF',
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        marginTop: 15,
        fontSize: 15,
        color: COLORS.textLight,
    }
});

export default ManagePackagesScreen;
