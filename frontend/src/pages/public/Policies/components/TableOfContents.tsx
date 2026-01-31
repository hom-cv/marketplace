import styles from "../PolicyPage.module.css";

export interface TocGroup {
  id: string;
  title: string;
  items: TocItem[];
}

export interface TocItem {
  id: string;
  title: string;
}

interface TableOfContentsProps {
  title: string;
  groups: TocGroup[];
  activeItemId: string;
  onItemClick: (id: string) => void;
}

export function TableOfContents({
  title,
  groups,
  activeItemId,
  onItemClick,
}: TableOfContentsProps) {
  return (
    <div className={styles.tocCard}>
      <h3 className={styles.tocTitle}>{title}</h3>
      <nav>
        <ul className={styles.tocList}>
          {groups.map((group, index) => (
            <TocGroupItem
              key={group.id}
              group={group}
              activeItemId={activeItemId}
              onItemClick={onItemClick}
              isFirst={index === 0}
            />
          ))}
        </ul>
      </nav>
    </div>
  );
}

interface TocGroupItemProps {
  group: TocGroup;
  activeItemId: string;
  onItemClick: (id: string) => void;
  isFirst: boolean;
}

function TocGroupItem({ group, activeItemId, onItemClick, isFirst }: TocGroupItemProps) {
  return (
    <li style={isFirst ? undefined : { marginTop: 16 }}>
      <span
        className={styles.tocItem}
        style={{ fontWeight: 600, color: "var(--mantine-color-dimmed)" }}
      >
        {group.title}
      </span>
      <ul className={styles.tocSublist}>
        {group.items.map((item) => (
          <TocLink
            key={item.id}
            item={item}
            isActive={activeItemId === item.id}
            onClick={() => onItemClick(item.id)}
          />
        ))}
      </ul>
    </li>
  );
}

interface TocLinkProps {
  item: TocItem;
  isActive: boolean;
  onClick: () => void;
}

function TocLink({ item, isActive, onClick }: TocLinkProps) {
  return (
    <li
      className={`${styles.tocSubItem} ${isActive ? styles.active : ""}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {item.title}
    </li>
  );
}
