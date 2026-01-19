/**
 * Privacy Policy Page
 * Uses PolicyPageLayout for consistent structure and behavior
 */

import { PolicyPageLayout, type SectionGroup } from "./PolicyPageLayout";

const SECTION_GROUPS: SectionGroup[] = [
  {
    id: "privacy",
    titleKey: "privacy.title",
    sections: [
      "introduction",
      "dataCollection",
      "dataUsage",
      "dataSharing",
      "dataSecurity",
      "userRights",
      "cookies",
      "pdpaCompliance",
      "contact",
    ],
  },
  {
    id: "data-protection",
    titleKey: "data-protection.title",
    sections: [
      "introduction",
      "dataController",
      "dataProcessing",
      "securityMeasures",
      "dataRetention",
      "userRights",
      "internationalTransfers",
      "breachNotification",
    ],
    showDivider: true,
    lastUpdatedKey: "data-protection.lastUpdated",
    anchorId: "data-protection",
  },
];

export function PrivacyPage() {
  return (
    <PolicyPageLayout
      pageTitleKey="privacy.title"
      lastUpdatedKey="privacy.lastUpdated"
      sectionGroups={SECTION_GROUPS}
    />
  );
}
