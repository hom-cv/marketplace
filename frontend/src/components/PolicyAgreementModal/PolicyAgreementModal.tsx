/**
 * PolicyAgreementModal - Modal for users to review and accept policies
 * Follows standard modal patterns from the application
 */

import { useState } from "react";
import {
  Modal,
  Button,
  Checkbox,
  Text,
  Accordion,
  Alert,
  Stack,
  Group,
  ScrollArea,
} from "@mantine/core";
import {
  IconFileText,
  IconShield,
  IconLock,
  IconReceipt,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

interface PolicyAgreementModalProps {
  opened: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function PolicyAgreementModal({
  opened,
  onClose,
  onAccept,
}: PolicyAgreementModalProps) {
  const { t } = useTranslation("policies");
  const [agreed, setAgreed] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleAccept = () => {
    if (!agreed) {
      setShowError(true);
      return;
    }
    setShowError(false);
    onAccept();
  };

  const handleClose = () => {
    setAgreed(false);
    setShowError(false);
    onClose();
  };

  const renderPolicyContent = (contentKey: string) => {
    const content = t(`policies.content.${contentKey}`, { returnObjects: true }) as Record<string, string>;

    return (
      <Stack gap="xs">
        <Text size="sm" c="dimmed">{content.intro}</Text>
        <Text size="sm" fw={500}>{content.section1Title}</Text>
        <Text size="sm" c="dimmed">{content.section1Content}</Text>
        <Text size="sm" fw={500}>{content.section2Title}</Text>
        <Text size="sm" c="dimmed">{content.section2Content}</Text>
      </Stack>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t("policies.modal.title")}
      size="lg"
      centered
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">{t("policies.modal.subtitle")}</Text>

        <ScrollArea h={300}>
          <Accordion variant="separated">
            <Accordion.Item value="terms">
              <Accordion.Control icon={<IconFileText size={18} />}>
                {t("policies.termsAndConditions")}
              </Accordion.Control>
              <Accordion.Panel>{renderPolicyContent("terms")}</Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="privacy">
              <Accordion.Control icon={<IconShield size={18} />}>
                {t("policies.privacyPolicy")}
              </Accordion.Control>
              <Accordion.Panel>{renderPolicyContent("privacy")}</Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="dataProtection">
              <Accordion.Control icon={<IconLock size={18} />}>
                {t("policies.dataProtection")}
              </Accordion.Control>
              <Accordion.Panel>{renderPolicyContent("dataProtection")}</Accordion.Panel>
            </Accordion.Item>

            <Accordion.Item value="refund">
              <Accordion.Control icon={<IconReceipt size={18} />}>
                {t("policies.refundPolicy")}
              </Accordion.Control>
              <Accordion.Panel>{renderPolicyContent("refund")}</Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </ScrollArea>

        {showError && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {t("policies.modal.mustAccept")}
          </Alert>
        )}

        <Checkbox
          checked={agreed}
          onChange={(event) => {
            setAgreed(event.currentTarget.checked);
            if (event.currentTarget.checked) setShowError(false);
          }}
          label={t("policies.modal.iAgree")}
        />

        <Group justify="flex-end">
          <Button variant="light" onClick={handleClose}>
            {t("policies.modal.decline")}
          </Button>
          <Button onClick={handleAccept}>
            {t("policies.modal.accept")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
