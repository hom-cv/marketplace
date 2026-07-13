import { useState } from "react";
import { Loader, TextInput } from "@mantine/core";
import { IconPlus, IconTrash, IconHanger } from "@tabler/icons-react";
import {
  useBrands,
  useCreateBrandMutation,
  useDeleteBrandMutation,
} from "@/hooks/useBrands";
import { Alert } from "@/components/Alert";
import { Button } from "@/components/Button";
import { EmptyStateCard } from "@/components/EmptyStateCard";
import { notifyError, notifySuccess } from "@/utils/notify";
import { getErrorMessage } from "@/utils/error";
import shared from "@/styles/listPage.module.css";
import styles from "./BrandsPage.module.css";

export function BrandsPage() {
  const [name, setName] = useState("");

  const { data: brands, isLoading, error } = useBrands();
  const createMutation = useCreateBrandMutation();
  const deleteMutation = useDeleteBrandMutation();

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed || createMutation.isPending) return;
    createMutation.mutate(trimmed, {
      onSuccess: () => {
        notifySuccess("Brand added");
        setName("");
      },
      onError: (e) => notifyError(getErrorMessage(e, "Failed to add brand")),
    });
  };

  const handleDelete = (slug: string, brandName: string) => {
    if (!window.confirm(`Delete "${brandName}"? Listings keep their other details but lose this brand.`)) {
      return;
    }
    deleteMutation.mutate(slug, {
      onSuccess: () => notifySuccess("Brand deleted"),
      onError: (e) => notifyError(getErrorMessage(e, "Failed to delete brand")),
    });
  };

  if (isLoading) {
    return (
      <div className={shared.loading}>
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" title="Error">
        {getErrorMessage(error, "Failed to load brands")}
      </Alert>
    );
  }

  const items = brands ?? [];

  return (
    <div className={shared.container}>
      <h1 className={shared.title}>Brands</h1>

      <div className={shared.createForm}>
        <p className={shared.createFormTitle}>Add a Brand</p>
        <div className={styles.addRow}>
          <TextInput
            placeholder="e.g. Comme des Garçons"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            maxLength={128}
            radius="xs"
            className={styles.addInput}
          />
          <Button
            variant="primary"
            size="sm"
            leftIcon={<IconPlus size={14} />}
            onClick={handleAdd}
            disabled={!name.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      </div>

      <div className={shared.toolbar}>
        <span className={shared.count}>{items.length} total</span>
      </div>

      {items.length === 0 ? (
        <EmptyStateCard
          icon={<IconHanger size={24} />}
          title="No brands"
          description="Add a brand so sellers can pick it when listing."
        />
      ) : (
        <div className={shared.list}>
          {items.map((brand) => (
            <div key={brand.slug} className={`${shared.item} ${styles.brandRow}`}>
              <div>
                <p className={shared.itemTitle}>{brand.name}</p>
                <span className={styles.slug}>{brand.slug}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<IconTrash size={14} />}
                onClick={() => handleDelete(brand.slug, brand.name)}
                disabled={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
