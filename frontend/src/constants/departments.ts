// Department scope shared by the DepartmentBar, /explore validateSearch, and the
// Explore page. "All" = no param; unisex shows under both departments.

import type { Gender } from "@/api/types/post";

export const DEPARTMENTS = ["mens", "womens"] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_GENDERS: Record<Department, Gender[]> = {
  mens: ["MENS", "UNISEX"],
  womens: ["WOMENS", "UNISEX"],
};

export function isDepartment(value: unknown): value is Department {
  return DEPARTMENTS.includes(value as Department);
}
