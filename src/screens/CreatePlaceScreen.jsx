import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import WebViewMap from "../components/WebViewMap";
import { ENDPOINTS } from "../config/api.config";
import api, { createCategory, deletePlaceMedia, updateCategory, uploadPlaceMedia } from "../services/api";
import { COLORS, FONT_SIZES, SPACING, PLACE_SERVICES } from "../utils/constants";
import { PremiumModal } from "../components/ui/PremiumModal";
import { getCachedPlaceMedia, invalidatePlaceMediaCache } from "../utils/placeMediaCache";
import {
  MAX_SITE_IMAGE_COUNT,
  toLocalSiteMedia,
  validateSiteMedia,
} from "../utils/siteMedia";

const ACCENT = "#156436";
const MAX_GEOCODE_LIMIT = 100;
const COOLDOWN_MS = 3000;
const FALLBACK_CENTER = { latitude: 2.9386, longitude: -75.2811 };

const parseList = (value) =>
  (Array.isArray(value) ? value : String(value || "").split(","))
    .map((item) => String(item).trim())
    .filter(Boolean);

const formatListValue = (value) =>
  parseList(value).join(", ");

const slugifyCategory = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

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
    imageUrls: formatListValue(editPlace?.imageUrls || editPlace?.image_urls),
    videoUrls: formatListValue(editPlace?.videoUrls || editPlace?.video_urls),
    model3dUrls: formatListValue(editPlace?.model3dUrls || editPlace?.model_3d_urls),
    services: editPlace?.services || [],
  });
  const [customService, setCustomService] = useState("");
  const [localImages, setLocalImages] = useState([]);
  const [persistedMedia, setPersistedMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaProgress, setMediaProgress] = useState(null);
  const [mediaAccordion, setMediaAccordion] = useState({ images: true, videos: false, models: false, external: false });
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraMode, setCameraMode] = useState("picture");
  const [cameraRecording, setCameraRecording] = useState(false);
  const cameraRef = React.useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [loading, setLoading] = useState(false);
  const [geocodeResults, setGeocodeResults] = useState([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [geocodeCooldown, setGeocodeCooldown] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [createCategoryVisible, setCreateCategoryVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategorySlug, setNewCategorySlug] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
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

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    const slug = slugifyCategory(newCategorySlug);
    if (!name) {
      setModal({ visible: true, type: "warning", title: "Nombre requerido", message: "Escribe un nombre para la categoría." });
      return;
    }
    if (!slug) {
      setModal({ visible: true, type: "warning", title: "Slug requerido", message: "Escribe un slug válido para la categoría." });
      return;
    }
    const existing = categories.find((item) =>
      String(item.name || "").trim().toLowerCase() === name.toLowerCase() &&
      String(item.id) !== String(editingCategory?.id)
    );
    if (existing) {
      updateField("categoryId", String(existing.id));
      setCreateCategoryVisible(false);
      setNewCategoryName("");
      setNewCategorySlug("");
      setEditingCategory(null);
      return;
    }

    setCreatingCategory(true);
    try {
      if (editingCategory) {
        const response = await updateCategory(editingCategory.id, { slug, name });
        const updated = response.data?.data || response.data || { ...editingCategory, name };
        const normalized = { ...editingCategory, ...updated, id: editingCategory.id, name: updated.name || name };
        setCategories((previous) => previous.map((item) => String(item.id) === String(editingCategory.id) ? normalized : item));
      } else {
        const response = await createCategory({ slug, name });
        const created = response.data?.data || response.data;
        if (!created?.id) throw new Error("La respuesta no contiene el id de la categoría.");
        setCategories((previous) => [...previous, created]);
        updateField("categoryId", String(created.id));
      }
      setCreateCategoryVisible(false);
      setNewCategoryName("");
      setNewCategorySlug("");
      setEditingCategory(null);
    } catch (error) {
      setModal({
        visible: true,
        type: "error",
        title: editingCategory ? "No se pudo actualizar la categoría" : "No se pudo crear la categoría",
        message: error?.response?.data?.message || error?.message || "Revisa los datos e intenta de nuevo.",
      });
    } finally {
      setCreatingCategory(false);
    }
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

  useEffect(() => {
    let active = true;
    if (!editPlace?.id) return undefined;
    setMediaLoading(true);
    getCachedPlaceMedia(editPlace.id, { force: true })
      .then((items) => {
        if (!active) return;
        setPersistedMedia(Array.isArray(items) ? items : []);
      })
      .catch((error) => {
        if (active) {
          setModal({ visible: true, type: "error", title: "No se pudo cargar multimedia", message: getApiErrorMessage(error) });
        }
      })
      .finally(() => active && setMediaLoading(false));
    return () => { active = false; };
  }, [editPlace?.id]);

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

  const getApiErrorMessage = (error, fallback = "No se pudo completar la operación.") =>
    error?.response?.data?.message || error?.message || fallback;

  const pickMedia = async (category) => {
    if (localImages.length + persistedMedia.length >= MAX_SITE_IMAGE_COUNT) {
      setModal({
        visible: true,
        type: "warning",
        title: "Límite de imágenes",
        message: `Puedes seleccionar hasta ${MAX_SITE_IMAGE_COUNT} imágenes.`,
      });
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setModal({
        visible: true,
        type: "warning",
        title: "Permiso de galería requerido",
        message: "Activa el permiso de fotos para seleccionar imágenes del sitio.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: category === "videos" ? ["videos"] : ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_SITE_IMAGE_COUNT - localImages.length - persistedMedia.length,
      quality: 0.85,
    });
    if (result.canceled) return;

    const invalid = (result.assets || []).find((asset) => validateSiteMedia(asset, category));
    if (invalid) {
      setModal({
        visible: true,
        type: "warning",
        title: "Archivo no válido",
        message: category === "videos"
          ? "Usa videos MP4, WebM o MOV de máximo 100 MB."
          : "Usa imágenes JPG o PNG de máximo 10 MB.",
      });
      return;
    }
    const candidates = (result.assets || []).map((asset, index) => toLocalSiteMedia(asset, category, index));
    setLocalImages((previous) => [...previous, ...candidates].slice(0, MAX_SITE_IMAGE_COUNT));
  };

  const pickImages = () => pickMedia("images");
  const pickVideos = () => pickMedia("videos");

  const pickModel = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["model/gltf-binary", "application/octet-stream"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const invalid = (result.assets || []).find((asset) => validateSiteMedia({ ...asset, fileName: asset.name }, "models-3d"));
    if (invalid) {
      setModal({ visible: true, type: "warning", title: "Modelo no válido", message: "Usa archivos GLB de máximo 25 MB." });
      return;
    }
    const candidates = (result.assets || []).map((asset, index) =>
      toLocalSiteMedia({ ...asset, fileName: asset.name, mimeType: asset.mimeType || "application/octet-stream" }, "models-3d", index)
    );
    setLocalImages((previous) => [...previous, ...candidates].slice(0, MAX_SITE_IMAGE_COUNT));
  };

  const addCapturedMedia = (asset, category) => {
    const validationError = validateSiteMedia(asset, category);
    if (validationError) {
      setModal({ visible: true, type: "warning", title: "Archivo no válido", message: "El archivo capturado no cumple los límites del backend." });
      return;
    }
    setLocalImages((previous) => [...previous, toLocalSiteMedia(asset, category, previous.length)].slice(0, MAX_SITE_IMAGE_COUNT));
  };

  const openCamera = async (mode) => {
    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (!permission?.granted) {
      setModal({ visible: true, type: "warning", title: "Permiso de cámara requerido", message: "Activa el permiso de cámara para capturar multimedia." });
      return;
    }
    if (mode === "video") {
      const microphone = microphonePermission?.granted ? microphonePermission : await requestMicrophonePermission();
      if (!microphone?.granted) {
        setModal({ visible: true, type: "warning", title: "Permiso de micrófono requerido", message: "Activa el micrófono para grabar videos con sonido." });
        return;
      }
    }
    setCameraMode(mode);
    setCameraVisible(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        addCapturedMedia({ ...photo, fileName: `site-photo-${Date.now()}.jpg`, mimeType: "image/jpeg" }, "images");
        setCameraVisible(false);
      }
    } catch (error) {
      setModal({ visible: true, type: "error", title: "No se pudo tomar la foto", message: error?.message || "Intenta de nuevo." });
    }
  };

  const recordVideo = async () => {
    if (!cameraRef.current || cameraRecording) return;
    setCameraRecording(true);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 120 });
      if (video?.uri) {
        addCapturedMedia({ ...video, fileName: `site-video-${Date.now()}.mp4`, mimeType: "video/mp4" }, "videos");
        setCameraVisible(false);
      }
    } catch (error) {
      setModal({ visible: true, type: "error", title: "No se pudo grabar el video", message: error?.message || "Intenta de nuevo." });
    } finally {
      setCameraRecording(false);
    }
  };

  const closeCamera = () => {
    if (cameraRecording) cameraRef.current?.stopRecording?.();
    setCameraVisible(false);
  };

  const removeLocalImage = (imageId) => {
    setLocalImages((previous) => {
      const removed = previous.find((image) => image.id === imageId);
      if (removed?.uri?.startsWith?.("blob:") && typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(removed.uri);
      return previous.filter((image) => image.id !== imageId);
    });
  };

  const removePersistedMedia = async (media) => {
    if (!editPlace?.id || !media?.id) return;
    try {
      const response = await deletePlaceMedia(editPlace.id, media.id);
      if (response.status !== 200 || response.data?.data !== true) throw new Error("El backend no confirmó la eliminación.");
      invalidatePlaceMediaCache(editPlace.id);
      setPersistedMedia((previous) => previous.filter((item) => item.id !== media.id));
    } catch (error) {
      setModal({ visible: true, type: "error", title: "No se pudo eliminar", message: getApiErrorMessage(error) });
    }
  };

  const uploadPendingMedia = async (siteId) => {
    if (!siteId || localImages.length === 0) return [];
    const uploaded = [];
    for (let index = 0; index < localImages.length; index += 1) {
      const media = localImages[index];
      setMediaProgress({ current: index + 1, total: localImages.length, name: media.name });
      try {
        const response = await uploadPlaceMedia(siteId, {
          uri: media.uri,
          name: media.name,
          type: media.mimeType,
        }, media.category);
        if (response.status !== 201 || !response.data?.data) throw new Error("La carga no fue confirmada por el backend.");
        uploaded.push(response.data.data);
        invalidatePlaceMediaCache(siteId);
        setPersistedMedia((previous) => [...previous, response.data.data]);
        removeLocalImage(media.id);
      } catch (error) {
        throw new Error(`No se pudo cargar ${media.name}: ${getApiErrorMessage(error)}`);
      }
    }
    return uploaded;
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
      const imageUrls = parseList(form.imageUrls);
      const videoUrls = parseList(form.videoUrls);
      const model3dUrls = parseList(form.model3dUrls);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        categoryId: Number(form.categoryId),
        lat: Number(form.lat),
        lng: Number(form.lng),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        website: form.website.trim() || undefined,
        imageUrls: editPlace || imageUrls.length > 0 ? imageUrls : undefined,
        videoUrls: editPlace || videoUrls.length > 0 ? videoUrls : undefined,
        model3dUrls: editPlace || model3dUrls.length > 0 ? model3dUrls : undefined,
        services: editPlace || form.services.length > 0 ? form.services : undefined,
      };

      if (editPlace) {
        await api.patch(ENDPOINTS.PLACE_UPDATE(editPlace.id), payload);
        await uploadPendingMedia(editPlace.id);
        setModal({
          visible: true,
          type: 'success',
          title: '¡Listo!',
          message: 'El lugar ha sido actualizado correctamente.',
          onConfirm: () => navigation.goBack()
        });
      } else {
        const placeResponse = await api.post(ENDPOINTS.PLACES_CREATE, payload);
        const createdPlace = placeResponse.data?.data || placeResponse.data;
        const siteId = createdPlace?.id;
        if (!siteId && localImages.length > 0) throw new Error("El backend no devolvió el id del lugar creado.");
        await uploadPendingMedia(siteId);
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
               videoUrls: "",
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
             setLocalImages([]);
             setPersistedMedia([]);
             setModal(prev => ({ ...prev, visible: false }));
          }
        });
      }
    } catch (error) {
      setModal({
        visible: true,
        type: 'error',
        title: 'Error al guardar',
        message: getApiErrorMessage(error, `No logramos ${editPlace ? 'actualizar' : 'crear'} el lugar en este momento.`)
      });
    } finally {
      setLoading(false);
      setMediaProgress(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 72 : 0}
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

      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >

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
                          <View
                            key={`cat-${item.id}`}
                            style={styles.categoryOption}
                          >
                            <TouchableOpacity
                              style={styles.categorySelectOption}
                              onPress={() => {
                                updateField("categoryId", String(item.id));
                                setCategoriesOpen(false);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>{item.name}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.categoryEditButton}
                              onPress={() => {
                                setEditingCategory(item);
                                setNewCategoryName(item.name || "");
                                setNewCategorySlug(item.slug || slugifyCategory(item.name));
                                setCategoriesOpen(false);
                                setCreateCategoryVisible(true);
                              }}
                              accessibilityLabel={`Editar categoría ${item.name}`}
                            >
                              <FontAwesome name="pencil" size={14} color={ACCENT} />
                            </TouchableOpacity>
                          </View>
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
              <TouchableOpacity
                style={styles.createCategoryButton}
                onPress={() => {
                  setEditingCategory(null);
                  setNewCategoryName("");
                  setNewCategorySlug("");
                  setCreateCategoryVisible(true);
                }}
              >
                <FontAwesome name="plus-circle" size={15} color={ACCENT} />
                <Text style={styles.createCategoryText}>Crear categoría nueva</Text>
              </TouchableOpacity>
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

          <Text style={styles.sectionSubLabel}>
            Guarda primero el sitio; después enviaremos cada archivo al backend y conservaremos la respuesta confirmada.
          </Text>
          <TouchableOpacity style={styles.mediaAccordionHeader} onPress={() => setMediaAccordion((previous) => ({ ...previous, images: !previous.images }))}>
            <View style={styles.mediaAccordionTitleRow}><FontAwesome name="photo" size={16} color={ACCENT} /><Text style={styles.mediaAccordionTitle}>Cargar imágenes</Text></View>
            <FontAwesome name={mediaAccordion.images ? "chevron-up" : "chevron-down"} size={13} color={COLORS.textLight} />
          </TouchableOpacity>
          {mediaAccordion.images ? (
            <View style={styles.mediaAccordionContent}>
              <View style={styles.mediaActionRow}>
                <TouchableOpacity style={styles.mediaActionButton} onPress={pickImages}>
                  <FontAwesome name="photo" size={15} color={ACCENT} /><Text style={styles.mediaActionText}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaActionButton} onPress={() => openCamera("picture")}>
                  <FontAwesome name="camera" size={15} color={ACCENT} /><Text style={styles.mediaActionText}>Tomar foto</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          <TouchableOpacity style={styles.mediaAccordionHeader} onPress={() => setMediaAccordion((previous) => ({ ...previous, videos: !previous.videos }))}>
            <View style={styles.mediaAccordionTitleRow}><FontAwesome name="video-camera" size={16} color={ACCENT} /><Text style={styles.mediaAccordionTitle}>Cargar videos</Text></View>
            <FontAwesome name={mediaAccordion.videos ? "chevron-up" : "chevron-down"} size={13} color={COLORS.textLight} />
          </TouchableOpacity>
          {mediaAccordion.videos ? (
            <View style={styles.mediaAccordionContent}>
              <View style={styles.mediaActionRow}>
                <TouchableOpacity style={styles.mediaActionButton} onPress={pickVideos}>
                  <FontAwesome name="film" size={15} color={ACCENT} /><Text style={styles.mediaActionText}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.mediaActionButton} onPress={() => openCamera("video")}>
                  <FontAwesome name="video-camera" size={15} color={ACCENT} /><Text style={styles.mediaActionText}>Grabar video</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          <TouchableOpacity style={styles.mediaAccordionHeader} onPress={() => setMediaAccordion((previous) => ({ ...previous, models: !previous.models }))}>
            <View style={styles.mediaAccordionTitleRow}><FontAwesome name="cube" size={16} color={ACCENT} /><Text style={styles.mediaAccordionTitle}>Cargar modelo GLB</Text></View>
            <FontAwesome name={mediaAccordion.models ? "chevron-up" : "chevron-down"} size={13} color={COLORS.textLight} />
          </TouchableOpacity>
          {mediaAccordion.models ? (
            <View style={styles.mediaAccordionContent}>
              <TouchableOpacity style={styles.mediaActionButton} onPress={pickModel}>
                <FontAwesome name="folder-open" size={15} color={ACCENT} /><Text style={styles.mediaActionText}>Seleccionar archivo GLB</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <TouchableOpacity style={styles.mediaAccordionHeader} onPress={() => setMediaAccordion((previous) => ({ ...previous, external: !previous.external }))}>
            <View style={styles.mediaAccordionTitleRow}><FontAwesome name="link" size={16} color={ACCENT} /><Text style={styles.mediaAccordionTitle}>Usar enlaces externos</Text></View>
            <FontAwesome name={mediaAccordion.external ? "chevron-up" : "chevron-down"} size={13} color={COLORS.textLight} />
          </TouchableOpacity>
          {mediaAccordion.external ? (
            <View style={styles.mediaAccordionContent}>
              <Text style={styles.sectionLabel}>Imágenes (URLs separadas por coma)</Text>
              <TextInput style={styles.input} value={form.imageUrls} onChangeText={(value) => updateField("imageUrls", value)} placeholder="https://.../imagen.jpg" placeholderTextColor={COLORS.textLight} autoCapitalize="none" />
              <Text style={styles.sectionLabel}>Videos (URLs separadas por coma)</Text>
              <TextInput style={[styles.input, styles.textArea, { minHeight: 70 }]} value={form.videoUrls} onChangeText={(value) => updateField("videoUrls", value)} placeholder="https://.../video.mp4" placeholderTextColor={COLORS.textLight} autoCapitalize="none" multiline />
              <Text style={styles.sectionLabel}>Modelos 3D (URLs separadas por coma)</Text>
              <TextInput style={[styles.input, styles.textArea, { minHeight: 70 }]} value={form.model3dUrls} onChangeText={(value) => updateField("model3dUrls", value)} placeholder="https://.../modelo.glb" placeholderTextColor={COLORS.textLight} autoCapitalize="none" multiline />
            </View>
          ) : null}
          {mediaLoading ? <Text style={styles.sectionSubLabel}>Consultando multimedia guardada...</Text> : null}
          {mediaProgress ? (
            <Text style={styles.sectionSubLabel}>
              Cargando {mediaProgress.current}/{mediaProgress.total}: {mediaProgress.name}
            </Text>
          ) : null}
          {parseList(editPlace?.imageUrls || editPlace?.image_urls).length > 0 ? (
            <View style={styles.mediaNotice}>
              <FontAwesome name="lock" size={13} color={ACCENT} />
              <Text style={styles.mediaNoticeText}>
                Las imágenes ya guardadas vienen del backend y no se ocultan localmente.
              </Text>
            </View>
          ) : null}
          {localImages.length > 0 ? (
            <View style={styles.mediaGrid}>
              {localImages.map((image) => (
                <View key={image.id} style={styles.mediaItem}>
                  {image.category === "images" ? (
                    <Image source={{ uri: image.uri }} style={styles.mediaPreview} contentFit="cover" />
                  ) : (
                    <View style={[styles.mediaPreview, styles.mediaFilePreview]}>
                      <FontAwesome name={image.category === "videos" ? "video-camera" : "cube"} size={24} color={COLORS.white} />
                    </View>
                  )}
                  <View style={styles.mediaStatus}>
                    <Text style={styles.mediaStatusText}>{image.category === "images" ? "Imagen" : image.category === "videos" ? "Video" : "GLB"} · {image.status}</Text>
                    <TouchableOpacity onPress={() => removeLocalImage(image.id)}>
                      <FontAwesome name="times-circle" size={16} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          {persistedMedia.length > 0 ? (
            <View style={styles.persistedMediaList}>
              <Text style={styles.sectionSubLabel}>Multimedia guardada</Text>
              {persistedMedia.map((media) => (
                <View key={String(media.id)} style={styles.persistedMediaRow}>
                  {media.category === "images" && media.url ? (
                    <Image source={{ uri: media.url }} style={styles.persistedMediaThumb} contentFit="cover" />
                  ) : null}
                  <View style={styles.persistedMediaInfo}>
                    <FontAwesome name={media.category === "images" ? "image" : media.category === "videos" ? "video-camera" : "cube"} size={16} color={ACCENT} />
                    <Text style={styles.persistedMediaName} numberOfLines={1}>{media.originalFilename || media.objectKey}</Text>
                  </View>
                  <TouchableOpacity onPress={() => removePersistedMedia(media)}>
                    <FontAwesome name="trash" size={16} color={COLORS.error || "#B91C1C"} />
                  </TouchableOpacity>
                </View>
              ))}
              <Text style={styles.mediaNoticeText}>Las miniaturas usan URLs prefirmadas temporales; se renuevan al volver a abrir la pantalla.</Text>
            </View>
          ) : null}

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

      <Modal visible={cameraVisible} animationType="slide" onRequestClose={closeCamera}>
        <View style={styles.cameraScreen}>
          <CameraView
            ref={cameraRef}
            style={styles.cameraPreview}
            facing="back"
            mode={cameraMode}
          />
          <View style={styles.cameraTopBar}>
            <TouchableOpacity style={styles.cameraCloseButton} onPress={closeCamera} disabled={cameraRecording}>
              <FontAwesome name="times" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>{cameraMode === "picture" ? "Tomar foto" : "Grabar video"}</Text>
            <View style={styles.cameraTopSpacer} />
          </View>
          <View style={styles.cameraControls}>
            {cameraMode === "picture" ? (
              <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.captureButton, cameraRecording && styles.captureButtonRecording]} onPress={cameraRecording ? closeCamera : recordVideo}>
                <View style={[styles.videoCaptureInner, cameraRecording && styles.videoCaptureInnerRecording]} />
              </TouchableOpacity>
            )}
            <Text style={styles.cameraHint}>{cameraRecording ? "Grabando... toca para detener" : "La captura se cargará al guardar el sitio"}</Text>
          </View>
        </View>
      </Modal>

      <PremiumModal
        visible={modal.visible}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm || (() => setModal(prev => ({ ...prev, visible: false })))}
        onClose={() => setModal(prev => ({ ...prev, visible: false }))}
      />

      <Modal
        visible={createCategoryVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !creatingCategory && setCreateCategoryVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.categoryModalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.categoryModalCard}>
            <View style={styles.categoryModalHeader}>
              <View style={styles.categoryModalIcon}>
                <FontAwesome name="tags" size={18} color={ACCENT} />
              </View>
              <TouchableOpacity
                onPress={() => !creatingCategory && setCreateCategoryVisible(false)}
                disabled={creatingCategory}
              >
                <FontAwesome name="times" size={18} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={styles.categoryModalTitle}>{editingCategory ? "Editar categoría" : "Nueva categoría"}</Text>
            <Text style={styles.categoryModalSubtitle}>
              {editingCategory ? "Actualiza el nombre para todos los lugares que usan esta categoría." : "Crea una categoría para clasificar tu lugar turístico."}
            </Text>
            <Text style={styles.sectionLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={newCategoryName}
              onChangeText={(value) => {
                setNewCategoryName(value);
                if (!editingCategory) setNewCategorySlug(slugifyCategory(value));
              }}
              placeholder="Ej. Naturaleza"
              placeholderTextColor={COLORS.textLight}
              autoFocus
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={handleCreateCategory}
              editable={!creatingCategory}
            />
            <Text style={styles.sectionLabel}>Slug</Text>
            <TextInput
              style={styles.input}
              value={newCategorySlug}
              onChangeText={(value) => setNewCategorySlug(slugifyCategory(value))}
              placeholder="ej. naturaleza"
              placeholderTextColor={COLORS.textLight}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={80}
              editable={!creatingCategory}
            />
            <Text style={styles.categorySlugHint}>Solo letras minúsculas, números y guiones.</Text>
            <View style={styles.categoryModalActions}>
              <TouchableOpacity
                style={styles.categoryCancelButton}
                onPress={() => setCreateCategoryVisible(false)}
                disabled={creatingCategory}
              >
                <Text style={styles.categoryCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.categorySaveButton, creatingCategory && styles.buttonDisabled]}
                onPress={handleCreateCategory}
                disabled={creatingCategory}
              >
                {creatingCategory ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={styles.categorySaveText}>{editingCategory ? "Guardar cambios" : "Crear y usar"}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  formScroll: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E7F0F3",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    backgroundColor: "#EAF4F6",
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
    borderRadius: 18,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
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
    backgroundColor: "#FBFEFF",
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: "#D9EAF0",
    minHeight: 52,
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
  createCategoryButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginTop: SPACING.sm,
    paddingVertical: 6,
  },
  createCategoryText: {
    color: ACCENT,
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },
  categoryModalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: SPACING.lg,
    backgroundColor: "rgba(15, 23, 42, 0.36)",
  },
  categoryModalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "#E7F0F3",
    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  categoryModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryModalIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF4F6",
  },
  categoryModalTitle: {
    marginTop: SPACING.md,
    color: COLORS.text,
    fontSize: FONT_SIZES.lg,
    fontWeight: "800",
  },
  categoryModalSubtitle: {
    marginTop: 4,
    marginBottom: SPACING.sm,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
    lineHeight: 20,
  },
  categorySlugHint: {
    marginTop: -SPACING.sm,
    marginBottom: SPACING.sm,
    color: COLORS.textLight,
    fontSize: FONT_SIZES.xs,
  },
  categoryModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  categoryCancelButton: {
    minHeight: 46,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryCancelText: {
    color: COLORS.textLight,
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
  },
  categorySaveButton: {
    minHeight: 46,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  categorySaveText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
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
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF5F7",
  },
  categorySelectOption: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  categoryEditButton: {
    width: 42,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownItemText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: "500",
  },
  mediaPickerButton: {
    marginTop: SPACING.sm,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  mediaPickerButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
  },
  mediaAccordionHeader: {
    minHeight: 52,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9EAF0",
    backgroundColor: "#FBFEFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mediaAccordionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  mediaAccordionTitle: {
    color: COLORS.text,
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
  },
  mediaAccordionContent: {
    paddingTop: SPACING.sm,
    paddingHorizontal: 2,
  },
  mediaActionRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  mediaActionButton: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: SPACING.sm,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(14, 116, 144, 0.24)",
    backgroundColor: "#EAF4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  mediaActionText: {
    color: ACCENT,
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },
  mediaNotice: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 10,
    backgroundColor: "#ECFEFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mediaNoticeText: {
    flex: 1,
    color: ACCENT,
    fontSize: FONT_SIZES.xs,
  },
  mediaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: SPACING.md,
  },
  mediaItem: {
    width: 94,
    height: 94,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#CBD5E1",
  },
  mediaPreview: {
    width: "100%",
    height: "100%",
  },
  mediaFilePreview: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#334155",
  },
  persistedMediaList: {
    marginTop: SPACING.md,
    gap: 8,
  },
  persistedMediaRow: {
    minHeight: 42,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  persistedMediaThumb: {
    width: 34,
    height: 34,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: "#E2E8F0",
  },
  persistedMediaInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8,
  },
  persistedMediaName: {
    flex: 1,
    color: COLORS.text,
    fontSize: FONT_SIZES.xs,
  },
  mediaStatus: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mediaStatusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: "#020617",
  },
  cameraPreview: {
    flex: 1,
  },
  cameraTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 54,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(2, 6, 23, 0.32)",
  },
  cameraCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
  },
  cameraTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: "800",
  },
  cameraTopSpacer: { width: 40 },
  cameraControls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: 42,
    alignItems: "center",
    backgroundColor: "rgba(2, 6, 23, 0.28)",
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.white,
  },
  videoCaptureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#EF4444",
  },
  captureButtonRecording: { borderColor: "#FCA5A5" },
  videoCaptureInnerRecording: { borderRadius: 8, width: 30, height: 30 },
  cameraHint: {
    marginTop: SPACING.sm,
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    textAlign: "center",
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
