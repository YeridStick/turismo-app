import { StyleSheet } from "react-native";
import { baseStyles } from "./Base.styles";
import { searchStyles } from "./Search.styles";
import { sectionStyles } from "./Sections.styles";
import { cardStyles } from "./Cards.styles";
import { packageStyles } from "./Packages.styles";
import { modalStyles } from "./Modals.styles";
import { detailStyles } from "./Detail.styles";

const combinedStyles = {
  ...baseStyles,
  ...searchStyles,
  ...sectionStyles,
  ...cardStyles,
  ...packageStyles,
  ...modalStyles,
  ...detailStyles,
};

export const styles = StyleSheet.create(combinedStyles);

export default styles;
