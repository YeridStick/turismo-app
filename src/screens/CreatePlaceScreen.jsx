import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useState } from "react";
import {
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
import { COLORS, FONT_SIZES, SPACING, PLACE_SERVICES } from "../utils/constants";
import { PremiumModal } from "../components/ui/PremiumModal";

const ACCENT = "#0E7490";
const MAX_GEOCODE_LIMIT = 100;
const COOLDOWN_MS = 3000;
const FALLBACK_CENTER = { latitude: 2.9386, longitude: -75.2811 };

const parseList = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const CreatePlaceScreen = ({ navigation, route }) => {
  const editPlace = route.params?.place || null;

  const [form, setForm] = useState({
    name: editPlace?.name || "",
    description: editPlace?.description || "",
    categoryId: editPlace?.categoryId ? String(editPlace.categoryId) : "",
    lat: editPlace?.lat ? String(editPlace.lat) : "",
    lng: editPlace?.lng ? String(editPlace.lng) : "",
    address: editPlace?.address || "",
    phone: editPlace?.phone || "",
    website: editPlace?.website || "",
    imageUrls: Array.isArray(editPlace?.imageUrls) ? editPlace.imageUrls.join(", ") : "",
    model3dUrls: Array.isArray(editPlace?.model3dUrls) ? editPlace.model3dUrls.join(", ") : "",
    services: editPlace?.services || [],
  });
  const [customService, setCustomService] = useState("");
  const [loading, setLoading] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeCooldown, setGeocodeCooldown] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);
  const [addressParts, setAddressParts] = useState({
    viaType: "Carrera",
    viaNumber: "",
    crossNumber: "",
    plateNumber: "",
    extraDetail: "",
  });
  const [modal, setModal] = useState({ visible: false, type: 'success', title: '', message: '', onConfirm: null });

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };
  const updateAddressPart = (key, value) => {
    setAddressParts((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const response = await api.get(ENDPOINTS.CATEGORIES);
        const payload = response.data?.data || response.data;
        setCategories(Array.isArray(payload) ? payload : []);
      } catch (_err) {
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

  const structuredAddressValue = useMemo(() => {
    const via = addressParts.viaNumber.trim();
    const cross = addressParts.crossNumber.trim();
    const plate = addressParts.plateNumber.trim();
    const detail = addressParts.extraDetail.trim();

    if (!via || !cross) return "";
    const base = `${addressParts.viaType} ${via} #${cross}${plate ? `-${plate}` : ""}`;
    return detail ? `${base}, ${detail}` : base;
  }, [addressParts]);

  const applyStructuredAddress = () => {
    if (!structuredAddressValue) {
      setModal({
        visible: true,
        type: "warning",
        title: "Direccion incompleta",
        message: "Completa tipo de via, numero y cruce para armar la direccion.",
      });
      return;
    }
    updateField("address", structuredAddressValue);
  };

  const handleGeocode = async () => {
    const fallbackStructured = structuredAddressValue;
    const address = form.address.trim() || fallbackStructured;
    if (!address) {
      setModal({
        visible: true,
        type: 'warning',
        title: 'Dirección requerida',
        message: 'Por favor, ingresa una dirección para poder geocodificarla.'
      });
      return;
    }
    if (!form.address.trim() && fallbackStructured) {
      updateField("address", fallbackStructured);
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
        setModal({
          visible: true,
          type: 'info',
          title: 'Sin resultados',
          message: 'No logramos encontrar coordenadas para esa dirección. Intenta ser más específico.'
        });
      }
    } catch (_err) {
      setModal({
        visible: true,
        type: 'error',
        title: 'Error de Geocodificación',
        message: 'Hubo un problema al conectar con el servicio de mapas.'
      });
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

  const handleUseCurrentLocation = async () => {
    if (currentLocationLoading) return;
    setCurrentLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setModal({
          visible: true,
          type: "warning",
          title: "Permiso requerido",
          message: "Activa el permiso de ubicacion para usar tu posicion actual.",
        });
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      updateField("lat", latitude.toFixed(6));
      updateField("lng", longitude.toFixed(6));
      setGeocodeResults([]);

      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
        const first = reverse?.[0];
        if (first) {
          const resolvedAddress = [
            [first.street, first.streetNumber].filter(Boolean).join(" "),
            first.district,
            first.city || first.subregion,
            first.region,
          ]
            .filter(Boolean)
            .join(", ");
          if (resolvedAddress) {
            updateField("address", resolvedAddress);
          }
        }
      } catch (_reverseErr) {
        // Mantener silencioso: lat/lng ya fueron asignadas.
      }
    } catch (_err) {
      setModal({
        visible: true,
        type: "error",
        title: "Ubicacion no disponible",
        message: "No fue posible obtener tu ubicacion actual. Intenta de nuevo.",
      });
    } finally {
      setCurrentLocationLoading(false);
    }
  };

  const toggleService = (serviceLabel) => {
    const current = [...form.services];
    const index = current.indexOf(serviceLabel);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(serviceLabel);
    }
    updateField("services", current);
  };

  const addCustomService = () => {
    const service = customService.trim();
    if (!service) return;
    if (form.services.includes(service)) {
      setCustomService("");
      return;
    }
    updateField("services", [...form.services, service]);
    setCustomService("");
  };

  const removeService = (service) => {
    updateField("services", form.services.filter(s => s !== service));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.description || !form.categoryId || !form.lat || !form.lng) {
      setModal({
        visible: true,
        type: 'warning',
        title: 'Campos requeridos',
        message: 'Asegúrate de completar el nombre, descripción, categoría y ubicación en el mapa.'
      });
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
        services: form.services.length > 0 ? form.services : undefined,
      };

      if (editPlace) {
        await api.patch(ENDPOINTS.PLACE_UPDATE(editPlace.id), payload);
        setModal({
          visible: true,
          type: 'success',
          title: '¡Listo!',
          message: 'El lugar ha sido actualizado correctamente.',
          onConfirm: () => navigation.goBack()
        });
      } else {
        await api.post(ENDPOINTS.PLACES_CREATE, payload);
        setModal({
          visible: true,
          type: 'success',
          title: '¡Excelente!',
          message: 'Tu nuevo lugar mágico ha sido registrado con éxito.',
          onConfirm: () => {
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
               services: [],
             });
             setAddressParts({
               viaType: "Carrera",
               viaNumber: "",
               crossNumber: "",
               plateNumber: "",
               extraDetail: "",
             });
             setModal(prev => ({ ...prev, visible: false }));
          }
        });
      }
    } catch (_err) {
      setModal({
        visible: true,
        type: 'error',
        title: 'Error al guardar',
        message: `No logramos ${editPlace ? 'actualizar' : 'crear'} el lugar en este momento. Revisa tu conexión.`
      });
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
          <Text style={styles.title}>{editPlace ? "Editar Lugar Mágico" : "Nuevo Lugar Mágico"}</Text>
          <Text style={styles.subtitle}>{editPlace ? "Actualiza los datos del sitio" : "Completa los detalles para agregarlo"}</Text>
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

          {/* SERVICES SECTION */}
          <Text style={styles.sectionLabel}>Servicios / Amenidades</Text>
          <View style={styles.servicesContainer}>
            {PLACE_SERVICES.map((s) => {
              const isSelected = form.services.includes(s.label);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[
                    styles.serviceChip,
                    isSelected && styles.serviceChipSelected,
                  ]}
                  onPress={() => toggleService(s.label)}
                >
                  <MaterialIcons
                    name={s.icon}
                    size={16}
                    color={isSelected ? COLORS.white : ACCENT}
                  />
                  <Text
                    style={[
                      styles.serviceChipText,
                      isSelected && styles.serviceChipTextSelected,
                    ]}
                  >
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.customServiceRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={customService}
              onChangeText={setCustomService}
              placeholder="Otro servicio (ej: Camping)"
              placeholderTextColor={COLORS.textLight}
              onSubmitEditing={addCustomService}
            />
            <TouchableOpacity
              style={styles.iconButton}
              onPress={addCustomService}
            >
              <FontAwesome name="plus" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Selected Custom Services (those not in PLACE_SERVICES) */}
          <View style={styles.selectedServicesContainer}>
            {form.services
              .filter((s) => !PLACE_SERVICES.some((ps) => ps.label === s))
              .map((s, idx) => (
                <View key={`custom-${idx}`} style={styles.customChip}>
                  <Text style={styles.customChipText}>{s}</Text>
                  <TouchableOpacity onPress={() => removeService(s)}>
                    <FontAwesome name="times-circle" size={14} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        </View>

        {/* LOCATION CARD */}
        <View style={[styles.card, { zIndex: -1 }]}>
          <View style={styles.cardHeader}>
            <FontAwesome name="map-marker" size={18} color={ACCENT} />
            <Text style={styles.cardTitle}>Ubicación</Text>
          </View>

          <Text style={styles.sectionLabel}>Dirección</Text>
          <Text style={styles.sectionSubLabel}>Direccion estructurada (opcional)</Text>
          <View style={styles.structuredTypeRow}>
            {["Calle", "Carrera"].map((type) => {
              const active = addressParts.viaType === type;
              return (
                <TouchableOpacity
                  key={`via-${type}`}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => updateAddressPart("viaType", type)}
                >
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{type}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.row}>
            <View style={styles.col}>
              <TextInput
                style={styles.input}
                value={addressParts.viaNumber}
                onChangeText={(value) => updateAddressPart("viaNumber", value)}
                placeholder="Numero via (55A)"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <View style={styles.col}>
              <TextInput
                style={styles.input}
                value={addressParts.crossNumber}
                onChangeText={(value) => updateAddressPart("crossNumber", value)}
                placeholder="Cruce (22)"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
            <View style={styles.col}>
              <TextInput
                style={styles.input}
                value={addressParts.plateNumber}
                onChangeText={(value) => updateAddressPart("plateNumber", value)}
                placeholder="Placa (20)"
                placeholderTextColor={COLORS.textLight}
              />
            </View>
          </View>
          <TextInput
            style={styles.input}
            value={addressParts.extraDetail}
            onChangeText={(value) => updateAddressPart("extraDetail", value)}
            placeholder="Barrio o referencia (opcional)"
            placeholderTextColor={COLORS.textLight}
          />
          <View style={styles.structuredActionsRow}>
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={applyStructuredAddress}
            >
              <FontAwesome name="magic" size={14} color={ACCENT} />
              <Text style={styles.secondaryActionText}>Usar direccion estructurada</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubLabel}>Direccion completa</Text>
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
          <TouchableOpacity
            style={[styles.locationButton, currentLocationLoading && styles.buttonDisabled]}
            onPress={handleUseCurrentLocation}
            disabled={currentLocationLoading}
          >
            <FontAwesome name="location-arrow" size={14} color={COLORS.white} />
            <Text style={styles.locationButtonText}>
              {currentLocationLoading ? "Obteniendo ubicacion..." : "Usar mi ubicacion actual"}
            </Text>
          </TouchableOpacity>

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
            {loading 
              ? (editPlace ? "Actualizando..." : "Registrando Lugar...") 
              : (editPlace ? "Guardar Cambios" : "Guardar e Iniciar Aventura")}
          </Text>
          {!loading && <FontAwesome name="check-circle" size={18} color={COLORS.white} style={{ marginLeft: 8 }} />}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PremiumModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm || (() => setModal(prev => ({ ...prev, visible: false })))}
        onClose={() => setModal(prev => ({ ...prev, visible: false }))}
      />
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
  sectionSubLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textLight,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
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
  structuredTypeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: SPACING.xs,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7DEEA",
    backgroundColor: "#F8FAFC",
  },
  typeChipActive: {
    borderColor: ACCENT,
    backgroundColor: "rgba(14, 116, 144, 0.12)",
  },
  typeChipText: {
    color: COLORS.textLight,
    fontSize: 12,
    fontWeight: "700",
  },
  typeChipTextActive: {
    color: ACCENT,
  },
  structuredActionsRow: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  secondaryActionButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(14, 116, 144, 0.25)",
    backgroundColor: "rgba(14, 116, 144, 0.08)",
  },
  secondaryActionText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: "700",
  },
  locationButton: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
  },
  locationButtonText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: FONT_SIZES.xs,
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
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  serviceChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    gap: 6,
  },
  serviceChipSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  serviceChipText: {
    fontSize: 12,
    color: ACCENT,
    fontWeight: "600",
  },
  serviceChipTextSelected: {
    color: COLORS.white,
  },
  customServiceRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  selectedServicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  customChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  customChipText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "500",
  },
});

export default CreatePlaceScreen;
