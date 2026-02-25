"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const CF_LOGOUT_URL = `https://${process.env.NEXT_PUBLIC_CF_TEAM_DOMAIN}/cdn-cgi/access/logout`;

export function Nav() {
  const pathname = usePathname();

  const handleLogout = () => {
    window.location.href = CF_LOGOUT_URL;
  };

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">Nabídky</h1>
          <div className="flex items-center gap-4">
            <nav className="flex gap-4">
              <Link
                href="/offers"
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname?.startsWith("/offers") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                Nabídky
              </Link>
              <Link
                href="/products"
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === "/products" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                Produkty
              </Link>
              <Link
                href="/customers"
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === "/customers" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                Zákazníci
              </Link>
            </nav>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Odhlásit se
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
