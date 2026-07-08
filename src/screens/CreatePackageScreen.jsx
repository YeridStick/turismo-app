import { FontAwesome } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { ENDPOINTS } from "../config/api.config";
import api, { getAgencies, getPackageById, updatePackage } from "../services/api";
import { COLORS, FONT_SIZES, SPACING } from "../utils/constants";
import { PremiumModal } from "../components/ui/PremiumModal";

const ACCENT = "#0E7490";

const parseList = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const getPackageCoverImage = (pkg) =>
  pkg?.coverImageUrl ||
  pkg?.cover_image_url ||
  pkg?.coverImage ||
  pkg?.cover_image ||
  pkg?.coverUrl ||
  pkg?.cover_url ||
  pkg?.mainImageUrl ||
  pkg?.main_image_url ||
  pkg?.thumbnailUrl ||
  pkg?.thumbnail_url ||
  pkg?.bannerImageUrl ||
  pkg?.banner_image_url ||
  pkg?.imageUrl ||
  pkg?.image_url ||
  pkg?.image ||
  "";

const extractApiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (typeof data?.message === "string" && data.message.trim()) return data.message.trim();
  if (typeof data?.error === "string" && data.error.trim()) return data.error.trim();
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const first = data.errors[0];
    if (typeof first === "string" && first.trim()) return first.trim();
    if (typeof first?.message === "string" && first.message.trim()) return first.message.trim();
  }
  return fallback;
};

