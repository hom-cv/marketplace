import { IconList, IconX } from "@tabler/icons-react";
import type { TocGroup } from "./TableOfContents";
import styles from "../PolicyPage.module.css";

interface MobileTocDrawerProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  title: string;
  groups: TocGroup[];
  activeItemId: string;
  onItemClick: (id: string) => void;
}

export function MobileTocDrawer({
  isOpen,
  onOpen,
  onClose,
  title,
  groups,
  activeItemId,
  onItemClick,
}: MobileTocDrawerProps) {
  const handleItemClick = (id: string) => {
    onItemClick(id);
    onClose();
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        className={styles.mobileTocTrigger}
        onClick={onOpen}
        aria-label="Open table of contents"
      >
        <IconList size={24} />
      </button>

      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.visible : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom sheet */}
      <div className={`${styles.mobileTocSheet} ${isOpen ? styles.open : ""}`}>
        <div className={styles.mobileTocHeader}>
          <span className={styles.mobileTocTitle}>{title}</span>
          <button
            className={styles.mobileTocClose}
            onClick={onClose}
            aria-label="Close table of contents"
          >
            <IconX size={18} />
          </button>
        </div>
        <nav>
          <ul className={styles.tocList}>
            {groups.map((group, index) => (
              <MobileTocGroup
                key={group.id}
                group={group}
                activeItemId={activeItemId}
                onItemClick={handleItemClick}
                isFirst={index === 0}
              />
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

interface MobileTocGroupProps {
  group: TocGroup;
  activeItemId: string;
  onItemClick: (id: string) => void;
  isFirst: boolean;
}

function MobileTocGroup({ group, activeItemId, onItemClick, isFirst }: MobileTocGroupProps) {
  return (
    <li style={isFirst ? undefined : { marginTop: 16 }}>
      <span className={styles.tocItem} style={{ fontWeight: 600 }}>
        {group.title}
      </span>
      <ul className={styles.tocSublist}>
        {group.items.map((item) => (
          <li
            key={item.id}
            className={`${styles.tocSubItem} ${activeItemId === item.id ? styles.active : ""}`}
            onClick={() => onItemClick(item.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onItemClick(item.id);
              }
            }}
            role="button"
            tabIndex={0}
          >
            {item.title}
          </li>
        ))}
      </ul>
    </li>
  );
}
