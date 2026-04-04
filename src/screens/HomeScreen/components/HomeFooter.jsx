import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS } from "../../../utils/constants";
import styles from "../styles";

const HomeFooter = () => {
  const socialIcons = [
    { name: "facebook", url: "#" },
    { name: "instagram", url: "#" },
    { name: "twitter", url: "#" },
  ];

  return (
    <View style={styles.footer}>
      <BlurView
        intensity={60}
        tint="light"
        style={{ padding: 20, borderRadius: 28, overflow: 'hidden' }}
      >
        <View style={styles.footerHeader}>
          <View style={styles.footerLogoBox}>
            <FontAwesome name="globe" size={16} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerTitle}>Turismo Huila</Text>
            <Text style={styles.footerSubtitle}>Neiva, Huila · Colombia</Text>
          </View>
          <View style={styles.footerSocialRow}>
            {socialIcons.map((icon) => (
              <TouchableOpacity key={icon.name} style={styles.footerSocialButton}>
                <FontAwesome name={icon.name} size={15} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footerDivider} />

        <View style={styles.footerBottomRow}>
          <Text style={styles.footerBottomText}>
            © 2025 Turismo Huila
          </Text>
          <View style={styles.footerLegalRow}>
            <Text style={styles.footerLegalText}>Términos</Text>
            <Text style={styles.footerLegalText}>·</Text>
            <Text style={styles.footerLegalText}>Privacidad</Text>
          </View>
        </View>
      </BlurView>
    </View>
  );
};

export default React.memo(HomeFooter);
