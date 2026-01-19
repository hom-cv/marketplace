/**
 * Custom Mantine theme configuration
 * Soft & Airy aesthetic with generous whitespace and subtle shadows
 */

import { createTheme, rem } from "@mantine/core";
import type { MantineColorsTuple } from "@mantine/core";

// Custom blue shade for accent (using Mantine default blue but can be customized)
const softBlue: MantineColorsTuple = [
  "#e7f5ff",
  "#d0ebff",
  "#a5d8ff",
  "#74c0fc",
  "#4dabf7",
  "#339af0",
  "#228be6",
  "#1c7ed6",
  "#1971c2",
  "#1864ab",
];

export const theme = createTheme({
  // Use Inter as primary font with system font fallbacks
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontWeight: "600",
    sizes: {
      h1: { fontSize: rem(28), lineHeight: "1.2", fontWeight: "600" },
      h2: { fontSize: rem(22), lineHeight: "1.25", fontWeight: "600" },
      h3: { fontSize: rem(18), lineHeight: "1.3", fontWeight: "600" },
      h4: { fontSize: rem(16), lineHeight: "1.35", fontWeight: "500" },
      h5: { fontSize: rem(14), lineHeight: "1.4", fontWeight: "500" },
      h6: { fontSize: rem(12), lineHeight: "1.4", fontWeight: "500" },
    },
  },

  // Refined font sizes - xs for secondary UI, sm+ for primary content
  fontSizes: {
    xs: rem(12),
    sm: rem(14),
    md: rem(15),
    lg: rem(16),
    xl: rem(18),
  },

  // Larger border radius for soft, friendly feel
  radius: {
    xs: rem(6),
    sm: rem(10),
    md: rem(14),
    lg: rem(20),
    xl: rem(28),
  },

  // Default radius for components
  defaultRadius: "md",

  // Subtle, layered shadows
  shadows: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
    sm: "0 2px 4px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)",
    md: "0 4px 8px rgba(0, 0, 0, 0.04), 0 2px 4px rgba(0, 0, 0, 0.06)",
    lg: "0 8px 16px rgba(0, 0, 0, 0.06), 0 4px 8px rgba(0, 0, 0, 0.04)",
    xl: "0 16px 32px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)",
  },

  // 8px base spacing grid
  spacing: {
    xs: rem(4),
    sm: rem(8),
    md: rem(16),
    lg: rem(24),
    xl: rem(32),
  },

  // Colors
  colors: {
    blue: softBlue,
  },

  primaryColor: "blue",
  primaryShade: 6,

  // Component-specific overrides
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        root: {
          fontWeight: 500,
          transition: "all 0.2s ease",
          "&:active": {
            transform: "scale(0.98)",
          },
        },
      },
    },
    Title: {
      styles: {
        root: {
          fontWeight: 600,
        },
      },
    },
    Text: {
      styles: {
        root: {
          lineHeight: 1.5,
        },
      },
    },
    Card: {
      defaultProps: {
        radius: "lg",
        shadow: "sm",
      },
      styles: {
        root: {
          transition: "box-shadow 0.2s ease, transform 0.2s ease",
        },
      },
    },
    Paper: {
      defaultProps: {
        radius: "lg",
      },
    },
    Input: {
      defaultProps: {
        radius: "md",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
      styles: {
        input: {
          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        },
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Badge: {
      defaultProps: {
        radius: "md",
      },
    },
    Modal: {
      defaultProps: {
        radius: "lg",
      },
    },
    Drawer: {
      defaultProps: {
        radius: "lg",
      },
    },
    ActionIcon: {
      styles: {
        root: {
          transition: "all 0.2s ease",
          "&:active": {
            transform: "scale(0.95)",
          },
        },
      },
    },
    Anchor: {
      styles: {
        root: {
          transition: "color 0.2s ease",
        },
      },
    },
    Container: {
      defaultProps: {
        size: "xl",
      },
    },
  },

  // Other theme settings
  other: {
    // Custom background color for the app
    softBackground: "#FAFBFC",
    // Card hover lift
    cardHoverTransform: "translateY(-4px)",
    // Transition durations
    transitionFast: "0.15s",
    transitionNormal: "0.2s",
    transitionSlow: "0.3s",
  },
});
