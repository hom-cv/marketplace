// Global department bar under the nav; sets the `department` search param.

import { Container } from "@mantine/core";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DEPARTMENTS, type Department } from "@/constants/departments";
import styles from "./DepartmentBar.module.css";

export function DepartmentBar() {
  const navigate = useNavigate();
  const { t } = useTranslation("explore");
  const { t: tListings } = useTranslation("listings");
  const active = useRouterState({
    select: (s) =>
      s.location.pathname === "/explore" ? s.location.search.department : null,
  });

  const items: { value: Department | undefined; label: string }[] = [
    { value: undefined, label: t("departments.all") },
    ...DEPARTMENTS.map((value) => ({
      value,
      label: tListings(`genders.${value}`),
    })),
  ];

  const select = (value: Department | undefined) => {
    navigate({
      to: "/explore",
      search: (prev) => ({ ...prev, department: value || undefined }),
    });
  };

  return (
    <nav className={styles.bar}>
      <Container size="md" className={styles.content}>
        {items.map((item) => (
          <button
            key={item.value ?? "all"}
            type="button"
            className={[styles.item, active === item.value && styles.itemActive]
              .filter(Boolean)
              .join(" ")}
            onClick={() => select(item.value)}
          >
            {item.label}
          </button>
        ))}
      </Container>
    </nav>
  );
}
