"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, FileDown, FileText, ArrowLeft, Plus, Copy, Trash2, Pencil, Undo2 } from "lucide-react";
import type { OfferStatus } from "@/lib/api";
import { statusConfig } from "../constants";

type OfferDetailHeaderProps = {
  offerId: number;
  title: string;
  onTitleChange: (v: string) => void;
  status: OfferStatus;
  onStatusChange: (value: OfferStatus) => void;
  saving: boolean;
  hasUnsavedChanges: boolean;
  onSave: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onBack: () => void;
  onDiscard: () => void;
  onAddSection: (name: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function OfferDetailHeader({
  offerId,
  title,
  onTitleChange,
  status,
  onStatusChange,
  saving,
  hasUnsavedChanges,
  onSave,
  onExportExcel,
  onExportPdf,
  onBack,
  onDiscard,
  onAddSection,
  onDuplicate,
  onDelete,
}: OfferDetailHeaderProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span className="font-mono text-muted-foreground shrink-0">#{offerId}</span>
            {editingTitle ? (
              <Input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => {
                  onTitleChange(titleDraft.trim() || title);
                  setEditingTitle(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onTitleChange(titleDraft.trim() || title);
                    setEditingTitle(false);
                  }
                  if (e.key === "Escape") setEditingTitle(false);
                }}
                className="h-9 text-2xl font-bold min-w-[280px]"
              />
            ) : (
              <button
                type="button"
                className="flex items-center gap-1.5 rounded px-1 hover:bg-muted"
                onClick={() => {
                  setTitleDraft(title);
                  setEditingTitle(true);
                }}
              >
                {title}
                <Pencil className="h-4 w-4 text-muted-foreground opacity-60" />
              </button>
            )}
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
          {hasUnsavedChanges && (
            <Button variant="ghost" onClick={onDiscard} disabled={saving} className="text-muted-foreground hover:text-foreground">
              <Undo2 className="mr-2 h-4 w-4" />
              Zrušit změny
            </Button>
          )}
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
          <Button variant="outline" onClick={onDuplicate} title="Duplikovat nabídku">
            <Copy className="mr-2 h-4 w-4" />
            Duplikovat
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
            title="Smazat nabídku"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Smazat
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

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Smazat nabídku?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tato akce je nevratná. Nabídka #{offerId} bude trvale odstraněna.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteDialogOpen(false);
                onDelete();
              }}
            >
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
