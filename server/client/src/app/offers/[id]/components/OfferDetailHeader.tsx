"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, FileDown, FileText, ArrowLeft, Plus } from "lucide-react";
import type { OfferStatus } from "@/lib/api";
import { statusConfig } from "../constants";

type OfferDetailHeaderProps = {
  offerId: number;
  title: string;
  status: OfferStatus;
  onStatusChange: (value: OfferStatus) => void;
  saving: boolean;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onBack: () => void;
  onAddSection: (name: string) => void;
};

export function OfferDetailHeader({
  offerId,
  title,
  status,
  onStatusChange,
  saving,
  hasUnsavedChanges,
  onSave,
  onExportExcel,
  onExportPdf,
  onBack,
  onAddSection,
}: OfferDetailHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");

  const handleConfirm = () => {
    const name = sectionName.trim() || "Nová sekce";
    onAddSection(name);
    setSectionName("");
    setDialogOpen(false);
  };

  return (
    <>
      <div className="mb-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zpět na seznam
        </Button>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">
            <span className="font-mono text-muted-foreground">#{offerId}</span> {title}
          </h1>
          <Select value={status} onValueChange={(v) => onStatusChange(v as OfferStatus)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue>
                <Badge variant={statusConfig[status].variant}>{statusConfig[status].label}</Badge>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(statusConfig) as OfferStatus[]).map((key) => (
                <SelectItem key={key} value={key}>
                  <Badge variant={statusConfig[key].variant}>{statusConfig[key].label}</Badge>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSave} disabled={saving} className={hasUnsavedChanges ? "border-amber-500 text-amber-600 hover:bg-amber-50" : ""}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Ukládání..." : hasUnsavedChanges ? "Uložit změny *" : "Uložit změny"}
          </Button>
          <Button variant="outline" onClick={onExportExcel}>
            <FileDown className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button variant="outline" onClick={onExportPdf}>
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Přidat sekci
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Přidat novou sekci</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="section-name">Název sekce</Label>
            <Input
              id="section-name"
              autoFocus
              placeholder="např. Pots, Accessories…"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleConfirm}>Přidat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