const CreatePackageScreen = ({ navigation }) => {
  const { roles } = useAuth();
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    city: "",
    days: "",
    nights: "",
    people: "",
    rating: "",
    reviews: "",
    originalPrice: "",
    discount: "",
    tag: "",
    includes: "",
    image: "",
  });

  const route = useRoute();
  const packageId = route.params?.packageId;
  const initialAgencyId = route.params?.agencyId ? Number(route.params.agencyId) : null;
  const isAdmin = (roles || []).map((r) => String(r).toLowerCase()).includes("admin");

  const [selectedPlaceIds, setSelectedPlaceIds] = useState([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState(initialAgencyId);
  const [agencyModalVisible, setAgencyModalVisible] = useState(false);
  const [agenciesLoader, setAgenciesLoader] = useState({
    data: [],
    loading: false,
    loaded: false,
  });
  const [loading, setLoading] = useState(false);
  const [creationCompleted, setCreationCompleted] = useState(false);
  const [modal, setModal] = useState({ visible: false, type: 'error', title: '', message: '', onConfirm: null });

  React.useEffect(() => {
    if (packageId) {
      loadExistingPackage(packageId);
    }
  }, [packageId]);

  React.useEffect(() => {
    if (!isAdmin || packageId) return;
    loadAgencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, packageId]);

  const loadExistingPackage = async (id) => {
    setLoading(true);
    try {
      const res = await getPackageById(id);
      const pkg = res.data?.data || res.data;
      if (pkg) {
        setForm({
          title: pkg.title || "",
          description: pkg.description || "",
          price: pkg.price?.toString() || "",
          city: pkg.city || "",
          days: pkg.days?.toString() || "",
          nights: pkg.nights?.toString() || "",
          people: pkg.people || "",
          rating: pkg.rating?.toString() || "",
          reviews: pkg.reviews?.toString() || "",
          originalPrice: pkg.originalPrice?.toString() || "",
          discount: pkg.discount || "",
          tag: pkg.tag || "",
          includes: pkg.includes ? pkg.includes.join(", ") : "",
          image: getPackageCoverImage(pkg),
        });
        if (pkg.places) {
          setSelectedPlaceIds(pkg.places.map((p) => p.place_id || p.id));
        }
      }
    } catch (_err) {
      setModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar la información del paquete',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAgencies = React.useCallback(async () => {
    setAgenciesLoader((prev) => ({ ...prev, loading: true }));
    try {
      const res = await getAgencies();
      const raw = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const agencies = raw
        .map((item) => ({
          id: Number(item?.id),
          name: item?.name || `Agencia ${item?.id ?? ""}`.trim(),
          email: item?.email || "",
        }))
        .filter((item) => Number.isFinite(item.id));

      setAgenciesLoader({
        data: agencies,
        loading: false,
        loaded: true,
      });

      if (initialAgencyId && agencies.some((item) => item.id === initialAgencyId)) {
        setSelectedAgencyId(initialAgencyId);
      }
    } catch (_err) {
      setAgenciesLoader({
        data: [],
        loading: false,
        loaded: true,
      });
      setModal({
        visible: true,
        type: "error",
        title: "Error",
        message: "No se pudo cargar el listado de agencias.",
      });
    }
  }, [initialAgencyId]);

  // Modal & Pagination State for Places
  const [modalVisible, setModalVisible] = useState(false);
  const [placesLoader, setPlacesLoader] = useState({
    data: [],
    page: 0,
    loading: false,
    hasMore: true,
  });

  const loadPlacesPage = async (page = 0) => {
    if (page > 0 && (!placesLoader.hasMore || placesLoader.loading)) return;
    setPlacesLoader((prev) => ({ ...prev, loading: true }));
    try {
      const size = 10;
      const res = await api.get(ENDPOINTS.PLACES_SEARCH, {
        params: { mode: "ALL", size, page },
      });
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const hasMore = data.length === size;
      setPlacesLoader((prev) => ({
        ...prev,
        data: page === 0 ? data : [...prev.data, ...data],
        page,
        hasMore,
        loading: false,
      }));
    } catch (_err) {
      setPlacesLoader((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleOpenModal = () => {
    setModalVisible(true);
    if (placesLoader.data.length === 0) {
      loadPlacesPage(0);
    }
  };

  const togglePlaceSelection = (id) => {
    setSelectedPlaceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectedAgency = agenciesLoader.data.find((item) => item.id === selectedAgencyId);

  const handleOpenAgencyModal = async () => {
    setAgencyModalVisible(true);
    if (!agenciesLoader.loaded && !agenciesLoader.loading) {
      await loadAgencies();
    }
  };

  const handleSubmit = async () => {
    if (!packageId && creationCompleted) return;

    if (
      !form.title?.trim() ||
      !form.description?.trim() ||
      !form.price ||
      !form.city?.trim() ||
      !form.days ||
      !form.nights ||
      selectedPlaceIds.length === 0
    ) {
      setModal({
        visible: true,
        type: 'warning',
        title: 'Campos requeridos',
        message: 'Asegúrate de completar el título, descripción, precio, ciudad y seleccionar al menos un lugar para lanzar el paquete.'
      });
      return;
    }
    setLoading(true);
    try {
      let createdPackage = null;
      const coverImage = form.image.trim();
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        placeIds: selectedPlaceIds,
        city: form.city.trim() || undefined,
        days: form.days ? Number(form.days) : undefined,
        nights: form.nights ? Number(form.nights) : undefined,
        people: form.people.trim() || undefined,
        rating: form.rating ? Number(form.rating) : undefined,
        reviews: form.reviews ? Number(form.reviews) : undefined,
        originalPrice: form.originalPrice ? Number(form.originalPrice) : undefined,
        discount: form.discount.trim() || undefined,
        tag: form.tag.trim() || undefined,
        includes: form.includes ? parseList(form.includes) : undefined,
        image: coverImage || undefined,
        imageUrl: coverImage || undefined,
        coverImageUrl: coverImage || undefined,
      };

      if (packageId) {
        await updatePackage(packageId, payload);
      } else {
        if (isAdmin && selectedAgencyId) {
          payload.agencyId = selectedAgencyId;
        }
        const createRes = await api.post(ENDPOINTS.PACKAGES, payload);
        createdPackage = createRes?.data?.data || createRes?.data || null;
      }

      const packageForList = !packageId
        ? {
            ...(createdPackage && typeof createdPackage === "object" ? createdPackage : {}),
            ...payload,
            id: createdPackage?.id || createdPackage?.package_id || `tmp-${Date.now()}`,
            placeIds: selectedPlaceIds,
            places: Array.isArray(createdPackage?.places) ? createdPackage.places : [],
          }
        : null;

      if (!packageId) {
        setCreationCompleted(true);
        const returnParams = {
          agencyId: initialAgencyId || undefined,
          createdPackage: packageForList,
          createdPackageKey: Date.now(),
        };

        if (typeof navigation?.popTo === "function") {
          navigation.popTo("ManagePackages", returnParams);
        } else {
          navigation.navigate({
            name: "ManagePackages",
            params: returnParams,
            merge: true,
          });
          navigation.goBack?.();
        }
        return;
      }

      setModal({
        visible: true,
        type: 'success',
        title: packageId ? '¡Paquete Actualizado!' : '¡Paquete Lanzado!',
        message: packageId ? 'Los cambios han sido guardados.' : 'Tu nuevo paquete turístico ha sido creado correctamente.',
        onConfirm: () => {
          setModal((prev) => ({ ...prev, visible: false }));
        },
      });
    } catch (err) {
      const status = err?.response?.status;
      let fallback = "No pudimos registrar el paquete en este momento. Revisa los datos e intenta de nuevo.";
      if (status === 400) {
        fallback = "Solicitud invalida. Verifica que no envies agencyId y agencyEmail al mismo tiempo.";
      } else if (status === 404) {
        fallback = "La agencia seleccionada no existe o no esta disponible.";
      } else if (status === 409) {
        fallback = "Hay placeIds que no existen. Revisa los lugares seleccionados.";
      }
      setModal({
        visible: true,
        type: 'error',
        title: 'Error al crear',
        message: extractApiErrorMessage(err, fallback),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <FontAwesome name="chevron-left" size={16} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{packageId ? 'Editar Paquete' : 'Nuevo Paquete'}</Text>
          <Text style={styles.subtitle}>{packageId ? 'Modifica tu experiencia' : 'Diseña una experiencia única'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {isAdmin && !packageId && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome name="building" size={18} color={ACCENT} />
              <Text style={styles.cardTitle}>Agencia del paquete</Text>
            </View>
            <Text style={styles.sectionLabel}>Asignacion de agencia (solo admin)</Text>
            <TouchableOpacity style={styles.selectorButton} onPress={handleOpenAgencyModal}>
              <Text style={styles.selectorText}>
                {selectedAgency
                  ? `${selectedAgency.name}${selectedAgency.email ? ` (${selectedAgency.email})` : ""}`
                  : "Usar agencia asociada a mi usuario"}
              </Text>
              <FontAwesome name="chevron-down" size={14} color={ACCENT} />
            </TouchableOpacity>
            {!!selectedAgencyId && (
              <TouchableOpacity onPress={() => setSelectedAgencyId(null)} style={styles.clearAgencyButton}>
                <Text style={styles.clearAgencyText}>Quitar seleccion y usar mi agencia por defecto</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* CARD 1: INFORMACION BASE */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="cube" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Información Base</Text>
          </View>
          <Text style={styles.sectionLabel}>Titulo</Text>
          <TextInput
            style={styles.input}
            value={form.title}
            onChangeText={(value) => updateField("title", value)}
            placeholder="Aventura Completa"
            placeholderTextColor={COLORS.textLight}
          />

          <Text style={styles.sectionLabel}>Descripcion</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(value) => updateField("description", value)}
            placeholder="Descripcion corta..."
            placeholderTextColor={COLORS.textLight}
            multiline
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Precio (COP)</Text>
              <TextInput
                style={styles.input}
                value={form.price}
                onChangeText={(value) => updateField("price", value)}
                placeholder="1890000"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Precio original (Opcional)</Text>
              <TextInput
                style={styles.input}
                value={form.originalPrice}
                onChangeText={(value) => updateField("originalPrice", value)}
                placeholder="2500000"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>
        </View>

        {/* CARD 2: ITINERARIO Y CAPACIDAD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="calendar" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Itinerario</Text>
          </View>

          <Text style={styles.sectionLabel}>Lugares incluidos ({selectedPlaceIds.length} seleccionados)</Text>
          <TouchableOpacity style={styles.selectorButton} onPress={handleOpenModal}>
            <Text style={styles.selectorText}>
              {selectedPlaceIds.length > 0 ? "Modificar lugares seleccionados" : "Seleccionar lugares..."}
            </Text>
            <FontAwesome name="check-square-o" size={18} color={ACCENT} />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Dias</Text>
              <TextInput
                style={styles.input}
                value={form.days}
                onChangeText={(value) => updateField("days", value)}
                placeholder="5"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Noches</Text>
              <TextInput
                style={styles.input}
                value={form.nights}
                onChangeText={(value) => updateField("nights", value)}
                placeholder="4"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Ciudad</Text>
          <TextInput
            style={styles.input}
            value={form.city}
            onChangeText={(value) => updateField("city", value)}
            placeholder="Tatacoa / San Agustin"
            placeholderTextColor={COLORS.textLight}
          />

          <Text style={styles.sectionLabel}>Capacidad</Text>
          <TextInput
            style={styles.input}
            value={form.people}
            onChangeText={(value) => updateField("people", value)}
            placeholder="Ej. Hasta 8 personas"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        {/* CARD 3: EXTRA DETAILS */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="star" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Detalles Extra</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Rating Inicial</Text>
              <TextInput
                style={styles.input}
                value={form.rating}
                onChangeText={(value) => updateField("rating", value)}
                placeholder="4.9"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Modificador de Reviews</Text>
              <TextInput
                style={styles.input}
                value={form.reviews}
                onChangeText={(value) => updateField("reviews", value)}
                placeholder="342"
                keyboardType="numeric"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Descuento Texto</Text>
              <TextInput
                style={styles.input}
                value={form.discount}
                onChangeText={(value) => updateField("discount", value)}
                placeholder="-24%"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Etiqueta Superior</Text>
              <TextInput
                style={styles.input}
                value={form.tag}
                onChangeText={(value) => updateField("tag", value)}
                placeholder="Destacado"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Incluye (separado por comas)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { minHeight: 70 }]}
            value={form.includes}
            onChangeText={(value) => updateField("includes", value)}
            placeholder="Transporte, Guia, Seguro"
            placeholderTextColor={COLORS.textLight}
            multiline
          />

          <Text style={styles.sectionLabel}>Imagen de portada (URL)</Text>
          <TextInput
            style={styles.input}
            value={form.image}
            onChangeText={(value) => updateField("image", value)}
            placeholder="https://..."
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (loading || (!packageId && creationCompleted)) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading || (!packageId && creationCompleted)}
          activeOpacity={0.8}
        >
          <Text style={styles.submitText}>
            {loading ? "Guardando..." : packageId ? "Guardar Cambios" : "Lanzar Paquete"}
          </Text>
          {!loading && <FontAwesome name={packageId ? "save" : "rocket"} size={18} color={COLORS.white} style={{ marginLeft: 8 }} />}
        </TouchableOpacity>

        {/* Espacio extra al fondo para el teclado */}
        <View style={{ height: 120 }} />
      </ScrollView>

      <PremiumModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm || (() => setModal(prev => ({ ...prev, visible: false })))}
        onClose={() => setModal(prev => ({ ...prev, visible: false }))}
      />

      <Modal
        visible={agencyModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAgencyModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar agencia</Text>
            <TouchableOpacity onPress={() => setAgencyModalVisible(false)}>
              <FontAwesome name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={agenciesLoader.data}
            keyExtractor={(item) => `agency-opt-${item.id}`}
            contentContainerStyle={styles.modalList}
            ListHeaderComponent={
              <TouchableOpacity
                style={[styles.modalItem, !selectedAgencyId && styles.modalItemSelected]}
                onPress={() => setSelectedAgencyId(null)}
                activeOpacity={0.7}
              >
                <View style={styles.modalItemInfo}>
                  <Text style={styles.modalItemTitle}>Agencia por defecto (mi usuario)</Text>
                  <Text style={styles.modalItemSub}>El backend usa la agencia asociada a tu cuenta.</Text>
                </View>
                <FontAwesome
                  name={!selectedAgencyId ? "check-circle" : "circle-thin"}
                  size={24}
                  color={!selectedAgencyId ? ACCENT : COLORS.border}
                />
              </TouchableOpacity>
            }
            renderItem={({ item }) => {
              const isSelected = selectedAgencyId === item.id;
              return (
                <TouchableOpacity
                  style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                  onPress={() => setSelectedAgencyId(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemTitle}>{item.name}</Text>
                    <Text style={styles.modalItemSub}>{item.email || "Sin email"}</Text>
                  </View>
                  <FontAwesome
                    name={isSelected ? "check-circle" : "circle-thin"}
                    size={24}
                    color={isSelected ? ACCENT : COLORS.border}
                  />
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              agenciesLoader.loading ? (
                <ActivityIndicator style={{ marginTop: 36 }} color={ACCENT} />
              ) : (
                <Text style={styles.emptySelectorText}>No hay agencias disponibles.</Text>
              )
            }
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalDoneButton} onPress={() => setAgencyModalVisible(false)}>
              <Text style={styles.submitText}>Confirmar agencia</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PLACES MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Seleccionar lugares</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <FontAwesome name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={placesLoader.data}
            keyExtractor={(item, idx) => `modal-place-${item.place_id || item.id}-${idx}`}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => {
              const id = item.place_id || item.id;
              const isSelected = selectedPlaceIds.includes(id);
              return (
                <TouchableOpacity
                  style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                  onPress={() => togglePlaceSelection(id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemTitle}>{item.name}</Text>
                    <Text style={styles.modalItemSub}>{item.address || "Sin dirección"}</Text>
                  </View>
                  <FontAwesome
                    name={isSelected ? "check-circle" : "circle-thin"}
                    size={24}
                    color={isSelected ? ACCENT : COLORS.border}
                  />
                </TouchableOpacity>
              );
            }}
            onEndReached={() => loadPlacesPage(placesLoader.page + 1)}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() =>
              placesLoader.loading ? (
                <ActivityIndicator style={{ marginVertical: SPACING.md }} color={ACCENT} />
              ) : null
            }
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalDoneButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.submitText}>Confirmar Selección ({selectedPlaceIds.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl * 1.5,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    backgroundColor: "#F4F6F9",
    borderRadius: 20,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "700",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  cardTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    color: COLORS.text,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#F9FAFf",
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: "#E5E9F2",
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  col: {
    flex: 1,
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(14, 116, 144, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(14, 116, 144, 0.22)",
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
  },
  selectorText: {
    fontSize: FONT_SIZES.sm,
    color: ACCENT,
    fontWeight: "600",
  },
  clearAgencyButton: {
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
  },
  clearAgencyText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textDecorationLine: "underline",
  },
  submitButton: {
    marginTop: SPACING.sm,
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  // MODAL STYLES
  modalContainer: {
    flex: 1,
    backgroundColor: "#F4F6F9",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalList: {
    padding: SPACING.md,
  },
  emptySelectorText: {
    textAlign: "center",
    color: COLORS.textLight,
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.sm,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalItemSelected: {
    borderColor: ACCENT,
    backgroundColor: "rgba(14, 116, 144, 0.05)",
  },
  modalItemInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  modalItemTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalItemSub: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 4,
  },
  modalFooter: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalDoneButton: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
  },
});

export default CreatePackageScreen;
