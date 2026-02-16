/**
 * Profile edit page - Flat design
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader } from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { updateMyProfile } from "@/api/users";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage } from "@/utils/error";
import type { UpdateProfileRequest } from "@/api/types/user";
import styles from "./ProfileEditPage.module.css";

export function ProfileEditPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation("profile");
  const { t: tCommon } = useTranslation("common");

  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const [bio, setBio] = useState(user?.bio ?? "");
  const [showFullName, setShowFullName] = useState(user?.show_full_name ?? true);

  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      if (user?.username) {
        queryClient.invalidateQueries({
          queryKey: ["userProfile", user.username],
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bio.length > 500) return;

    const values: UpdateProfileRequest = {
      bio,
      show_full_name: showFullName,
    };
    updateMutation.mutate(values);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t("edit.title")}</h1>
          <p className={styles.subtitle}>{t("edit.subtitle")}</p>
        </div>

        {updateMutation.isError && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <IconAlertCircle size={18} className={`${styles.alertIcon} ${styles.alertIconError}`} />
            <div className={styles.alertContent}>
              <p className={`${styles.alertTitle} ${styles.alertTitleError}`}>
                {tCommon("status.error")}
              </p>
              <p className={styles.alertMessage}>
                {getErrorMessage(updateMutation.error, tCommon("errors.generic"))}
              </p>
            </div>
          </div>
        )}

        {updateMutation.isSuccess && (
          <div className={`${styles.alert} ${styles.alertSuccess}`}>
            <IconCheck size={18} className={`${styles.alertIcon} ${styles.alertIconSuccess}`} />
            <div className={styles.alertContent}>
              <p className={`${styles.alertTitle} ${styles.alertTitleSuccess}`}>
                {tCommon("status.success")}
              </p>
              <p className={styles.alertMessage}>
                {t("messages.profileUpdated")}
              </p>
            </div>
          </div>
        )}

        <div className={styles.card}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>{t("edit.bioLabel")}</label>
              <p className={styles.fieldDescription}>{t("edit.bioDescription")}</p>
              <textarea
                className={styles.textarea}
                placeholder={t("edit.bioPlaceholder")}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
              />
              <span className={styles.charCount}>{bio.length}/500</span>
            </div>

            <div className={styles.switchField}>
              <div className={styles.switchContent}>
                <p className={styles.switchLabel}>{t("edit.showNameLabel")}</p>
                <p className={styles.switchDescription}>{t("edit.showNameDescription")}</p>
              </div>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  className={styles.switchInput}
                  checked={showFullName}
                  onChange={(e) => setShowFullName(e.target.checked)}
                />
                <span className={styles.switchSlider} />
              </label>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={updateMutation.isPending || bio.length > 500}
            >
              {updateMutation.isPending ? (
                <Loader size="sm" color="white" />
              ) : (
                tCommon("buttons.save")
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
