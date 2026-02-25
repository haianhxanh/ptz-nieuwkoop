"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { AdditionalItem } from "@/lib/api";
import { formatPrice, currencyLabel } from "../utils";

type OfferSummaryCardProps = {
  additionalItems: AdditionalItem[];
  onAdditionalItemsChange: (items: AdditionalItem[] | ((prev: AdditionalItem[]) => AdditionalItem[])) => void;
  editingAdditionalIndex: number | null;
  onEditingAdditionalIndexChange: (index: number | null) => void;
  totalDiscount: number;
  onTotalDiscountChange: (value: number) => void;
  editingOrderDiscount: boolean;
  onEditingOrderDiscountChange: (value: boolean) => void;
  onUnsavedChange: () => void;
  currency: string;
  tax: number;
  itemsDiscount: number;
  total: number;
};

export function OfferSummaryCard({
  additionalItems,
  onAdditionalItemsChange,
  editingAdditionalIndex,
  onEditingAdditionalIndexChange,
  totalDiscount,
  onTotalDiscountChange,
  editingOrderDiscount,
  onEditingOrderDiscountChange,
  onUnsavedChange,
  currency,
  tax,
  itemsDiscount,
  total,
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
                <div className="flex items-center gap-1.5 shrink-0">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-24 text-right"
                    value={item.price === 0 ? "" : item.price}
                    onChange={(e) => {
                      const next = [...additionalItems];
                      next[index] = {
                        ...next[index],
                        price: e.target.value === "" ? 0 : parseFloat(e.target.value) || 0,
                      };
                      onAdditionalItemsChange(next);
                      onUnsavedChange();
                    }}
                    onBlur={() => onEditingAdditionalIndexChange(null)}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                  />
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
                  className="flex items-center gap-1.5 rounded px-2 py-1 text-right text-sm hover:bg-muted min-w-[5rem] justify-end"
                >
                  <span>{item.price > 0 ? formatPrice(item.price, currency) : "0"}</span>
                  <span className="text-muted-foreground shrink-0">{currencyLabel(currency)}</span>
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
            const next = [...additionalItems, { title: "Nová položka", price: 0 }];
            onAdditionalItemsChange(next);
            onEditingAdditionalIndexChange(next.length - 1);
            onUnsavedChange();
          }}
        >
          <Plus className="h-4 w-4" />
          Přidat položku
        </Button>

        <hr className="my-2" />

        {itemsDiscount > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>Sleva na položky</span>
            <span>-{formatPrice(itemsDiscount, currency)}</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-red-600"> Sleva na objednávku</span>
          {editingOrderDiscount ? (
            <div className="flex items-center gap-1">
              <span className="text-red-600 text-sm">−</span>
              <Input
                type="number"
                min="0"
                className="w-24 text-right text-red-600 border-red-300 focus-visible:ring-red-500"
                value={totalDiscount === 0 ? "" : totalDiscount}
                onChange={(e) => {
                  onTotalDiscountChange(e.target.value === "" ? 0 : parseFloat(e.target.value));
                  onUnsavedChange();
                }}
                onBlur={() => onEditingOrderDiscountChange(false)}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                autoFocus
              />
              <span className="text-sm text-muted-foreground">{currencyLabel(currency)}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onEditingOrderDiscountChange(true)}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-right text-sm text-red-600 hover:bg-red-50 min-w-[6rem] justify-end"
            >
              <span>{totalDiscount > 0 ? `− ${formatPrice(totalDiscount, currency)}` : "0"}</span>
              <Pencil className="h-3.5 w-3.5 shrink-0 opacity-70" />
            </button>
          )}
        </div>

        {tax > 0 && (
          <div className="flex justify-between">
            <span>DPH</span>
            <span>{formatPrice(tax, currency)}</span>
          </div>
        )}
        <div className="border-t pt-2">
          <div className="flex justify-between text-lg font-semibold">
            <span>Celkem</span>
            <span>{formatPrice(total, currency)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
