import { FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { ENDPOINTS } from "../config/api.config";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { COLORS, FONT_SIZES, SPACING } from "../utils/constants";

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CO");
};

const ACCENT = "#5B3CF0";

const AgencyDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agency, setAgency] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  const dateRange = useMemo(() => {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 30);
    return {
      from: from.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    };
  }, []);

  const loadAgencyDashboard = async () => {
    if (!user?.email) return;
    setLoading(true);
    setError("");
    try {
      const dashboardResponse = await api.get(ENDPOINTS.AGENCY_DASHBOARD, {
        params: {
          email: user.email,
          userEmail: user.email,
          from: dateRange.from,
          to: dateRange.to,
          limit: 5,
        },
      });
      const dashboardData = dashboardResponse.data?.data || dashboardResponse.data;
      setDashboard(dashboardData || null);
      setAgency(dashboardData?.agency || null);

      if (!dashboardData?.agency) {
        const agencyResponse = await api.get(ENDPOINTS.AGENCY_BY_USER, {
          params: { email: user.email, userEmail: user.email },
        });
        const agencyData = agencyResponse.data?.data || agencyResponse.data;
        setAgency(agencyData || null);
      }
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "No pudimos cargar la información de tu agencia.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgencyDashboard();
  }, [user?.email]);

  const topPackages = dashboard?.topPackages || [];
  const topPlaces = dashboard?.topPlaces || [];
  const maxSold = Math.max(1, ...topPackages.map((item) => item.sold || 0));
  const maxVisits = Math.max(1, ...topPlaces.map((item) => item.visits || 0));

  const handleCreatePackage = () => {
    navigation?.navigate("CreatePackage");
  };

  if (!user?.email) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>
          Inicia sesión para ver la información de tu agencia.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack?.()}
        >
          <FontAwesome name="chevron-left" size={16} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Panel Estratégico</Text>
          <Text style={styles.subtitle}>Supervisa tu impacto</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={ACCENT} size="large" />
          <Text style={styles.loadingText}>Analizando tus datos...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <FontAwesome name="exclamation-circle" size={48} color={COLORS.error} style={{ marginBottom: 16 }} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAgencyDashboard}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          <LinearGradient
            colors={["#5B3CF0", "#7B5BFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.card, styles.heroCard]}
          >
            <View style={styles.heroInfo}>
              <Text style={styles.sectionTitleWhite}>Mi Agencia</Text>
              <Text style={styles.agencyNameWhite}>{agency?.name || "Agencia Turismo"}</Text>
              <View style={styles.heroRow}>
                <FontAwesome name="envelope" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.agencyDetailWhite}>{agency?.email || "—"}</Text>
              </View>
              {agency?.phone && (
                <View style={styles.heroRow}>
                  <FontAwesome name="phone" size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.agencyDetailWhite}>{agency.phone}</Text>
                </View>
              )}
              {agency?.website && (
                <View style={styles.heroRow}>
                  <FontAwesome name="globe" size={12} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.agencyDetailWhite}>{agency.website}</Text>
                </View>
              )}
            </View>
            <View style={styles.heroIconWrapper}>
              <FontAwesome name="briefcase" size={42} color="rgba(255,255,255,0.15)" />
            </View>
          </LinearGradient>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <FontAwesome name="line-chart" size={18} color={ACCENT} />
                <Text style={styles.sectionTitle}>Cierre Mensual (30 d)</Text>
              </View>
              <TouchableOpacity style={styles.linkButton} onPress={handleCreatePackage}>
                <FontAwesome name="plus" size={12} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={styles.linkText}>Paquete</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <View style={styles.metricIconWrap}>
                  <FontAwesome name="shopping-bag" size={14} color="#7B5BFF" />
                </View>
                <Text style={styles.metricLabel}>Reservas</Text>
                <Text style={styles.metricValue}>
                  {dashboard?.salesSummary?.totalSold ?? 0}
                </Text>
              </View>
              <View style={styles.metricBox}>
                <View style={[styles.metricIconWrap, { backgroundColor: "rgba(46, 204, 113, 0.15)" }]}>
                  <FontAwesome name="money" size={14} color="#2ECC71" />
                </View>
                <Text style={styles.metricLabel}>Ingresos BR</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(dashboard?.salesSummary?.totalRevenue)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={[styles.cardHeader, { marginBottom: SPACING.lg }]}>
              <FontAwesome name="star" size={18} color="#F39C12" />
              <Text style={styles.sectionTitle}>Paquetes Populares</Text>
            </View>
            {topPackages.length === 0 ? (
              <Text style={styles.emptyText}>Todavía no hay reservaciones.</Text>
            ) : (
              topPackages.map((item, i) => (
                <View key={`pkg-${item.packageId}`} style={styles.barRow}>
                  <Text style={styles.barRank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {item.title || "Paquete"}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${((item.sold || 0) / maxSold) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.barValue}>{item.sold || 0}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <View style={[styles.cardHeader, { marginBottom: SPACING.lg }]}>
              <FontAwesome name="map" size={18} color={ACCENT} />
              <Text style={styles.sectionTitle}>Atractivos Populares</Text>
            </View>
            {topPlaces.length === 0 ? (
              <Text style={styles.emptyText}>Sin datos para mostrar.</Text>
            ) : (
              topPlaces.map((item, i) => (
                <View key={`place-${item.place_id}`} style={styles.barRow}>
                  <Text style={styles.barRank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.barLabel} numberOfLines={1}>
                      {item.name || "Lugar"}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFillSecondary,
                          { width: `${((item.visits || 0) / maxVisits) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.barValue}>{item.visits || 0}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <View style={[styles.cardHeader, { marginBottom: SPACING.lg }]}>
              <FontAwesome name="archive" size={18} color={COLORS.text} />
              <Text style={styles.sectionTitle}>Catálogo Activo</Text>
            </View>
            {(dashboard?.packages || []).length === 0 ? (
              <Text style={styles.emptyText}>No has creado paquetes aún.</Text>
            ) : (
              dashboard.packages.map((pkg, i) => (
                <View key={`agency-pkg-${pkg.id}`} style={[styles.packageRow, i === dashboard.packages.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.packageIconWrap}>
                    <FontAwesome name="suitcase" size={16} color={COLORS.white} />
                  </View>
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageTitle}>{pkg.title}</Text>
                    <Text style={styles.packageMeta}>
                      {pkg.city || "Ciudad"} • {pkg.days || 0} dias
                    </Text>
                  </View>
                  <Text style={styles.packagePrice}>{formatCurrency(pkg.price)}</Text>
                </View>
              ))
            )}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
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
  heroCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.xl,
    overflow: "hidden",
  },
  heroIconWrapper: {
    marginRight: SPACING.sm,
  },
  heroInfo: {
    flex: 1,
    paddingRight: SPACING.md,
    zIndex: 2,
  },
  sectionTitleWhite: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  agencyNameWhite: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "800",
    color: COLORS.white,
    marginBottom: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  agencyDetailWhite: {
    fontSize: FONT_SIZES.sm,
    color: "rgba(255, 255, 255, 0.9)",
  },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: ACCENT,
    borderRadius: 999,
  },
  linkText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },
  metricsRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  metricBox: {
    flex: 1,
    backgroundColor: "#F9FAFf",
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E9F2",
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(91, 60, 240, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginBottom: 4,
    fontWeight: "600",
  },
  metricValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "800",
    color: COLORS.text,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  barRank: {
    width: 24,
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.textLight,
  },
  barLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  barTrack: {
    height: 6,
    backgroundColor: "#F4F6F9",
    borderRadius: 999,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: ACCENT,
    borderRadius: 999,
  },
  barFillSecondary: {
    height: "100%",
    backgroundColor: "#7B5BFF",
    borderRadius: 999,
  },
  barValue: {
    width: 44,
    textAlign: "right",
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
  },
  packageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F6F9",
  },
  packageIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#CCD1DE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  packageInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  packageTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  packageMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  packagePrice: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "800",
    color: ACCENT,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: 16,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: "center",
    paddingVertical: SPACING.md,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    textAlign: "center",
    marginBottom: SPACING.lg,
    fontWeight: "500",
  },
  retryButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    backgroundColor: ACCENT,
    borderRadius: 999,
  },
  retryText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
  },
});

export default AgencyDashboardScreen;
