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
        <Text style={styles.title}>Crear lugar</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(value) => updateField("name", value)}
          placeholder="Nombre comercial"
        />

        <Text style={styles.sectionLabel}>Descripcion</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.description}
          onChangeText={(value) => updateField("description", value)}
          placeholder="Descripcion corta"
          multiline
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Categoria</Text>
            {categoriesLoading ? (
              <View style={styles.selectInput}>
                <Text style={styles.selectPlaceholder}>Cargando categorias...</Text>
              </View>
            ) : categories.length > 0 ? (
              <View>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setCategoriesOpen((prev) => !prev)}
                >
                  <Text style={styles.selectText}>
                    {selectedCategory?.name || "Categorias"}
                  </Text>
                  <FontAwesome
                    name={categoriesOpen ? "chevron-up" : "chevron-down"}
                    size={12}
                    color={ACCENT}
                  />
                </TouchableOpacity>
                {categoriesOpen ? (
                  <View style={styles.dropdown}>
                    <ScrollView
                      style={styles.dropdownScroll}
                      contentContainerStyle={styles.dropdownContent}
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
                placeholder="ID categoria"
                keyboardType="numeric"
              />
            )}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Telefono</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(value) => updateField("phone", value)}
              placeholder="+57 300..."
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Latitud</Text>
            <TextInput
              style={styles.input}
              value={form.lat}
              onChangeText={(value) => updateField("lat", value)}
              placeholder="6.25184"
              keyboardType="numeric"
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
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Direccion</Text>
        <TextInput
          style={styles.input}
          value={form.address}
          onChangeText={(value) => updateField("address", value)}
          placeholder="Cra. 43 #8-31"
        />
        <View style={styles.geocodeRow}>
          <TouchableOpacity
            style={[
              styles.geocodeButton,
              (geocodeLoading || geocodeCooldown) && styles.buttonDisabled,
            ]}
            onPress={handleGeocode}
            disabled={geocodeLoading || geocodeCooldown}
          >
            <Text style={styles.geocodeText}>
              {geocodeLoading
                ? "Geocodificando..."
                : geocodeCooldown
                ? "Espera 3s"
                : "Geocodificar"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.manualToggle, manualMode && styles.manualToggleActive]}
            onPress={() => setManualMode((prev) => !prev)}
          >
            <Text style={styles.manualToggleText}>
              {manualMode ? "Modo manual activo" : "Ubicacion manual"}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Mapa de verificacion</Text>
        <View style={styles.mapWrapper}>
          <WebViewMap
            initialRegion={mapRegion}
            markers={markers}
            userLocation={selectedCoords || mapRegion}
            onMapPress={handleMapPress}
          />
        </View>
        {manualMode ? (
          <Text style={styles.helperText}>
            Toca el mapa para asignar coordenadas manualmente.
          </Text>
        ) : null}

        {geocodeResults.length > 0 ? (
          <View style={styles.resultsWrapper}>
            <Text style={styles.resultsTitle}>Resultados de geocodificacion</Text>
            {geocodeResults.map((item, index) => (
              <TouchableOpacity
                key={`${item.lat}-${item.lon}-${index}`}
                style={styles.resultItem}
                onPress={() => handleSelectResult(item)}
              >
                <Text style={styles.resultTitle}>Opcion {index + 1}</Text>
                <Text style={styles.resultText} numberOfLines={2}>
                  {item.formatted}
                </Text>
                <Text style={styles.resultCoords}>
                  {item.lat.toFixed(6)}, {item.lon.toFixed(6)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Sitio web</Text>
        <TextInput
          style={styles.input}
          value={form.website}
          onChangeText={(value) => updateField("website", value)}
          placeholder="https://"
          autoCapitalize="none"
        />

        <Text style={styles.sectionLabel}>Imagenes (URLs separadas por coma)</Text>
        <TextInput
          style={styles.input}
          value={form.imageUrls}
          onChangeText={(value) => updateField("imageUrls", value)}
          placeholder="https://... , https://..."
          autoCapitalize="none"
        />

        <Text style={styles.sectionLabel}>Modelos 3D (URLs separadas por coma)</Text>
        <TextInput
          style={styles.input}
          value={form.model3dUrls}
          onChangeText={(value) => updateField("model3dUrls", value)}
          placeholder="https://... , https://..."
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? "Guardando..." : "Crear lugar"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 999,
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "600",
    color: COLORS.text,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  col: {
    flex: 1,
  },
  submitButton: {
    marginTop: SPACING.lg,
    backgroundColor: ACCENT,
    paddingVertical: SPACING.md,
    borderRadius: 999,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
  },
  geocodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  geocodeButton: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    alignItems: "center",
  },
  geocodeText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
  manualToggle: {
    flex: 1,
    borderWidth: 1,
    borderColor: ACCENT,
    paddingVertical: SPACING.sm,
    borderRadius: 999,
    alignItems: "center",
  },
  manualToggleActive: {
    backgroundColor: "rgba(91, 60, 240, 0.12)",
  },
  manualToggleText: {
    color: ACCENT,
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
  },
  mapWrapper: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.xs,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  resultsWrapper: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  resultsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  resultItem: {
    padding: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#efe9ff",
    backgroundColor: "#fbf9ff",
  },
  resultTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  resultText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 4,
  },
  resultCoords: {
    fontSize: FONT_SIZES.xs,
    color: ACCENT,
    marginTop: 4,
    fontWeight: "600",
  },
  selectInput: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    marginTop: SPACING.xs,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 220,
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
  },
});

export default CreatePlaceScreen;
