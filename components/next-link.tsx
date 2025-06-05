import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TabLink({
  href,
  exact = false,
  children,
}: {
  href: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center border-b-2 px-4 pb-4 pt-2 text-sm font-medium transition-colors",
        isActive
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
