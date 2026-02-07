import { createTheme } from "@mantine/core";
import type { MantineColorsTuple } from "@mantine/core";

// Primary blue palette: #2443ff (dark) to #92a1ff (light)
const primaryBlue: MantineColorsTuple = [
  "#eef0ff", // 0 - lightest
  "#dde2ff", // 1
  "#bcc5ff", // 2
  "#92a1ff", // 3 - light blue accent
  "#6b7eff", // 4
  "#4a5eff", // 5
  "#2443ff", // 6 - dark blue accent (primary)
  "#1a35e6", // 7
  "#1229cc", // 8
  "#0a1db3", // 9 - darkest
];

// Secondary yellow palette: #ffdd04 (bright) to #ffee9b (saturated)
const secondaryYellow: MantineColorsTuple = [
  "#fffde6", // 0 - lightest
  "#fffacc", // 1
  "#ffee9b", // 2 - saturated yellow accent
  "#ffe566", // 3
  "#ffdd04", // 4 - bright yellow accent
  "#e6c700", // 5
  "#ccb100", // 6
  "#b39b00", // 7
  "#998500", // 8
  "#806f00", // 9 - darkest
];

// Neutral palette based on #fafafa (white) and #b7b7b7 (grey)
const neutral: MantineColorsTuple = [
  "#fafafa", // 0 - white background
  "#f5f5f5", // 1
  "#eeeeee", // 2
  "#e0e0e0", // 3
  "#d6d6d6", // 4
  "#c9c9c9", // 5
  "#b7b7b7", // 6 - grey
  "#9a9a9a", // 7
  "#7d7d7d", // 8
  "#606060", // 9
];

export const theme = createTheme({
  primaryColor: "primary",
  defaultRadius: "xs",
  colors: {
    primary: primaryBlue,
    secondary: secondaryYellow,
    neutral: neutral,
  },
  white: "#fafafa",
  black: "#1a1a1a",
  other: {
    // Custom color tokens for easy access
    backgroundWhite: "#fafafa",
    backgroundGrey: "#b7b7b7",
    accentBlueDark: "#2443ff",
    accentBlueLight: "#92a1ff",
    accentYellowBright: "#ffdd04",
    accentYellowSaturated: "#ffee9b",
  },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontWeight: "700",
  },
  radius: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
  },
  components: {
    Button: {
      defaultProps: {
        radius: "xs",
      },
    },
  },
});
