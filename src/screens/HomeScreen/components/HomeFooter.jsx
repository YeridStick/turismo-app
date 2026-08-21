import React from "react";
import { ImageBackground, View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS } from "../../../utils/constants";
import styles from "../styles";

const HomeFooter = ({ imageUris = [] }) => {
  const socialIcons = [
    { name: "facebook", url: "#" },
    { name: "instagram", url: "#" },
    { name: "twitter", url: "#" },
  ];
  const footerImages = imageUris.filter(Boolean);

  return (
    <View style={styles.footer}>
      <BlurView
        intensity={60}
        tint="light"
        style={{
          padding: 20,
          borderRadius: 30,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(14, 116, 144, 0.14)",
          backgroundColor: "rgba(255,255,255,0.58)",
        }}
      >
        <View style={styles.footerHeader}>
          <View style={styles.footerLogoBox}>
            <Image
              source={require("../../../../assets/images/ecoturismo-iso-fondo-transparente.svg")}
              style={styles.footerLogoImage}
              contentFit="contain"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.footerTitle}>Ecoturismo 360</Text>
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

        {footerImages.length ? (
          <View style={styles.footerImageGrid}>
            <ImageBackground
              source={{ uri: footerImages[0] }}
              style={[styles.footerImageTile, styles.footerImageTileLarge]}
              imageStyle={styles.footerImageRadius}
              resizeMode="cover"
            >
              <View style={styles.footerImageOverlay} />
              <Text style={styles.footerImageText}>Explora rutas vivas</Text>
            </ImageBackground>
            <View style={styles.footerImageSideStack}>
              {footerImages.slice(1, 3).map((uri, index) => (
                <ImageBackground
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  style={styles.footerImageTileSmall}
                  imageStyle={styles.footerImageSmallRadius}
                  resizeMode="cover"
                >
                  <View style={styles.footerImageOverlaySoft} />
                </ImageBackground>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.footerDivider} />

        <View style={styles.footerBottomRow}>
          <Text style={styles.footerBottomText}>
            © 2025 Ecoturismo 360
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
