import { Loader, TextInput, SimpleGrid } from "@mantine/core";
import { IconCreditCard, IconQrcode } from "@tabler/icons-react";
import { Trans, useTranslation } from "react-i18next";
import type { UseFormReturnType } from "@mantine/form";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import formStyles from "@/styles/forms.module.css";
import styles from "../CheckoutPage.module.css";

type PaymentMethod = "card" | "promptpay";

interface CardFormValues {
  name: string;
  number: string;
  expMonth: string;
  expYear: string;
  cvv: string;
}

interface PaymentFormProps {
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  cardForm: UseFormReturnType<CardFormValues>;
  onCardSubmit: () => void;
  onPromptPaySubmit: () => void;
  total: number;
  isLoading: boolean;
}

export function PaymentForm({
  paymentMethod,
  onPaymentMethodChange,
  cardForm,
  onCardSubmit,
  onPromptPaySubmit,
  total,
  isLoading,
}: PaymentFormProps) {
  const { t } = useTranslation("common");

  const formatAmount = (v: number) =>
    v.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <Card title={t("checkout.paymentMethod")}>
      {/* Payment tabs */}
      <div className={styles.paymentTabs}>
        <button
          className={`${styles.paymentTab} ${
            paymentMethod === "card" ? styles.paymentTabActive : ""
          }`}
          onClick={() => onPaymentMethodChange("card")}
        >
          <IconCreditCard size={18} />
          {t("checkout.creditCard")}
        </button>
        <button
          className={`${styles.paymentTab} ${
            paymentMethod === "promptpay" ? styles.paymentTabActive : ""
          }`}
          onClick={() => onPaymentMethodChange("promptpay")}
        >
          <IconQrcode size={18} />
          PromptPay
        </button>
      </div>

      {/* Card form */}
      {paymentMethod === "card" && (
        <div className={formStyles.formRow}>
          <TextInput
            label={t("checkout.cardholderName")}
            placeholder={t("checkout.nameOnCard")}
            radius="xs"
            {...cardForm.getInputProps("name")}
          />
          <TextInput
            label={t("checkout.cardNumber")}
            placeholder={t("checkout.cardPlaceholder")}
            radius="xs"
            {...cardForm.getInputProps("number")}
          />
          <SimpleGrid cols={3}>
            <TextInput
              label={t("checkout.expMonth")}
              placeholder="MM"
              maxLength={2}
              radius="xs"
              {...cardForm.getInputProps("expMonth")}
            />
            <TextInput
              label={t("checkout.expYear")}
              placeholder="YY"
              maxLength={4}
              radius="xs"
              {...cardForm.getInputProps("expYear")}
            />
            <TextInput
              label={t("checkout.cvv")}
              placeholder="123"
              maxLength={4}
              radius="xs"
              {...cardForm.getInputProps("cvv")}
            />
          </SimpleGrid>
        </div>
      )}

      {/* Notice */}
      <Alert variant="info" margin="vertical">
        <Trans
          i18nKey="checkout.refundNotice"
          ns="policies"
          components={{
            refundLink: (
              <a
                href="/terms#refund-policy"
                target="_blank"
                rel="noopener noreferrer"
              />
            ),
          }}
        />
      </Alert>

      {/* Payment button */}
      {paymentMethod === "card" ? (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onCardSubmit}
          disabled={isLoading || !cardForm.isValid()}
        >
          {isLoading ? (
            <Loader size="xs" color="white" />
          ) : (
            t("checkout.payAmount", { amount: formatAmount(total) })
          )}
        </Button>
      ) : (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onPromptPaySubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader size="xs" color="white" />
          ) : (
            t("checkout.generateQR", { amount: formatAmount(total) })
          )}
        </Button>
      )}

      {/* Policy text */}
      <p className={styles.policyText}>
        <Trans
          i18nKey="checkout.paymentAcknowledgment"
          ns="policies"
          components={{
            termsLink: (
              <a href="/terms" target="_blank" rel="noopener noreferrer" />
            ),
            privacyLink: (
              <a href="/privacy" target="_blank" rel="noopener noreferrer" />
            ),
          }}
        />
      </p>
    </Card>
  );
}
