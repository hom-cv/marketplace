/**
 * Terms of Service Page
 * Uses PolicyPageLayout for consistent structure and behavior
 */

import { PolicyPageLayout, type SectionGroup } from "./PolicyPageLayout";

const SECTION_GROUPS: SectionGroup[] = [
  {
    id: "terms",
    titleKey: "terms.title",
    sections: [
      "acceptance",
      "eligibility",
      "userAccounts",
      "prohibitedItems",
      "transactions",
      "liability",
      "modifications",
      "governingLaw",
    ],
  },
  {
    id: "refund",
    titleKey: "refund.title",
    sections: [
      "overview",
      "eligibility",
      "process",
      "timeline",
      "nonRefundable",
      "disputes",
      "contact",
    ],
    showDivider: true,
    lastUpdatedKey: "refund.lastUpdated",
    anchorId: "refund-policy",
  },
];

export function TermsPage() {
  return (
    <PolicyPageLayout
      pageTitleKey="terms.title"
      lastUpdatedKey="terms.lastUpdated"
      sectionGroups={SECTION_GROUPS}
    />
  );
}
