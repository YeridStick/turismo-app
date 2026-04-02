import { useState } from "react";

const usePayment = () => {
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    email: "",
    cardNumber: "",
    cardName: "",
    expiry: "",
    cvv: "",
  });

  const handlePaymentChange = (field, value) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const openPayment = (pkg) => {
    setSelectedPackage(pkg);
    setPaymentVisible(true);
  };

  const closePayment = () => {
    setPaymentVisible(false);
    // Reset form optionally?
    setPaymentForm({
      email: "",
      cardNumber: "",
      cardName: "",
      expiry: "",
      cvv: "",
    });
  };

  return {
    paymentVisible,
    setPaymentVisible,
    selectedPackage,
    setSelectedPackage,
    paymentForm,
    setPaymentForm,
    handlePaymentChange,
    openPayment,
    closePayment,
  };
};

export default usePayment;
