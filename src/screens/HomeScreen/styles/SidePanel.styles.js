import { Platform, StyleSheet } from "react-native";
import {
  COLORS,
  FONT_SIZES,
  SPACING,
} from "../../../utils/constants";

const PANEL_COLORS = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  surfaceSoft: "#F1F5F9",

  primary: "#0E7490",
  primaryDark: "#155E75",
  primarySoft: "#ECFEFF",

  success: "#047857",
  successDark: "#065F46",
  successSoft: "#D1FAE5",

  warningSoft: "#FFF7ED",
  warningBorder: "#FED7AA",

  title: "#0F172A",
  body: "#475569",
  muted: "#64748B",

  border: "#E2E8F0",
  borderStrong: "#CBD5E1",

  overlay: "rgba(15, 23, 42, 0.42)",
};

export default StyleSheet.create({
  sidePanelOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    elevation: 999,
  },

  sidePanelOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: PANEL_COLORS.overlay,
  },

  sidePanel: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,

    backgroundColor: PANEL_COLORS.background,

    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,

    shadowColor: "#0F172A",
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: {
      width: 8,
      height: 0,
    },

    elevation: 18,
  },

  sidePanelSurface: {
    flex: 1,

    backgroundColor: PANEL_COLORS.background,

    paddingTop:
      Platform.OS === "ios"
        ? SPACING.xxl * 1.15
        : SPACING.lg,

    paddingHorizontal: SPACING.lg,

    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,

    borderRightWidth: 1,
    borderRightColor: "rgba(148, 163, 184, 0.20)",

    overflow: "hidden",
  },

  sidePanelScrollContent: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxl * 1.5,
  },

  sidePanelBackdropArt: {
    ...StyleSheet.absoluteFillObject,
  },

  sidePanelWashTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 190,
    backgroundColor: "rgba(236, 254, 255, 0.52)",
  },

  sidePanelWashBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 240,
    backgroundColor: "rgba(255, 247, 237, 0.44)",
  },

  sidePanelParticle: {
    position: "absolute",
    height: 3,
    borderRadius: 999,
  },

  sidePanelParticleOne: {
    width: 76,
    top: 86,
    left: 18,
    backgroundColor: "#14B8A6",
    transform: [{ rotate: "-10deg" }],
  },

  sidePanelParticleTwo: {
    width: 58,
    top: 148,
    left: -22,
    backgroundColor: "#FB923C",
    transform: [{ rotate: "12deg" }],
  },

  sidePanelParticleThree: {
    width: 86,
    top: "44%",
    left: -44,
    backgroundColor: "#38BDF8",
    transform: [{ rotate: "-7deg" }],
  },

  sidePanelParticleFour: {
    width: 68,
    bottom: 160,
    left: 8,
    backgroundColor: "#8B5CF6",
    transform: [{ rotate: "9deg" }],
  },

  sidePanelParticleFive: {
    width: 52,
    bottom: 86,
    left: -18,
    backgroundColor: "#0EA5A4",
    transform: [{ rotate: "-14deg" }],
  },

  sidePanelHero: {
    minHeight: 70,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(14, 116, 144, 0.14)",
    backgroundColor: "rgba(255, 255, 255, 0.86)",
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    shadowColor: PANEL_COLORS.title,
    shadowOpacity: 0.055,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 2,
  },

  sidePanelHeroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(14, 116, 144, 0.16)",
    backgroundColor: PANEL_COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  sidePanelHeroKicker: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "900",
    color: PANEL_COLORS.primary,
    textTransform: "uppercase",
  },

  sidePanelHeroTitle: {
    marginTop: 2,
    fontSize: FONT_SIZES.md,
    lineHeight: 21,
    fontWeight: "900",
    color: PANEL_COLORS.title,
  },

  /*
   * Área táctil más amplia que el indicador visual.
   * Esto permite abrir/cerrar el panel con mayor facilidad.
   */
  sidePanelHandlePress: {
    position: "absolute",
    left: 0,
    top: "50%",

    width: 48,
    height: 150,
    marginTop: -75,

    alignItems: "flex-start",
    justifyContent: "center",

    zIndex: 1000,
    elevation: 1000,
  },

  sidePanelHandleTouch: {
    width: 48,
    height: 150,
    alignItems: "flex-start",
    justifyContent: "center",
  },

  sidePanelHandle: {
    position: "absolute",
    left: 6,
    width: 11,
    height: 104,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.58)",

    backgroundColor: PANEL_COLORS.primary,

    shadowColor: PANEL_COLORS.primaryDark,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 5,
      height: 0,
    },

    elevation: 10,
  },

  /*
   * Encabezado
   */
  sidePanelHeader: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,

    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",

    gap: SPACING.md,
  },

  sidePanelTitle: {
    flex: 1,

    fontSize: FONT_SIZES.lg,
    lineHeight: 26,
    fontWeight: "800",

    color: PANEL_COLORS.title,
    letterSpacing: -0.25,
  },

  sidePanelSubtitle: {
    marginTop: 5,

    fontSize: FONT_SIZES.sm,
    lineHeight: 20,

    color: PANEL_COLORS.muted,
  },

  sidePanelCountBadge: {
    minWidth: 34,
    height: 34,

    paddingHorizontal: SPACING.sm,

    borderRadius: 17,

    backgroundColor: PANEL_COLORS.successSoft,
    borderWidth: 1,
    borderColor: "rgba(4, 120, 87, 0.12)",

    alignItems: "center",
    justifyContent: "center",
  },

  sidePanelCountText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "800",
    color: PANEL_COLORS.success,
  },

  /*
   * Estados: cargando, vacío y error
   */
  sidePanelLoader: {
    marginTop: SPACING.xl,
  },

  sidePanelEmpty: {
    marginTop: SPACING.xl,

    fontSize: FONT_SIZES.sm,
    lineHeight: 21,

    color: PANEL_COLORS.muted,
    textAlign: "center",
  },

  sidePanelStateCard: {
    marginTop: SPACING.lg,

    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,

    borderRadius: 20,
    borderWidth: 1,
    borderColor: PANEL_COLORS.border,

    backgroundColor: PANEL_COLORS.surface,

    alignItems: "center",

    shadowColor: PANEL_COLORS.title,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 2,
  },

  sidePanelStateIcon: {
    width: 56,
    height: 56,

    marginBottom: SPACING.md,

    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(14, 116, 144, 0.14)",

    backgroundColor: PANEL_COLORS.primarySoft,

    alignItems: "center",
    justifyContent: "center",
  },

  sidePanelStateIconError: {
    backgroundColor: PANEL_COLORS.warningSoft,
    borderColor: PANEL_COLORS.warningBorder,
  },

  sidePanelStateTitle: {
    fontSize: FONT_SIZES.md,
    lineHeight: 22,
    fontWeight: "800",

    color: PANEL_COLORS.title,
    textAlign: "center",
  },

  sidePanelStateDescription: {
    maxWidth: 280,
    marginTop: SPACING.xs,

    fontSize: FONT_SIZES.sm,
    lineHeight: 20,

    color: PANEL_COLORS.muted,
    textAlign: "center",
  },

  sidePanelReloadButton: {
    minHeight: 42,

    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,

    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(14, 116, 144, 0.24)",

    backgroundColor: PANEL_COLORS.surface,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: SPACING.xs,
  },

  sidePanelReloadButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "800",
    color: PANEL_COLORS.primary,
  },

  /*
   * Lista principal
   */
  sidePanelList: {
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },

  sidePanelItemAnimatedWrap: {
    width: "100%",
  },

  sidePanelItemCard: {
    minHeight: 94,

    padding: SPACING.md,

    borderRadius: 18,
    borderWidth: 1,
    borderColor: PANEL_COLORS.border,

    backgroundColor: "rgba(255, 255, 255, 0.92)",

    flexDirection: "row",
    alignItems: "center",

    gap: SPACING.md,

    shadowColor: PANEL_COLORS.title,
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 2,
  },

  sidePanelThumb: {
    width: 72,
    height: 72,

    borderRadius: 15,

    backgroundColor: PANEL_COLORS.surfaceSoft,

    alignItems: "center",
    justifyContent: "center",

    overflow: "hidden",
  },

  sidePanelThumbImage: {
    width: "100%",
    height: "100%",
  },

  sidePanelItemInfo: {
    flex: 1,
    minWidth: 0,
  },

  sidePanelItemTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",

    gap: SPACING.sm,
  },

  sidePanelItemTitle: {
    flex: 1,

    fontSize: FONT_SIZES.md,
    lineHeight: 21,
    fontWeight: "800",

    color: PANEL_COLORS.title,
  },

  sidePanelRatingText: {
    fontSize: FONT_SIZES.xs,
    lineHeight: 18,
    fontWeight: "800",

    color: PANEL_COLORS.success,
  },

  sidePanelInlineMeta: {
    marginTop: 5,

    flexDirection: "row",
    alignItems: "center",

    gap: 5,
  },

  sidePanelItemMeta: {
    flex: 1,

    fontSize: FONT_SIZES.xs,
    lineHeight: 18,

    color: PANEL_COLORS.muted,
  },

  sidePanelMetaRow: {
    marginTop: SPACING.sm,

    flexDirection: "row",
    flexWrap: "wrap",

    gap: 6,
  },

  sidePanelMetaPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,

    borderRadius: 999,

    backgroundColor: PANEL_COLORS.successSoft,
  },

  sidePanelMetaPillText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",

    color: PANEL_COLORS.success,
  },

  /*
   * Badges
   */
  sidePanelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 999,

    backgroundColor: PANEL_COLORS.successDark,
  },

  sidePanelBadgeOutline: {
    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(4, 120, 87, 0.14)",

    backgroundColor: PANEL_COLORS.successSoft,
  },

  sidePanelBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",

    color: PANEL_COLORS.success,
  },

  sidePanelBadgeTextLight: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",

    color: COLORS.white,
  },

  /*
   * Tarjeta destacada / lugar cercano
   */
  sidePanelNearbyCard: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,

    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",

    backgroundColor: "rgba(255, 255, 255, 0.93)",

    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 2,
  },

  sidePanelNearbyTopRow: {
    marginBottom: SPACING.sm,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    gap: SPACING.sm,
  },


  sidePanelNearbyLabelRow: {
    flex: 1,

    flexDirection: "row",
    alignItems: "center",

    gap: 5,
  },

  sidePanelNearbyKicker: {
    flex: 1,

    fontSize: FONT_SIZES.xs,
    lineHeight: 17,
    fontWeight: "700",

    color: "#0E7490",
  },

  sidePanelNearbyMainRow: {
    flexDirection: "row",
    alignItems: "center",

    gap: SPACING.sm,
  },

  sidePanelNearbyRow: {
    flexDirection: "row",
    alignItems: "center",

    gap: SPACING.md,
  },

  sidePanelNearbyThumb: {
    width: 54,
    height: 54,

    borderRadius: 13,

    backgroundColor: "#F1F5F9",

    alignItems: "center",
    justifyContent: "center",

    overflow: "hidden",
  },

  sidePanelNearbyImage: {
    width: "100%",
    height: "100%",
  },

  sidePanelNearbyInfo: {
    flex: 1,
    minWidth: 0,
  },

  sidePanelCompactBadgeRow: {
    marginBottom: SPACING.xs,

    flexDirection: "row",
    flexWrap: "wrap",

    gap: 6,
  },

  sidePanelWelcomePill: {
    alignSelf: "flex-start",

    marginBottom: SPACING.xs,
    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 999,

    backgroundColor: PANEL_COLORS.successSoft,
  },

  sidePanelNearbyTitle: {
    fontSize: FONT_SIZES.md,
    lineHeight: 21,
    fontWeight: "800",

    color: "#0F172A",
  },

  sidePanelNearbyMetaRow: {
    marginTop: 4,

    flexDirection: "row",
    alignItems: "center",

    gap: 4,
  },

  sidePanelNearbyMeta: {
    flex: 1,

    fontSize: FONT_SIZES.xs,
    lineHeight: 17,

    color: "#64748B",
  },

  sidePanelNearbyDescription: {
    marginTop: SPACING.md,

    fontSize: FONT_SIZES.sm,
    lineHeight: 20,

    color: PANEL_COLORS.body,
  },

  sidePanelDistancePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,

    borderRadius: 999,

    backgroundColor: "#ECFDF5",
  },

  sidePanelDistanceText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",

    color: "#047857",
  },

  sidePanelNearbyChevron: {
    width: 30,
    height: 30,

    borderRadius: 15,

    backgroundColor: "#ECFEFF",

    alignItems: "center",
    justifyContent: "center",
  },

  sidePanelNearbyActions: {
    marginTop: SPACING.lg,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    gap: SPACING.md,
  },

  sidePanelVisitButton: {
    minHeight: 42,

    paddingHorizontal: SPACING.lg,

    borderRadius: 999,

    backgroundColor: PANEL_COLORS.primary,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: SPACING.xs,

    shadowColor: PANEL_COLORS.primaryDark,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  sidePanelVisitButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "800",

    color: COLORS.white,
  },
});
