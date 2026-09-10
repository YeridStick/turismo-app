import { Dimensions } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../../../utils/constants";
export { COLORS, SPACING, FONT_SIZES };

export const screenWidth = Dimensions.get("window").width;
export const screenHeight = Dimensions.get("window").height;

export const IMAGE_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAukB9WFd2b0AAAAASUVORK5CYII=";

export const MAX_DISTANCE_KM = 100;
export const DISTANCE_OPTIONS = [1, 2, 5, 10, 20, 50, MAX_DISTANCE_KM];

export const FALLBACK_CENTER = { latitude: 2.9386, longitude: -75.2811 };

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1600&q=80";

export const HERO_VIDEO = null;

export const MAX_AR_MODEL_BYTES = 25 * 1024 * 1024;

export const CATEGORIES_LIST = [
  { id: "todos", name: "Todos" },
  { id: 1, name: "Mirador" },
  { id: 2, name: "Museo" },
  { id: 3, name: "Cascada" },
  { id: 4, name: "Embalse/Represa" },
  { id: 5, name: "Termales" },
  { id: 6, name: "Desierto" },
  { id: 7, name: "Parque" },
];

export const NAV_TABS = [
  { id: "todos", label: "Todos" },
  { id: 1, label: "Mirador" },
  { id: 2, label: "Museo" },
  { id: 3, label: "Cascada" },
  { id: 4, label: "Embalse/Represa" },
  { id: 5, label: "Termales" },
  { id: 6, label: "Desierto" },
  { id: 7, label: "Parque" },
];

export const PACKAGE_GRADIENTS = [
  ["#156436", "#FED201"],
  ["#156436", "#FED201"],
  ["#FE6C01", "#FED201"],
  ["#FE6C01", "#FED201"],
];
