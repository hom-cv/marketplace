/**
 * Create Post Page - Form to create a new marketplace listing
 * Split layout: Image preview on left, form on right
 */

import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Container,
  Title,
  Text,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Button,
  Stack,
  Alert,
  Grid,
  Box,
  Image,
  Group,
  ActionIcon,
  FileButton,
  SimpleGrid,
  Badge,
  Paper,
  ThemeIcon,
  Collapse,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconCheck,
  IconPlus,
  IconX,
  IconPhoto,
  IconBuildingStore,
  IconRuler,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { createPost } from "@/api/posts";
import { useAuthStore } from "@/stores/authStore";
import { EarningsPreview } from "@/components/EarningsPreview";
import { MeasurementsDiagram } from "@/components/MeasurementsDiagram";
import type { PostType, Measurements } from "@/api/types/post";
import { getSizesForType } from "@/api/types/post";
import styles from "./CreatePostPage.module.css";

export function CreatePostPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation("listings");

  // Category options with translations
  const postTypeOptions = useMemo(() => [
    { value: "SHIRT", label: t("categories.shirt") },
    { value: "PANTS", label: t("categories.pants") },
    { value: "JACKET", label: t("categories.jacket") },
    { value: "SHOES", label: t("categories.shoes") },
    { value: "ACCESSORIES", label: t("categories.accessories") },
    { value: "OTHER", label: t("categories.other") },
  ], [t]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PostType | null>(null);
  const [price, setPrice] = useState<number | string>("");
  const [shippingCost, setShippingCost] = useState<number | string>(0);
  const [size, setSize] = useState<string | null>(null);
  const [measurements, setMeasurements] = useState<Measurements>({});
  const [images, setImages] = useState<File[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [measurementsOpen, { toggle: toggleMeasurements }] = useDisclosure(false);
  const [extraMeasurements, setExtraMeasurements] = useState<Array<{ label: string; value: string }>>([]);

  // Get available sizes based on selected category
  const sizeOptions = useMemo(() => {
    if (!type) return [];
    const sizes = getSizesForType(type);
    return sizes.map((s) => {
      // For shoes, show EU prefix
      if (type === "SHOES") {
        return { value: s, label: `EU ${s}` };
      }
      return { value: s, label: s };
    });
  }, [type]);

  // Reset size when type changes
  useEffect(() => {
    setSize(null);
    setMeasurements({});
    setExtraMeasurements([]);
  }, [type]);

  // Get measurement fields based on category
  const measurementFields = useMemo(() => {
    if (!type) return [];

    switch (type) {
      case "SHIRT":
      case "JACKET":
      case "OTHER":
        return [
          { key: "shoulder", label: t("measurements.shoulder") },
          { key: "length", label: t("measurements.length") },
          { key: "bust", label: t("measurements.bust") },
          { key: "sleeve", label: t("measurements.sleeve") },
        ];
      case "PANTS":
        return [
          { key: "total_length", label: t("measurements.totalLength") },
          { key: "inseam", label: t("measurements.inseam") },
          { key: "rise", label: t("measurements.rise") },
          { key: "hip", label: t("measurements.hip") },
        ];
      case "SHOES":
        return [
          { key: "insole_length", label: t("measurements.insoleLength") },
        ];
      default:
        return [];
    }
  }, [type, t]);

  const imagePreviews = useMemo(() => {
    return images.map((file) => URL.createObjectURL(file));
  }, [images]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      navigate({ to: "/app" });
    },
  });

  const handleAddImages = (files: File[]) => {
    setImages((prev) => [...prev, ...files]);
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (selectedImageIndex >= images.length - 1) {
      setSelectedImageIndex(Math.max(0, images.length - 2));
    }
  };

  const handleMeasurementChange = (key: string, value: number | string) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    setMeasurements((prev) => ({
      ...prev,
      [key]: isNaN(numValue) ? undefined : numValue,
    }));
  };

  const handleAddExtraMeasurement = () => {
    setExtraMeasurements((prev) => [...prev, { label: "", value: "" }]);
  };

  const handleExtraMeasurementChange = (index: number, field: "label" | "value", newValue: string) => {
    setExtraMeasurements((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: newValue };
      return updated;
    });
  };

  const handleRemoveExtraMeasurement = (index: number) => {
    setExtraMeasurements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !type || !price || !size) return;

    // Filter out undefined measurements
    const cleanMeasurements = Object.fromEntries(
      Object.entries(measurements).filter(([, v]) => v !== undefined && v !== null)
    ) as Measurements;

    // Add extra measurements to the object
    const allMeasurements = { ...cleanMeasurements } as Record<string, number | undefined>;
    extraMeasurements.forEach((extra) => {
      if (extra.label && extra.value) {
        const key = extra.label.toLowerCase().replace(/\s+/g, "_");
        if (allMeasurements[key] === undefined) {
          allMeasurements[key] = parseFloat(extra.value);
        }
      }
    });

    const finalMeasurements = Object.keys(allMeasurements).length > 0 ? allMeasurements as Measurements : undefined;

    mutation.mutate({
      title,
      description,
      type,
      price: typeof price === "string" ? parseFloat(price) : price,
      shipping_cost: typeof shippingCost === "string" ? parseFloat(shippingCost) : shippingCost,
      size,
      measurements: finalMeasurements,
      images: images.length > 0 ? images : undefined,
    });
  };

  const isValid = title && description && type && price && size;

  // Check if user is a verified seller
  if (!user?.is_seller) {
    return (
      <Container size="sm" py="xl">
        <Paper shadow="sm" p="xl" radius="md">
          <Stack align="center" gap="lg">
            <ThemeIcon size={64} radius="xl" color="orange" variant="light">
              <IconBuildingStore size={32} />
            </ThemeIcon>
            <Title order={2} ta="center">
              {t("seller.verificationRequired")}
            </Title>
            <Text c="dimmed" ta="center" maw={400}>
              {t("seller.verificationMessage")}
            </Text>
            <Button
              component={Link}
              to="/app/become-seller"
              size="lg"
              leftSection={<IconBuildingStore size={18} />}
            >
              {t("seller.becomeSeller")}
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  const ImagePreviewSection = () => (
    <Box className={styles.imageSection}>
      {/* Main Image Display */}
      <Box className={styles.mainImageWrapper}>
        {images.length > 0 ? (
          <Image
            src={imagePreviews[selectedImageIndex]}
            alt="Preview"
            className={styles.mainImage}
            fit="contain"
            radius="md"
          />
        ) : (
          <Box className={styles.imagePlaceholder}>
            <IconPhoto size={64} stroke={1} color="var(--mantine-color-gray-4)" />
            <Text c="dimmed" size="sm" mt="md">
              {t("images.noImages")}
            </Text>
          </Box>
        )}
      </Box>

      {/* Thumbnail Carousel */}
      <Group gap="xs" mt="md" wrap="nowrap" className={styles.thumbnailRow}>
        {images.map((_, index) => (
          <Box
            key={index}
            className={`${styles.thumbnail} ${index === selectedImageIndex ? styles.thumbnailActive : ""}`}
            onClick={() => setSelectedImageIndex(index)}
          >
            <Image
              src={imagePreviews[index]}
              alt={`Thumbnail ${index + 1}`}
              fit="cover"
              radius="sm"
            />
            {index === 0 && (
              <Badge
                className={styles.coverBadge}
                size="xs"
                color="blue"
              >
                {t("images.cover")}
              </Badge>
            )}
            <ActionIcon
              className={styles.thumbnailRemove}
              size="xs"
              variant="transparent"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage(index);
              }}
            >
              <IconX size={10} />
            </ActionIcon>
          </Box>
        ))}

        {/* Add Image Button */}
        <FileButton onChange={(files) => files && handleAddImages(files)} accept="image/*" multiple>
          {(props) => (
            <Box {...props} className={styles.addImageButton}>
              <IconPlus size={20} />
            </Box>
          )}
        </FileButton>
      </Group>
    </Box>
  );

  return (
    <Container size="lg" my={40}>
      <Title order={2} mb="xs">
        {t("create.title")}
      </Title>
      <Text c="dimmed" mb="xl">
        {t("create.subtitle")}
      </Text>

      {mutation.error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="lg">
          {mutation.error instanceof Error ? mutation.error.message : t("create.error")}
        </Alert>
      )}

      {mutation.isSuccess && (
        <Alert icon={<IconCheck size={16} />} title="Success" color="green" mb="lg">
          {t("create.success")}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid gutter="xl">
          {/* Left: Image Preview */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <ImagePreviewSection />
          </Grid.Col>

          {/* Right: Form */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="md">
              <TextInput
                label={t("create.form.titleLabel")}
                placeholder={t("create.form.titlePlaceholder")}
                required
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                maxLength={200}
              />

              <Textarea
                label={t("create.form.description")}
                placeholder={t("create.form.descriptionPlaceholder")}
                required
                minRows={4}
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                maxLength={5000}
              />

              <SimpleGrid cols={2}>
                <Select
                  label={t("create.form.category")}
                  placeholder={t("create.form.categoryPlaceholder")}
                  required
                  data={postTypeOptions}
                  value={type}
                  onChange={(value) => setType(value as PostType)}
                />

                <Select
                  label={t("create.form.size")}
                  placeholder={t("create.form.sizePlaceholder")}
                  required
                  data={sizeOptions}
                  value={size}
                  onChange={setSize}
                  disabled={!type}
                />
              </SimpleGrid>

              <SimpleGrid cols={2}>
                <NumberInput
                  label={t("create.form.price")}
                  placeholder="0.00"
                  required
                  min={0.01}
                  max={1000000}
                  decimalScale={2}
                  fixedDecimalScale
                  value={price}
                  onChange={setPrice}
                />

                <NumberInput
                  label={t("create.form.shippingCost")}
                  description={t("create.form.shippingDescription")}
                  placeholder="0.00"
                  min={0}
                  max={10000}
                  decimalScale={2}
                  fixedDecimalScale
                  value={shippingCost}
                  onChange={setShippingCost}
                />
              </SimpleGrid>

              {/* Optional Measurements Section */}
              {measurementFields.length > 0 && (
                <Box>
                  <Button
                    variant="subtle"
                    color="gray"
                    size="sm"
                    leftSection={<IconRuler size={16} />}
                    rightSection={measurementsOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                    onClick={toggleMeasurements}
                  >
                    {t("create.form.addMeasurements")}
                  </Button>
                  <Collapse in={measurementsOpen}>
                    <Paper p="md" mt="sm" withBorder radius="md">
                      <Text size="sm" c="dimmed" mb="md">
                        {t("create.form.measurementsDescription")}
                      </Text>

                      {/* SVG Diagram */}
                      {type && <MeasurementsDiagram type={type} measurements={measurements} />}

                      {/* Standard Measurements */}
                      <SimpleGrid cols={{ base: 2, sm: 4 }}>
                        {measurementFields.map((field) => (
                          <NumberInput
                            key={field.key}
                            label={field.label}
                            placeholder="cm"
                            size="sm"
                            min={0}
                            max={200}
                            decimalScale={1}
                            value={(measurements as Record<string, number | undefined>)[field.key] ?? ""}
                            onChange={(value) => handleMeasurementChange(field.key, value)}
                          />
                        ))}
                      </SimpleGrid>

                      {/* Extra Measurements */}
                      {extraMeasurements.length > 0 && (
                        <Box mt="md">
                          <Text size="sm" fw={500} mb="xs">{t("create.form.extraMeasurements")}</Text>
                          <Stack gap="xs">
                            {extraMeasurements.map((extra, index) => (
                              <Group key={index} gap="xs">
                                <TextInput
                                  placeholder={t("create.form.measurementLabel")}
                                  size="sm"
                                  style={{ flex: 1 }}
                                  value={extra.label}
                                  onChange={(e) => handleExtraMeasurementChange(index, "label", e.currentTarget.value)}
                                />
                                <NumberInput
                                  placeholder="cm"
                                  size="sm"
                                  style={{ width: 100 }}
                                  min={0}
                                  max={200}
                                  decimalScale={1}
                                  value={extra.value}
                                  onChange={(v) => handleExtraMeasurementChange(index, "value", String(v))}
                                />
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="sm"
                                  onClick={() => handleRemoveExtraMeasurement(index)}
                                >
                                  <IconX size={14} />
                                </ActionIcon>
                              </Group>
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {/* Add Extra Measurement Button */}
                      <Button
                        variant="subtle"
                        size="xs"
                        leftSection={<IconPlus size={14} />}
                        mt="md"
                        onClick={handleAddExtraMeasurement}
                      >
                        {t("create.form.addExtraMeasurement")}
                      </Button>
                    </Paper>
                  </Collapse>
                </Box>
              )}

              {price && typeof price === "number" && price > 0 && (
                <EarningsPreview
                  itemPrice={price}
                  shippingCost={typeof shippingCost === "number" ? shippingCost : 0}
                />
              )}

              <Button
                type="submit"
                fullWidth
                size="lg"
                mt="md"
                loading={mutation.isPending}
                disabled={!isValid}
              >
                {t("create.form.submit")}
              </Button>
            </Stack>
          </Grid.Col>
        </Grid>
      </form>
    </Container>
  );
}
