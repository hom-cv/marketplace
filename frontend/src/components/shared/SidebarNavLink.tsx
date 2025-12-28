import { Link } from "@tanstack/react-router";

interface SidebarNavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  className: string;
  activeClassName: string;
}

export function SidebarNavLink({
  to,
  icon,
  label,
  className,
  activeClassName,
}: SidebarNavLinkProps) {
  return (
    <Link
      to={to}
      className={className}
      activeOptions={{ exact: true }}
      activeProps={{
        className: activeClassName,
      }}
    >
      {icon}
      {label}
    </Link>
  );
}
