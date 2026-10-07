"use client";

import { Calculator, HandCoins, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tools/target-rent", label: "Zielmieten-Rechner", icon: Calculator },
  { href: "/tools/property-sale", label: "Verkaufsrechner", icon: HandCoins },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Hauptnavigation" className="flex items-center gap-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        // Objekt-Detailseiten gehören zum Dashboard.
        const active =
          href === "/" ? pathname === "/" || pathname.startsWith("/properties") : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
