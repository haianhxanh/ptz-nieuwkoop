"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Receipt, Loader2 } from "lucide-react";

type OfferProformaCardProps = {
  proformaUrl?: string;
  proformaId?: number;
  creating: boolean;
  onCreate: () => void;
  onUpdate: () => void;
};

export function OfferProformaCard({ proformaUrl, proformaId, creating, onCreate, onUpdate }: OfferProformaCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hasExisting = !!proformaId && !!proformaUrl;

  const handleClick = () => {
    if (hasExisting) {
      setConfirmOpen(true);
    } else {
      onCreate();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Proforma</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasExisting && (
            <a href={proformaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-green-600 hover:underline">
              <ExternalLink className="h-4 w-4" />
              Zobrazit proformu
            </a>
          )}
          <Button variant="outline" onClick={handleClick} disabled={creating} className="w-full">
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
            {creating ? "Vytvářím..." : hasExisting ? "Aktualizovat / Vystavit proformu" : "Vystavit proformu"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Proforma již existuje</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">K této nabídce již existuje proforma. Chcete vytvořit novou, nebo aktualizovat stávající?</p>
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
                onCreate();
              }}
            >
              Vytvořit novou
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                onUpdate();
              }}
            >
              Aktualizovat stávající
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
