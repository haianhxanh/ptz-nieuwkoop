"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { formatDate } from "../utils";

type OfferMetadataCardProps = {
  createdAt: string;
  updatedAt: string;
  validUntil?: string;
  exchangeRate: number;
  updatingRate: boolean;
  onApplyTodaysRate: () => void;
};

export function OfferMetadataCard({
  createdAt,
  updatedAt,
  validUntil,
  exchangeRate,
  updatingRate,
  onApplyTodaysRate,
}: OfferMetadataCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Informace</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div>Vytvořeno: {formatDate(createdAt)}</div>
        <div>Aktualizováno: {formatDate(updatedAt)}</div>
        {validUntil && <div>Platnost do: {formatDate(validUntil)}</div>}
        <div className="pt-2 border-t">
          <div className="font-medium text-foreground mb-1">Kurz (1 EUR)</div>
          <div className="flex items-center gap-2">
            <span>{exchangeRate.toFixed(2)} CZK</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onApplyTodaysRate}
              disabled={updatingRate}
              className="gap-1"
            >
              <RefreshCw className={`h-3 w-3 ${updatingRate ? "animate-spin" : ""}`} />
              {updatingRate ? "Aktualizace..." : "Použít dnešní kurz"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
