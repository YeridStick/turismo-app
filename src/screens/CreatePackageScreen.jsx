import React, { useState } from "react";
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
import { FontAwesome } from "@expo/vector-icons";
import api from "../services/api";
import { ENDPOINTS } from "../config/api.config";
import { COLORS, FONT_SIZES, SPACING } from "../utils/constants";

const ACCENT = "#5B3CF0";

const parseList = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseNumberList = (value) =>
  value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));

const CreatePackageScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    placeIds: "",
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
  const [loading, setLoading] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.price || !form.placeIds) {
      Alert.alert("Campos requeridos", "Completa titulo, descripcion, precio y lugares.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        placeIds: parseNumberList(form.placeIds),
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
        image: form.image.trim() || undefined,
      };

      await api.post(ENDPOINTS.PACKAGES, payload);
      Alert.alert("Listo", "Paquete creado correctamente.");
      setForm({
        title: "",
        description: "",
        price: "",
        placeIds: "",
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
    } catch (err) {
      Alert.alert("Error", "No se pudo crear el paquete. Revisa los datos.");
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
        <Text style={styles.title}>Crear paquete</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>Titulo</Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={(value) => updateField("title", value)}
          placeholder="Aventura Completa"
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
            <Text style={styles.sectionLabel}>Precio</Text>
            <TextInput
              style={styles.input}
              value={form.price}
              onChangeText={(value) => updateField("price", value)}
              placeholder="1890000"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Precio original</Text>
            <TextInput
              style={styles.input}
              value={form.originalPrice}
              onChangeText={(value) => updateField("originalPrice", value)}
              placeholder="2500000"
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>IDs de lugares (separados por coma)</Text>
        <TextInput
          style={styles.input}
          value={form.placeIds}
          onChangeText={(value) => updateField("placeIds", value)}
          placeholder="101, 102"
          keyboardType="numeric"
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Dias</Text>
            <TextInput
              style={styles.input}
              value={form.days}
              onChangeText={(value) => updateField("days", value)}
              placeholder="5"
              keyboardType="numeric"
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
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Ciudad</Text>
        <TextInput
          style={styles.input}
          value={form.city}
          onChangeText={(value) => updateField("city", value)}
          placeholder="Tatacoa / San Agustin"
        />

        <Text style={styles.sectionLabel}>Capacidad</Text>
        <TextInput
          style={styles.input}
          value={form.people}
          onChangeText={(value) => updateField("people", value)}
          placeholder="Hasta 8 personas"
        />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Rating</Text>
            <TextInput
              style={styles.input}
              value={form.rating}
              onChangeText={(value) => updateField("rating", value)}
              placeholder="4.9"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionLabel}>Reviews</Text>
            <TextInput
              style={styles.input}
              value={form.reviews}
              onChangeText={(value) => updateField("reviews", value)}
              placeholder="342"
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Descuento</Text>
        <TextInput
          style={styles.input}
          value={form.discount}
          onChangeText={(value) => updateField("discount", value)}
          placeholder="-24%"
        />

        <Text style={styles.sectionLabel}>Etiqueta</Text>
        <TextInput
          style={styles.input}
          value={form.tag}
          onChangeText={(value) => updateField("tag", value)}
          placeholder="Destacado"
        />

        <Text style={styles.sectionLabel}>Incluye (separado por coma)</Text>
        <TextInput
          style={styles.input}
          value={form.includes}
          onChangeText={(value) => updateField("includes", value)}
          placeholder="Transporte, Guia, Seguro"
        />

        <Text style={styles.sectionLabel}>Imagen principal</Text>
        <TextInput
          style={styles.input}
          value={form.image}
          onChangeText={(value) => updateField("image", value)}
          placeholder="https://..."
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? "Guardando..." : "Crear paquete"}
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
});

export default CreatePackageScreen;
