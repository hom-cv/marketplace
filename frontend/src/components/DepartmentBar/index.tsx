// Global department bar under the nav; sets the `department` search param.

import { useState } from "react";
import { Container } from "@mantine/core";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  BAR_DEPARTMENTS,
  departmentToGender,
  type Department,
} from "@/constants/departments";
import { ShopByCategoryPanel } from "@/components/ShopByCategoryMenu";
import styles from "./DepartmentBar.module.css";

export function DepartmentBar() {
  const navigate = useNavigate();
  const { t } = useTranslation("explore");
  const { t: tListings } = useTranslation("listings");
  const active = useRouterState({
    select: (s) =>
      s.location.pathname === "/explore" ? s.location.search.department : null,
  });
  // Department whose category panel is open, overlaying the page (click-driven).
  const [open, setOpen] = useState<Department | null>(null);

  const items: { value: Department | undefined; label: string }[] = [
    { value: undefined, label: t("departments.all") },
    ...BAR_DEPARTMENTS.map((value) => ({
      value,
      label: tListings(`genders.${value}`),
    })),
  ];

  const select = (value: Department | undefined) => {
    setOpen(null);
    navigate({
      to: "/explore",
      search: (prev) => ({ ...prev, department: value || undefined }),
    });
  };

  return (
    <nav className={styles.bar} onMouseLeave={() => setOpen(null)}>
      <Container size="md" className={styles.content}>
        {items.map((item) => (
          <button
            key={item.value ?? "all"}
            type="button"
            className={[
              styles.item,
              active === item.value && styles.itemActive,
              open === item.value && styles.itemOpen,
            ]
              .filter(Boolean)
              .join(" ")}
            // "All" has no category tree — click navigates. Departments toggle the panel.
            onClick={() =>
              item.value
                ? setOpen((cur) => (cur === item.value ? null : item.value!))
                : select(undefined)
            }
          >
            {item.label}
          </button>
        ))}
      </Container>
      {open && (
        <div className={styles.panel}>
          <Container size="md">
            <ShopByCategoryPanel
              gender={departmentToGender(open)}
              department={open}
              label={tListings(`genders.${open}`)}
              onSelect={() => setOpen(null)}
              onViewAll={() => select(open)}
            />
          </Container>
        </div>
      )}
    </nav>
  );
}
