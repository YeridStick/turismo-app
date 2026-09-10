import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { CATEGORIES_LIST, DISTANCE_OPTIONS } from "../../utils/constants";
import styles from "../../styles";

const FilterModal = ({
  visible,
  onClose,
  selectedCategory,
  setSelectedCategory,
  distanceKm,
  setDistanceKm,
  onApply,
  categories = [],
  loadingCategories = false,
  categoriesError = "",
  onRetryCategories,
}) => {
  const displayCategories =
    categories.length > 0
      ? [{ id: "todos", name: "Todos" }, ...categories]
      : CATEGORIES_LIST;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.filterBottomSheetOverlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.filterBottomSheet}>
          <View style={styles.bottomSheetIndicator} />
          
          <View style={styles.filterModalHeader}>
            <Text style={styles.modalTitle}>Filtros</Text>
            <TouchableOpacity onPress={onClose}>
              <FontAwesome name="times" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.modalSubtitle}>Categoría</Text>
              {loadingCategories ? (
                <Text style={styles.agencyEmptyText}>Cargando categorías...</Text>
              ) : categoriesError ? (
                <View>
                  <Text style={styles.agencyEmptyText}>
                    {categoriesError}. Usamos categorías base mientras tanto.
                  </Text>
                  {onRetryCategories ? (
                    <TouchableOpacity
                      style={styles.restoreButtonSecondary}
                      onPress={onRetryCategories}
                      activeOpacity={0.86}
                    >
                      <Text style={styles.restoreButtonSecondaryText}>
                        Reintentar categorías
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
              <View style={styles.quickRow}>
                {displayCategories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.quickChip,
                      selectedCategory === cat.id && styles.quickChipActive,
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        selectedCategory === cat.id && styles.quickChipTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.modalSubtitle}>Radio de búsqueda</Text>
              <View style={styles.distanceControlRow}>
                <TouchableOpacity
                  style={styles.distanceStepButton}
                  onPress={() => setDistanceKm(Math.max(1, distanceKm - 5))}
                >
                  <FontAwesome name="minus" size={14} color="#156436" />
                </TouchableOpacity>
                
                <View style={styles.distanceValueBox}>
                  <Text style={styles.distanceValueText}>{distanceKm} km</Text>
                </View>

                <TouchableOpacity
                  style={styles.distanceStepButton}
                  onPress={() => setDistanceKm(Math.min(100, distanceKm + 5))}
                >
                  <FontAwesome name="plus" size={14} color="#156436" />
                </TouchableOpacity>
              </View>

              <View style={styles.quickDistanceRow}>
                {DISTANCE_OPTIONS.slice(0, 5).map((dist) => (
                  <TouchableOpacity
                    key={dist}
                    style={[
                      styles.distanceChip,
                      distanceKm === dist && styles.distanceChipActive,
                    ]}
                    onPress={() => setDistanceKm(dist)}
                  >
                    <Text
                      style={[
                        styles.distanceChipText,
                        distanceKm === dist && styles.distanceChipTextActive,
                      ]}
                    >
                      {dist} km
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.filterApplyButton} onPress={onApply}>
              <Text style={styles.filterApplyButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default React.memo(FilterModal);
