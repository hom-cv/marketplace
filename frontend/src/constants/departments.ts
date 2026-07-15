// Department scope shared by the DepartmentBar, /explore validateSearch, the
// Explore filter panel, and the Shop By Category menu.
// "All" = no param (union tree, all posts); each department scopes the gender
// filter + which taxonomy tree is shown.

import type { Gender } from "@/api/types/post";

export const DEPARTMENTS = ["mens", "womens", "unisex"] as const;

export type Department = (typeof DEPARTMENTS)[number];

// Which post genders a department includes (mens/womens also surface unisex items).
export const DEPARTMENT_GENDERS: Record<Department, Gender[]> = {
  mens: ["MENS", "UNISEX"],
  womens: ["WOMENS", "UNISEX"],
  unisex: ["UNISEX"],
};

// Which taxonomy tree to show for a department (undefined "All" → union tree).
const DEPARTMENT_TREE_GENDER: Record<Department, Gender> = {
  mens: "MENS",
  womens: "WOMENS",
  unisex: "UNISEX",
};

export function departmentToGender(department: Department | undefined): Gender {
  return department ? DEPARTMENT_TREE_GENDER[department] : "UNISEX";
}

export function isDepartment(value: unknown): value is Department {
  return DEPARTMENTS.includes(value as Department);
}
