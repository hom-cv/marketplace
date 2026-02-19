/**
 * NotSellerGate - CTA card for non-verified sellers
 * Editorial design with centered content and clear call-to-action
 */

import { IconBuildingStore } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/Button";
import styles from "./NotSellerGate.module.css";

export function NotSellerGate() {
  const { t } = useTranslation("listings");

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <IconBuildingStore size={36} strokeWidth={1.5} />
        </div>
        <h2 className={styles.title}>{t("seller.verificationRequired")}</h2>
        <p className={styles.description}>{t("seller.verificationMessage")}</p>
        <Link to="/account/become-seller" className={styles.ctaLink}>
          <Button
            variant="primary"
            size="lg"
            leftIcon={<IconBuildingStore size={18} />}
          >
            {t("seller.becomeSeller")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
