import {
  Modal,
  Stack,
  NumberInput,
  Textarea,
  Group,
  Button,
} from "@mantine/core";
import { BanEntityType } from "./types";

interface CreateBanModalProps {
  opened: boolean;
  onClose: () => void;

  /** The entity type being banned */
  entityType: BanEntityType;

  // ID input
  idValue: number | undefined;
  onIdChange: (value: number | undefined) => void;

  // Reason input
  reason: string;
  onReasonChange: (value: string) => void;

  // Submit
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function CreateBanModal({
  opened,
  onClose,
  entityType,
  idValue,
  onIdChange,
  reason,
  onReasonChange,
  onSubmit,
  isSubmitting,
}: CreateBanModalProps) {
  const entityLower = entityType.toLowerCase();

  return (
    <Modal opened={opened} onClose={onClose} title={`Ban ${entityType}`}>
      <Stack>
        <NumberInput
          label={`${entityType} ID`}
          placeholder={`Enter ${entityLower} ID to ban`}
          value={idValue}
          onChange={(val) => onIdChange(val === '' ? undefined : val)}
          required
        />
        <Textarea
          label="Reason"
          placeholder={`Reason for banning this ${entityLower}...`}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          required
          rows={3}
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="red"
            onClick={onSubmit}
            loading={isSubmitting}
            disabled={!idValue || reason.length < 5}
          >
            Ban {entityType}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
