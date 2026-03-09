"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail, Phone } from "lucide-react";
import type { Customer } from "@/lib/api";

type OfferCustomerCardProps = {
  customer: Customer;
  allCustomers: Customer[];
  selectedCustomerId: string | null;
  onCustomerChange: (customerId: string) => void;
};

export function OfferCustomerCard({ customer, allCustomers, selectedCustomerId, onCustomerChange }: OfferCustomerCardProps) {
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const displayCustomer = allCustomers.find((c) => c.id === selectedCustomerId) ?? customer;

  const searchResults =
    search.length > 0
      ? allCustomers
          .filter((c) => {
            const q = search.toLowerCase();
            return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.company_name && c.company_name.toLowerCase().includes(q));
          })
          .slice(0, 6)
      : [];

  const selectCustomer = (c: Customer) => {
    if (c.id) onCustomerChange(c.id);
    setSearch("");
    setShowSuggestions(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Klient</CardTitle>
        <Link href="/customers">
          <Button variant="ghost" size="sm" className="gap-1">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {allCustomers.length > 1 && (
          <div className="relative">
            <Input
              placeholder="Změnit klienta"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (search.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              autoComplete="off"
            />
            {showSuggestions && searchResults.length > 0 && (
              <ul className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
                {searchResults.map((c) => (
                  <li key={c.id} className="cursor-pointer px-3 py-2 hover:bg-muted" onMouseDown={() => selectCustomer(c)}>
                    <div className="text-sm font-medium">
                      {c.name}
                      {c.company_name ? ` (${c.company_name})` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="font-semibold">{displayCustomer.name}</div>
        {displayCustomer.company_name && (
          <div className="text-sm text-muted-foreground">
            {displayCustomer.company_name}
            {displayCustomer.company_ico && <span className="ml-2">IČO: {displayCustomer.company_ico}</span>}
            {displayCustomer.company_dic && <span className="ml-2">DIČ: {displayCustomer.company_dic}</span>}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            {displayCustomer.email}
          </span>
          {displayCustomer.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {displayCustomer.phone}
            </span>
          )}
        </div>
        {displayCustomer.address && (
          <>
            <hr className="border-border" />
            <div className="space-y-1 text-sm">
              <div>{displayCustomer.address}</div>
              <div>
                {displayCustomer.postal_code} {displayCustomer.city}
              </div>
              {displayCustomer.country && <div>{displayCustomer.country}</div>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
