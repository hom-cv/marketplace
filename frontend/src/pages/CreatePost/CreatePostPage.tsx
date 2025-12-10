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
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCheck,
  IconPlus,
  IconX,
  IconPhoto,
  IconBuildingStore,
} from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { createPost } from "@/api/posts";
import { useAuthStore } from "@/stores/authStore";
import type { PostType } from "@/api/types/post";
import styles from "./CreatePostPage.module.css";

const postTypeOptions = [
  { value: "SHIRT", label: "Shirt" },
  { value: "PANTS", label: "Pants" },
  { value: "JACKET", label: "Jacket" },
  { value: "SHOES", label: "Shoes" },
  { value: "ACCESSORIES", label: "Accessories" },
  { value: "OTHER", label: "Other" },
];

export function CreatePostPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PostType | null>(null);
  const [price, setPrice] = useState<number | string>("");
  const [images, setImages] = useState<File[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !type || !price) return;

    mutation.mutate({
      title,
      description,
      type,
      price: typeof price === "string" ? parseFloat(price) : price,
      images: images.length > 0 ? images : undefined,
    });
  };

  const isValid = title && description && type && price;

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
              Seller Verification Required
            </Title>
            <Text c="dimmed" ta="center" maw={400}>
              You need to be a verified seller to create listings.
              Complete seller verification to start selling on the marketplace.
            </Text>
            <Button
              component={Link}
              to="/app/become-seller"
              size="lg"
              leftSection={<IconBuildingStore size={18} />}
            >
              Become a Seller
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
              No images uploaded
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
                Cover
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
        Create Listing
      </Title>
      <Text c="dimmed" mb="xl">
        List your item on the marketplace
      </Text>

      {mutation.error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="lg">
          {mutation.error instanceof Error ? mutation.error.message : "Failed to create listing"}
        </Alert>
      )}

      {mutation.isSuccess && (
        <Alert icon={<IconCheck size={16} />} title="Success" color="green" mb="lg">
          Listing created successfully!
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
                label="Title"
                placeholder="e.g., Vintage Levi's Denim Jacket"
                required
                value={title}
                onChange={(e) => setTitle(e.currentTarget.value)}
                maxLength={200}
              />

              <Textarea
                label="Description"
                placeholder="Describe your item - condition, size, brand, etc."
                required
                minRows={4}
                value={description}
                onChange={(e) => setDescription(e.currentTarget.value)}
                maxLength={5000}
              />

              <SimpleGrid cols={2}>
                <Select
                  label="Category"
                  placeholder="Select type"
                  required
                  data={postTypeOptions}
                  value={type}
                  onChange={(value) => setType(value as PostType)}
                />

                <NumberInput
                  label="Price ($)"
                  placeholder="0.00"
                  required
                  min={0.01}
                  max={1000000}
                  decimalScale={2}
                  fixedDecimalScale
                  value={price}
                  onChange={setPrice}
                />
              </SimpleGrid>

              <Button
                type="submit"
                fullWidth
                size="lg"
                mt="md"
                loading={mutation.isPending}
                disabled={!isValid}
              >
                Create Listing
              </Button>
            </Stack>
          </Grid.Col>
        </Grid>
      </form>
    </Container>
  );
}

