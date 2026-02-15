import { IconMapPin, IconCreditCard, IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import styles from "../CheckoutPage.module.css";

interface CheckoutStepperProps {
  currentStep: number;
}

export function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  const { t } = useTranslation("common");

  return (
    <div className={styles.stepper}>
      <div
        className={`${styles.step} ${
          currentStep === 0
            ? styles.stepActive
            : currentStep > 0
              ? styles.stepCompleted
              : ""
        }`}
      >
        <span className={styles.stepNumber}>
          {currentStep > 0 ? <IconCheck size={14} /> : "1"}
        </span>
        <IconMapPin size={16} />
        {t("checkout.shipping")}
      </div>
      <div
        className={`${styles.step} ${
          currentStep === 1 ? styles.stepActive : ""
        }`}
      >
        <span className={styles.stepNumber}>2</span>
        <IconCreditCard size={16} />
        {t("checkout.payment")}
      </div>
    </div>
  );
}
