"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, Mail, Phone } from "lucide-react";
import type { Client } from "@/lib/api";

type OfferClientCardProps = {
  client: Client;
  allClients: Client[];
  selectedClientId: string | null;
  onClientChange: (clientId: string) => void;
};

export function OfferClientCard({ client, allClients, selectedClientId, onClientChange }: OfferClientCardProps) {
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const displayClient = allClients.find((c) => c.id === selectedClientId) ?? client;

  const searchResults =
    search.length > 0
      ? allClients
          .filter((c) => {
            const q = search.toLowerCase();
            return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.companyName && c.companyName.toLowerCase().includes(q));
          })
          .slice(0, 6)
      : [];

  const selectClient = (c: Client) => {
    if (c.id) onClientChange(c.id);
    setSearch("");
    setShowSuggestions(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Klient</CardTitle>
        <Link href="/clients">
          <Button variant="ghost" size="sm" className="gap-1">
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {allClients.length > 1 && (
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
                  <li key={c.id} className="cursor-pointer px-3 py-2 hover:bg-muted" onMouseDown={() => selectClient(c)}>
                    <div className="text-sm font-medium">
                      {c.name}
                      {c.companyName ? ` (${c.companyName})` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="font-semibold">{displayClient.name}</div>
        {displayClient.companyName && (
          <div className="text-sm text-muted-foreground">
            {displayClient.companyName}
            {displayClient.companyIco && <span className="ml-2">IČO: {displayClient.companyIco}</span>}
            {displayClient.companyDic && <span className="ml-2">DIČ: {displayClient.companyDic}</span>}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            {displayClient.email}
          </span>
          {displayClient.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {displayClient.phone}
            </span>
          )}
        </div>
        {displayClient.address && (
          <>
            <hr className="border-border" />
            <div className="space-y-1 text-sm">
              <div>{displayClient.address}</div>
              <div>
                {displayClient.postalCode} {displayClient.city}
              </div>
              {displayClient.country && <div>{displayClient.country}</div>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
