import { FontAwesome } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import WebViewMap from "../components/WebViewMap";
import { ENDPOINTS } from "../config/api.config";
import api from "../services/api";
import { COLORS, FONT_SIZES, SPACING } from "../utils/constants";

const ACCENT = "#5B3CF0";
const MAX_GEOCODE_LIMIT = 100;
const COOLDOWN_MS = 3000;
const FALLBACK_CENTER = { latitude: 2.9386, longitude: -75.2811 };

const parseList = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const CreatePlaceScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    name: "",
    description: "",
    categoryId: "",
    lat: "",
    lng: "",
    address: "",
    phone: "",
    website: "",
    imageUrls: "",
    model3dUrls: "",
  });
  const [loading, setLoading] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeCooldown, setGeocodeCooldown] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const response = await api.get(ENDPOINTS.CATEGORIES);
        const payload = response.data?.data || response.data;
        setCategories(Array.isArray(payload) ? payload : []);
      } catch (err) {
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  const selectedCoords = useMemo(() => {
    const lat = Number(form.lat);
    const lng = Number(form.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { latitude: lat, longitude: lng };
  }, [form.lat, form.lng]);

  const mapRegion = useMemo(() => {
    if (selectedCoords) {
      return {
        latitude: selectedCoords.latitude,
        longitude: selectedCoords.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }
    if (geocodeResults.length > 0) {
      return {
        latitude: geocodeResults[0].lat,
        longitude: geocodeResults[0].lon,
        latitudeDelta: 0.2,
        longitudeDelta: 0.2,
      };
    }
    return {
      latitude: FALLBACK_CENTER.latitude,
      longitude: FALLBACK_CENTER.longitude,
      latitudeDelta: 1.6,
      longitudeDelta: 1.6,
    };
  }, [geocodeResults, selectedCoords]);

  const markers = useMemo(() => {
    const list = geocodeResults.map((item, index) => ({
      latitude: item.lat,
      longitude: item.lon,
      title: `Opcion ${index + 1}`,
      description: item.formatted || "Resultado de geocodificacion",
    }));
    if (selectedCoords) {
      list.push({
        latitude: selectedCoords.latitude,
        longitude: selectedCoords.longitude,
        title: "Seleccion actual",
        description: form.address || "Coordenadas elegidas",
      });
    }
    return list;
  }, [geocodeResults, selectedCoords, form.address]);

  const selectedCategory = useMemo(() => {
    return categories.find((item) => String(item.id) === String(form.categoryId));
  }, [categories, form.categoryId]);

  const handleGeocode = async () => {
    const address = form.address.trim();
    if (!address) {
      Alert.alert("Direccion requerida", "Ingresa una direccion para geocodificar.");
      return;
    }
    if (geocodeCooldown || geocodeLoading) return;
    setGeocodeLoading(true);
    try {
      const response = await api.post(ENDPOINTS.GEOCODE, {
        address,
        limit: MAX_GEOCODE_LIMIT,
      });
      const payload = response.data?.data || response.data;
      setGeocodeResults(Array.isArray(payload) ? payload : []);
      if (!Array.isArray(payload) || payload.length === 0) {
        Alert.alert("Sin resultados", "No se encontraron coordenadas para esa direccion.");
      }
    } catch (err) {
      Alert.alert("Error", "No se pudo geocodificar la direccion.");
    } finally {
      setGeocodeLoading(false);
      setGeocodeCooldown(true);
      setTimeout(() => setGeocodeCooldown(false), COOLDOWN_MS);
    }
  };

  const handleSelectResult = (item) => {
    updateField("lat", String(item.lat));
    updateField("lng", String(item.lon));
    if (item.formatted) {
      updateField("address", item.formatted);
    }
  };

  const handleMapPress = (coords) => {
    if (!manualMode) return;
    updateField("lat", coords.latitude.toFixed(6));
    updateField("lng", coords.longitude.toFixed(6));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.description || !form.categoryId || !form.lat || !form.lng) {
      Alert.alert("Campos requeridos", "Completa nombre, descripcion, categoria y coordenadas.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        categoryId: Number(form.categoryId),
        lat: Number(form.lat),
        lng: Number(form.lng),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        website: form.website.trim() || undefined,
        imageUrls: form.imageUrls ? parseList(form.imageUrls) : undefined,
        model3dUrls: form.model3dUrls ? parseList(form.model3dUrls) : undefined,
      };

      await api.post(ENDPOINTS.PLACES_CREATE, payload);
      Alert.alert("Listo", "Lugar creado correctamente.");
      setForm({
        name: "",
        description: "",
        categoryId: "",
        lat: "",
        lng: "",
        address: "",
        phone: "",
        website: "",
        imageUrls: "",
        model3dUrls: "",
      });
    } catch (err) {
      Alert.alert("Error", "No se pudo crear el lugar. Revisa los datos e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <FontAwesome name="chevron-left" size={16} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Nuevo Lugar Mágico</Text>
          <Text style={styles.subtitle}>Completa los detalles para agregarlo</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* INFO GENERAL CARD */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="info-circle" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Información General</Text>
          </View>

          <Text style={styles.sectionLabel}>Nombre</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(value) => updateField("name", value)}
            placeholder="Ej. Mirador El Cielo"
            placeholderTextColor={COLORS.textLight}
          />

          <Text style={styles.sectionLabel}>Descripción</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(value) => updateField("description", value)}
            placeholder="¿Qué hace especial a este lugar?"
            placeholderTextColor={COLORS.textLight}
            multiline
          />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Categoría</Text>
              {categoriesLoading ? (
                <View style={[styles.input, styles.selectInput]}>
                  <Text style={styles.selectPlaceholder}>Cargando...</Text>
                </View>
              ) : categories.length > 0 ? (
                <View style={{ zIndex: 10 }}>
                  <TouchableOpacity
                    style={[styles.input, styles.selectInput]}
                    onPress={() => setCategoriesOpen((prev) => !prev)}
                  >
                    <Text style={styles.selectText} numberOfLines={1}>
                      {selectedCategory?.name || "Seleccionar"}
                    </Text>
                    <FontAwesome
                      name={categoriesOpen ? "chevron-up" : "chevron-down"}
                      size={12}
                      color={COLORS.textLight}
                    />
                  </TouchableOpacity>
                  {categoriesOpen ? (
                    <View style={styles.dropdown}>
                      <ScrollView
                        style={styles.dropdownScroll}
                        contentContainerStyle={styles.dropdownContent}
                        nestedScrollEnabled
                      >
                        {categories.map((item) => (
                          <TouchableOpacity
                            key={`cat-${item.id}`}
                            style={styles.dropdownItem}
                            onPress={() => {
                              updateField("categoryId", String(item.id));
                              setCategoriesOpen(false);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>{item.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  value={form.categoryId}
                  onChangeText={(value) => updateField("categoryId", value)}
                  placeholder="ID categoría"
                  keyboardType="numeric"
                />
              )}
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(value) => updateField("phone", value)}
                placeholder="+57 300..."
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>
          <Text style={styles.sectionLabel}>Sitio web (Opcional)</Text>
          <TextInput
            style={styles.input}
            value={form.website}
            onChangeText={(value) => updateField("website", value)}
            placeholder="https://tulugar.com"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
          />
        </View>

        {/* LOCATION CARD */}
        <View style={[styles.card, { zIndex: -1 }]}>
          <View style={styles.cardHeader}>
            <FontAwesome name="map-marker" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Ubicación</Text>
          </View>

          <Text style={styles.sectionLabel}>Dirección</Text>
          <View style={styles.geocodeRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={form.address}
              onChangeText={(value) => updateField("address", value)}
              placeholder="Ej. Cra. 43 #8-31"
              placeholderTextColor={COLORS.textLight}
            />
            <TouchableOpacity
              style={[
                styles.iconButton,
                (geocodeLoading || geocodeCooldown) && styles.buttonDisabled,
              ]}
              onPress={handleGeocode}
              disabled={geocodeLoading || geocodeCooldown}
            >
              <FontAwesome name="search" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {geocodeResults.length > 0 && (
            <View style={styles.resultsWrapper}>
              <Text style={styles.resultsTitle}>Sugerencias encontradas:</Text>
              {geocodeResults.map((item, index) => (
                <TouchableOpacity
                  key={`${item.lat}-${item.lon}-${index}`}
                  style={styles.resultItem}
                  onPress={() => handleSelectResult(item)}
                >
                  <FontAwesome name="map-pin" size={12} color={ACCENT} style={{ marginTop: 4, marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultText} numberOfLines={2}>
                      {item.formatted}
                    </Text>
                    <Text style={styles.resultCoords}>
                      {item.lat.toFixed(6)}, {item.lon.toFixed(6)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Latitud</Text>
              <TextInput
                style={styles.input}
                value={form.lat}
                onChangeText={(value) => updateField("lat", value)}
                placeholder="6.25184"
                keyboardType="numeric"
                editable={manualMode}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.sectionLabel}>Longitud</Text>
              <TextInput
                style={styles.input}
                value={form.lng}
                onChangeText={(value) => updateField("lng", value)}
                placeholder="-75.56359"
                keyboardType="numeric"
                editable={manualMode}
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>

          <View style={styles.mapActionsHeader}>
            <Text style={styles.sectionLabel}>Mapa de confirmación</Text>
            <TouchableOpacity
              style={styles.manualModeToggle}
              onPress={() => setManualMode((prev) => !prev)}
            >
              <FontAwesome name={manualMode ? "toggle-on" : "toggle-off"} size={18} color={manualMode ? ACCENT : COLORS.textLight} />
              <Text style={[styles.manualModeText, manualMode && { color: ACCENT, fontWeight: "600" }]}>
                Modo Manual
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.mapWrapper, manualMode && styles.mapWrapperActive]}>
            <WebViewMap
              initialRegion={mapRegion}
              markers={markers}
              userLocation={selectedCoords || mapRegion}
              onMapPress={handleMapPress}
            />
            {manualMode && (
              <View style={styles.mapOverlay}>
                <Text style={styles.mapOverlayText}>Toca cualquier zona para marcar Puntero</Text>
              </View>
            )}
          </View>
        </View>

        {/* MEDIA CARD */}
        <View style={[styles.card, { zIndex: -2 }]}>
          <View style={styles.cardHeader}>
            <FontAwesome name="image" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Contenido Multimedia</Text>
          </View>

          <Text style={styles.sectionLabel}>Galería de Imágenes (URLs separadas por coma)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { minHeight: 70 }]}
            value={form.imageUrls}
            onChangeText={(value) => updateField("imageUrls", value)}
            placeholder="https://img1.jpg, https://img2.jpg"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
            multiline
          />

          <Text style={styles.sectionLabel}>Google Modelos 3D (URLs separadas por coma)</Text>
          <TextInput
            style={[styles.input, styles.textArea, { minHeight: 70 }]}
            value={form.model3dUrls}
            onChangeText={(value) => updateField("model3dUrls", value)}
            placeholder="https://...glb"
            placeholderTextColor={COLORS.textLight}
            autoCapitalize="none"
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.submitText}>
            {loading ? "Registrando Lugar..." : "Guardar e Iniciar Aventura"}
          </Text>
          {!loading && <FontAwesome name="check-circle" size={18} color={COLORS.white} style={{ marginLeft: 8 }} />}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F6F9", // Slightly softer blueish background
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
  geocodeRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: SPACING.sm,
  },
  iconButton: {
    backgroundColor: ACCENT,
    width: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  mapActionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  manualModeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  manualModeText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  mapWrapper: {
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E9F2",
    backgroundColor: "#EEE",
  },
  mapWrapperActive: {
    borderColor: ACCENT,
    borderWidth: 2,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: SPACING.sm,
    borderRadius: 12,
    alignItems: 'center',
  },
  mapOverlayText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: ACCENT,
  },
  resultsWrapper: {
    marginTop: SPACING.sm,
    backgroundColor: "#F9FAFf",
    borderRadius: 14,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: "#E5E9F2",
    gap: SPACING.xs,
  },
  resultsTitle: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: 4,
    marginBottom: 4,
  },
  resultItem: {
    flexDirection: "row",
    padding: SPACING.sm,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  resultText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "500",
  },
  resultCoords: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  selectPlaceholder: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: SPACING.xs,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E9F2",
    maxHeight: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    zIndex: 999,
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownContent: {
    paddingVertical: SPACING.xs,
  },
  dropdownItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  dropdownItemText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "500",
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
  submitText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
});

export default CreatePlaceScreen;
