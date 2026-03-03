"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { Customer } from "@/lib/api";

type OfferCustomerCardProps = {
  customer: Customer;
};

export function OfferCustomerCard({ customer }: OfferCustomerCardProps) {
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
      <CardContent className="space-y-2">
        <div className="font-semibold">{customer.name}</div>
        {customer.company_name && (
          <div className="text-sm text-muted-foreground">
            {customer.company_name}
            {customer.company_ico && <span className="ml-2">IČO: {customer.company_ico}</span>}
            {customer.company_dic && <span className="ml-2">DIČ: {customer.company_dic}</span>}
          </div>
        )}
        <div className="text-sm">{customer.email}</div>
        {customer.phone && <div className="text-sm">{customer.phone}</div>}
        {customer.address && (
          <div className="mt-4 space-y-1 text-sm">
            <div>{customer.address}</div>
            <div>
              {customer.postal_code} {customer.city}
            </div>
            {customer.country && <div>{customer.country}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
