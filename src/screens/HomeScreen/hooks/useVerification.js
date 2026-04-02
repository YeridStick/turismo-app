import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";

const useVerification = () => {
  const { user, requestEmailValidation, verifyEmailToken } = useAuth();
  
  const [emailVerifyVisible, setEmailVerifyVisible] = useState(false);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [emailVerifyStatus, setEmailVerifyStatus] = useState(null);
  const [verifyToken, setVerifyToken] = useState("");

  const handleRequestVerification = async () => {
    if (!user?.email) return;
    setEmailVerifyLoading(true);
    setEmailVerifyStatus(null);
    try {
      const result = await requestEmailValidation(user.email);
      if (result.success) {
        setEmailVerifyStatus({ 
          type: "success", 
          message: "Correo enviado. Revisa tu bandeja de entrada." 
        });
      } else {
        const errorMsg = result.error.includes("Brevo") 
          ? "Error de configuración (Brevo): La API Key no es válida. Contacta a soporte."
          : result.error;
        setEmailVerifyStatus({ type: "error", message: errorMsg });
      }
    } catch (e) {
      setEmailVerifyStatus({ 
        type: "error", 
        message: "Algo salió mal. Inténtalo de nuevo." 
      });
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const handleConfirmVerificationToken = async () => {
    if (!verifyToken) {
      setEmailVerifyStatus({ type: "error", message: "Por favor, ingresa el código." });
      return;
    }
    setEmailVerifyLoading(true);
    setEmailVerifyStatus(null);
    try {
      const result = await verifyEmailToken(verifyToken);
      if (result.success) {
        setEmailVerifyStatus({ 
          type: "success", 
          message: "¡Correo verificado exitosamente!" 
        });
        setTimeout(() => {
          setEmailVerifyVisible(false);
          setVerifyToken("");
          setEmailVerifyStatus(null);
        }, 1500);
      } else {
        setEmailVerifyStatus({ type: "error", message: result.error });
      }
    } catch (e) {
      setEmailVerifyStatus({ type: "error", message: "Error al validar el token." });
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  return {
    emailVerifyVisible,
    setEmailVerifyVisible,
    emailVerifyLoading,
    emailVerifyStatus,
    verifyToken,
    setVerifyToken,
    handleRequestVerification,
    handleConfirmVerificationToken,
  };
};

export default useVerification;
