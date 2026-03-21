"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { AdditionalItem } from "@/lib/api";
import { formatPrice, currencyLabel } from "../utils";

type OfferSummaryCardProps = {
  additionalItems: AdditionalItem[];
  onAdditionalItemsChange: (items: AdditionalItem[] | ((prev: AdditionalItem[]) => AdditionalItem[])) => void;
  editingAdditionalIndex: number | null;
  onEditingAdditionalIndexChange: (index: number | null) => void;
  onUnsavedChange: () => void;
  currency: string;
  groupsDiscount: number;
  total: number;
  totalSellExclVat: number;
  totalRounded: number | null;
  onTotalRoundedChange: (v: number | null) => void;
  sellMultiplier: number;
  onSellMultiplierChange: (v: number) => void;
};

export function OfferSummaryCard({
  additionalItems,
  onAdditionalItemsChange,
  editingAdditionalIndex,
  onEditingAdditionalIndexChange,
  onUnsavedChange,
  currency,
  groupsDiscount,
  total,
  totalSellExclVat,
  totalRounded,
  onTotalRoundedChange,
  sellMultiplier,
  onSellMultiplierChange,
}: OfferSummaryCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Souhrn</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {additionalItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-2">
            {editingAdditionalIndex === index ? (
              <>
                <Input
                  type="text"
                  className="flex-1 min-w-0 text-sm"
                  value={item.title}
                  onChange={(e) => {
                    const next = [...additionalItems];
                    next[index] = { ...next[index], title: e.target.value || "" };
                    onAdditionalItemsChange(next);
                    onUnsavedChange();
                  }}
                  placeholder="Název"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <span className="w-6 text-right text-xs text-muted-foreground">N.</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-20 text-right text-sm"
                        value={item.cost === 0 ? "" : item.cost}
                        onChange={(e) => {
                          const next = [...additionalItems];
                          next[index] = { ...next[index], cost: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 };
                          onAdditionalItemsChange(next);
                          onUnsavedChange();
                        }}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-6 text-right text-xs text-muted-foreground">P.</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-20 text-right text-sm font-medium"
                        value={item.price === 0 || item.price == null ? "" : item.price}
                        onChange={(e) => {
                          const next = [...additionalItems];
                          next[index] = { ...next[index], price: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0 };
                          onAdditionalItemsChange(next);
                          onUnsavedChange();
                        }}
                        onBlur={() => onEditingAdditionalIndexChange(null)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground w-10">{currencyLabel(currency)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      onAdditionalItemsChange(additionalItems.filter((_, i) => i !== index));
                      onEditingAdditionalIndexChange(null);
                      onUnsavedChange();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <span className="text-sm font-medium">{item.title || "—"}</span>
                <button
                  type="button"
                  onClick={() => onEditingAdditionalIndexChange(index)}
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-right text-sm hover:bg-muted"
                >
                  <span className="text-muted-foreground">N: {item.cost > 0 ? formatPrice(item.cost, currency) : "0"}</span>
                  <span className="font-medium">P: {(item.price ?? 0) > 0 ? formatPrice(item.price!, currency) : "0"}</span>
                  <Pencil className="h-3.5 w-3.5 shrink-0 opacity-70" />
                </button>
              </>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-muted-foreground"
          onClick={() => {
            const next = [...additionalItems, { title: "Nová položka", cost: 0, price: 0 }];
            onAdditionalItemsChange(next);
            onEditingAdditionalIndexChange(next.length - 1);
            onUnsavedChange();
          }}
        >
          <Plus className="h-4 w-4" />
          Přidat položku
        </Button>

        <hr className="my-2" />

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="sell-multiplier" className="text-sm font-medium">
            Koeficient <span className="text-muted-foreground text-xs">(P. = N. ×)</span>
          </Label>
          <Input
            id="sell-multiplier"
            type="number"
            min="0"
            step="0.01"
            value={sellMultiplier}
            onChange={(e) => onSellMultiplierChange(parseFloat(e.target.value) || 1)}
            onFocus={(e) => e.target.select()}
            className="w-24 text-right"
          />
        </div>

        <hr className="my-2" />

        <div className="border-t pt-2 space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Celkem nákup</span>
            <span>{formatPrice(total, currency)}</span>
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span>Celkem prodej</span>
            <span>{formatPrice(totalSellExclVat, currency)}</span>
          </div>
          <div className="flex justify-between items-center text-sm gap-2">
            <span className="text-muted-foreground shrink-0">Celkem prodej - zaokrouhleno</span>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                className="w-32 h-7 text-right text-sm"
                value={totalRounded ?? ""}
                placeholder={String(Math.round(totalSellExclVat))}
                onChange={(e) => onTotalRoundedChange(e.target.value === "" ? null : Number(e.target.value))}
              />
              <span className="text-xs text-muted-foreground">{currencyLabel(currency)}</span>
            </div>
          </div>
          {groupsDiscount > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground text-red-600">
              <span>Sleva celkem</span>
              <span>-{formatPrice(groupsDiscount, currency)}</span>
            </div>
          )}
          {totalSellExclVat > 0 && total > 0 && (
            <div className="flex justify-between text-sm text-green-700 font-medium">
              <span>Marže</span>
              <span>
                {formatPrice(totalSellExclVat - total, currency)}{" "}
                <span className="text-green-600 font-normal">({(((totalSellExclVat - total) / totalSellExclVat) * 100).toFixed(1)} %)</span>
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
