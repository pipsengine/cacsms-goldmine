import { getNavigationAncestors, type NavigationItem } from "@/config/navigation";

export function Breadcrumb({ item }: { item: NavigationItem }) {
  const ancestors = getNavigationAncestors(item);
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {[...ancestors, item].map((entry) => <span key={entry.id}>{entry.label}</span>)}
    </nav>
  );
}
