/**
 * The "start selling" CTA (create listing / become a seller). Rendered in the
 * header and the mobile drawer. Takes a non-null `user`, so `seller` is
 * non-null — no guard needed and the icon can be a PascalCase component.
 */

import { Button, type ButtonProps } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { sellerAction, type UserInfo } from "./types";

interface SellerButtonProps {
  user: UserInfo;
  fullWidth?: boolean;
  variant?: ButtonProps["variant"];
  onClick?: () => void;
  iconSize?: number;
}

export function SellerButton({
  user,
  fullWidth,
  variant,
  onClick,
  iconSize = 16,
}: SellerButtonProps) {
  const { t } = useTranslation("navigation");
  const seller = sellerAction(user.is_seller);
  const SellerIcon = seller.icon;

  return (
    <Button
      component={Link}
      to={seller.to}
      onClick={onClick}
      fullWidth={fullWidth}
      variant={variant}
      leftSection={<SellerIcon size={iconSize} />}
    >
      {t(seller.labelKey)}
    </Button>
  );
}
