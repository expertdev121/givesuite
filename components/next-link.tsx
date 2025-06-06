import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface TabLinkProps {
  href?: string;
  exact?: boolean;
  children: React.ReactNode;
  asButton?: boolean;
  isActive?: boolean;
  onClick?: () => void;
}

export default function TabLink({
  href,
  exact = false,
  children,
  asButton = false,
  isActive: externalIsActive,
  onClick,
}: TabLinkProps) {
  const pathname = usePathname();

  // Use external isActive if provided (for button mode), otherwise calculate from pathname
  const isActive =
    externalIsActive !== undefined
      ? externalIsActive
      : href && (exact ? pathname === href : pathname.startsWith(href));

  const className = cn(
    "inline-flex h-10 items-center justify-center border-b-2 px-4 pb-4 pt-2 text-sm font-medium transition-colors",
    isActive
      ? "border-primary text-primary"
      : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
  );

  if (asButton) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {children}
      </button>
    );
  }

  // Ensure href is provided when not using as button
  if (!href) {
    throw new Error("href is required when not using asButton prop");
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
