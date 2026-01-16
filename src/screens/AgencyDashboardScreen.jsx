import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
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
        <Text style={styles.title}>Dashboard de Agencia</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAgencyDashboard}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Mi agencia</Text>
            <Text style={styles.agencyName}>{agency?.name || "Agencia"}</Text>
            <Text style={styles.agencyDetail}>{agency?.email || "—"}</Text>
            <Text style={styles.agencyDetail}>{agency?.phone || "—"}</Text>
            <Text style={styles.agencyDetail}>{agency?.website || "—"}</Text>
            <Text style={styles.agencyDetail}>
              Registrada: {formatDate(agency?.createdAt)}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Ventas (30 dias)</Text>
              <TouchableOpacity style={styles.linkButton} onPress={handleCreatePackage}>
                <Text style={styles.linkText}>Crear paquete</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Total vendido</Text>
                <Text style={styles.metricValue}>
                  {dashboard?.salesSummary?.totalSold ?? 0}
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Ingresos</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(dashboard?.salesSummary?.totalRevenue)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Top paquetes</Text>
            {topPackages.length === 0 ? (
              <Text style={styles.emptyText}>Sin datos para mostrar.</Text>
            ) : (
              topPackages.map((item) => (
                <View key={`pkg-${item.packageId}`} style={styles.barRow}>
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
                  <Text style={styles.barValue}>{item.sold || 0}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Top lugares</Text>
            {topPlaces.length === 0 ? (
              <Text style={styles.emptyText}>Sin datos para mostrar.</Text>
            ) : (
              topPlaces.map((item) => (
                <View key={`place-${item.place_id}`} style={styles.barRow}>
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
                  <Text style={styles.barValue}>{item.visits || 0}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Paquetes activos</Text>
            {(dashboard?.packages || []).length === 0 ? (
              <Text style={styles.emptyText}>No hay paquetes registrados.</Text>
            ) : (
              dashboard.packages.map((pkg) => (
                <View key={`agency-pkg-${pkg.id}`} style={styles.packageRow}>
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
        </ScrollView>
      )}
    </View>
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  agencyName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  agencyDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    backgroundColor: ACCENT,
    borderRadius: 999,
  },
  linkText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
  },
  metricsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  metricBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 12,
  },
  metricLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  barLabel: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginRight: SPACING.sm,
  },
  barTrack: {
    flex: 2,
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 999,
    overflow: "hidden",
    marginRight: SPACING.sm,
  },
  barFill: {
    height: "100%",
    backgroundColor: ACCENT,
  },
  barFillSecondary: {
    height: "100%",
    backgroundColor: "#7B5BFF",
  },
  barValue: {
    width: 48,
    textAlign: "right",
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  packageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  packageInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  packageTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  packageMeta: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  packagePrice: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.text,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  emptyText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textLight,
    textAlign: "center",
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  retryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: ACCENT,
    borderRadius: 999,
  },
  retryText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
  },
});

export default AgencyDashboardScreen;
