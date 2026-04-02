import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import styles from "../../styles";

const ArWebViewModal = ({
  visible,
  onClose,
  html,
  onShouldStartLoadWithRequest,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <TouchableOpacity
          style={styles.arClose}
          onPress={onClose}
        >
          <Text style={styles.arCloseText}>Cerrar</Text>
        </TouchableOpacity>
        <WebView
          originWhitelist={["*"]}
          source={{ html }}
          allowsInlineMediaPlayback
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          startInLoadingState
          onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
        />
      </View>
    </Modal>
  );
};

export default React.memo(ArWebViewModal);
