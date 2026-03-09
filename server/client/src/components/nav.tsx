"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";
import { exchangeRateApi, usersApi, type User } from "@/lib/api";

const CF_LOGOUT_URL = `https://${process.env.NEXT_PUBLIC_CF_TEAM_DOMAIN}/cdn-cgi/access/logout`;

export function Nav() {
  const pathname = usePathname();
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    exchangeRateApi
      .get()
      .then(({ rate }) => setExchangeRate(rate))
      .catch(() => {});
    usersApi
      .getMe()
      .then((d) => {
        if (d.success) setCurrentUser(d.data);
      })
      .catch(() => {});
  }, []);

  const handleLogout = () => {
    window.location.href = CF_LOGOUT_URL;
  };

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/offers" className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
            Nabídky
          </Link>
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
                Klienti
              </Link>
            </nav>
            <Link
              href="/profile"
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/profile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              <UserIcon className="h-4 w-4" />
              {currentUser?.name || "Profil"}
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Odhlásit se
            </Button>
          </div>
        </div>
        {exchangeRate !== null && <div className="mt-2 text-right text-xs text-muted-foreground">1 EUR = {exchangeRate.toFixed(2)} CZK</div>}
      </div>
    </header>
  );
}
