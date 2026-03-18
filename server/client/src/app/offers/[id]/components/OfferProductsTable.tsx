"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GripVertical, Trash2, Plus, Pencil } from "lucide-react";
import type { ItemGroup } from "@/lib/api";
import { formatPrice, currencyLabel } from "../utils";
import { useState } from "react";

type OfferProductsTableProps = {
  groups: ItemGroup[];
  currency: string;
  sellMultiplier: number;
  dragState: { groupIndex: number; itemIndex: number } | null;
  groupDragIndex: number | null;
  onQuantityChange: (groupIndex: number, itemIndex: number, quantity: number) => void;
  onGroupDiscountChange: (groupIndex: number, discount: number, discountType?: "fixed" | "percent") => void;
  onGroupRename: (groupIndex: number, name: string) => void;
  onGroupRemove: (groupIndex: number) => void;
  onItemRemove: (groupIndex: number, itemIndex: number) => void;
  onDragStart: (groupIndex: number, itemIndex: number) => void;
  onDragOver: (e: React.DragEvent, groupIndex: number, itemIndex: number) => void;
  onDragEnd: () => void;
  onGroupDragStart: (groupIndex: number) => void;
  onGroupDragOver: (e: React.DragEvent, groupIndex: number) => void;
  onGroupDragEnd: () => void;
  onGroupNotesChange: (groupIndex: number, notes: string) => void;
  onAddProductsToGroup: (groupId: string) => void;
};

export function OfferProductsTable({
  groups,
  currency,
  sellMultiplier,
  dragState,
  groupDragIndex,
  onQuantityChange,
  onGroupDiscountChange,
  onGroupRename,
  onGroupRemove,
  onItemRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  onGroupDragStart,
  onGroupDragOver,
  onGroupDragEnd,
  onGroupNotesChange,
  onAddProductsToGroup,
}: OfferProductsTableProps) {
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [editingDiscountIndex, setEditingDiscountIndex] = useState<number | null>(null);

  const startRename = (groupIndex: number, currentName: string) => {
    setEditingGroupIndex(groupIndex);
    setEditingGroupName(currentName);
  };

  const commitRename = (groupIndex: number) => {
    if (editingGroupName.trim()) onGroupRename(groupIndex, editingGroupName.trim());
    setEditingGroupIndex(null);
  };

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => {
        const multiplier = Number(sellMultiplier) || 1;
        const groupCostSubtotal = group.items.reduce((s, item) => s + item.unit_price * item.quantity, 0);
        const groupSellSubtotal = group.items.reduce((s, item) => {
          const vat = (item.vat_rate ?? 21) / 100;
          return s + item.unit_price * (1 + vat) * multiplier * item.quantity;
        }, 0);

        return (
          <Card
            key={group.id}
            onDragOver={(e) => onGroupDragOver(e, groupIndex)}
            onDragEnd={onGroupDragEnd}
            className={groupDragIndex === groupIndex ? "opacity-50" : ""}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div
                  draggable
                  onDragStart={() => onGroupDragStart(groupIndex)}
                  className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
                  title="Přetáhněte pro změnu pořadí"
                >
                  <GripVertical className="h-5 w-5" />
                </div>
                {editingGroupIndex === groupIndex ? (
                  <Input
                    autoFocus
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    onBlur={() => commitRename(groupIndex)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(groupIndex);
                    }}
                    className="h-8 max-w-xs text-lg font-semibold"
                  />
                ) : (
                  <button type="button" onClick={() => startRename(groupIndex, group.name)} className="flex items-center gap-1.5 rounded px-1 hover:bg-muted">
                    <CardTitle>{group.name}</CardTitle>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-60" />
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => onAddProductsToGroup(group.id)} className="gap-1">
                    <Plus className="h-4 w-4" />
                    Přidat produkt
                  </Button>
                  {groups.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onGroupRemove(groupIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {group.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead className="w-16"></TableHead>
                      <TableHead>Produkt</TableHead>
                      <TableHead className="w-20">Množství</TableHead>
                      <TableHead className="w-16">DPH</TableHead>
                      <TableHead>Celkem (N. / P.)</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item, itemIndex) => {
                      const multiplier = Number(sellMultiplier) || 1;
                      const vat = (item.vat_rate ?? 21) / 100;
                      const costTotal = item.unit_price * item.quantity;
                      const sellUnitPrice = item.unit_price * (1 + vat) * multiplier;
                      const sellTotal = sellUnitPrice * item.quantity;
                      return (
                        <TableRow
                          key={itemIndex}
                          onDragOver={(e) => onDragOver(e, groupIndex, itemIndex)}
                          onDragEnd={onDragEnd}
                          className={dragState?.groupIndex === groupIndex && dragState?.itemIndex === itemIndex ? "opacity-50" : ""}
                        >
                          <TableCell draggable onDragStart={() => onDragStart(groupIndex, itemIndex)} className="cursor-grab active:cursor-grabbing">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                          <TableCell>
                            {item.image ? (
                              <Image src={item.image} alt={item.name} width={50} height={50} className="rounded-md object-cover" />
                            ) : (
                              <div className="h-[50px] w-[50px] rounded-md bg-gray-200" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">{item.name}</div>
                            {item.sku && <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>}
                            {item.dimensions && (item.dimensions.height || item.dimensions.diameter || item.dimensions.pot_size) && (
                              <div className="text-xs text-muted-foreground">
                                {[
                                  item.dimensions.height && `V: ${item.dimensions.height} cm`,
                                  item.dimensions.diameter && `Ø: ${item.dimensions.diameter} cm`,
                                  item.dimensions.pot_size && `Květináč: ${item.dimensions.pot_size} cm`,
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                            )}
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              <div>N.: {formatPrice(item.unit_price, currency)}</div>
                              <div className="font-medium text-foreground">P.: {formatPrice(sellUnitPrice, currency)}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => onQuantityChange(groupIndex, itemIndex, parseInt(e.target.value) || 1)}
                              onFocus={(e) => e.target.select()}
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.vat_rate ?? 21} %</TableCell>
                          <TableCell>
                            <span className="text-muted-foreground">{formatPrice(costTotal, currency)}</span>
                            <span className="mx-1 text-muted-foreground">/</span>
                            <span className="font-semibold">{formatPrice(sellTotal, currency)}</span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => onItemRemove(groupIndex, itemIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="rounded-md bg-blue-50 p-4 text-blue-900">Zatím nebyly přidány žádné produkty.</div>
              )}

              {/* Group subtotal + discount row */}
              <div className="mt-3 flex items-center justify-end gap-4 border-t pt-3 text-sm">
                <span className="text-muted-foreground">
                  Mezisoučet (N.): <span className="font-medium text-foreground">{formatPrice(groupCostSubtotal, currency)}</span>
                </span>
                <div className="flex items-center gap-1.5 text-red-600">
                  <span className="text-sm">Sleva:</span>
                  {editingDiscountIndex === groupIndex ? (
                    <>
                      <span className="text-sm">−</span>
                      <Input
                        type="number"
                        min="0"
                        autoFocus
                        className="w-24 text-right text-red-600 border-red-300 focus-visible:ring-red-500"
                        value={group.discount === 0 ? "" : group.discount}
                        onChange={(e) =>
                          onGroupDiscountChange(groupIndex, e.target.value === "" ? 0 : parseFloat(e.target.value), group.discount_type || "fixed")
                        }
                        onBlur={() => setEditingDiscountIndex(null)}
                        onFocus={(e) => e.target.select()}
                        placeholder="0"
                      />
                      <div className="flex rounded border border-red-300 overflow-hidden text-xs">
                        <button
                          type="button"
                          className={`px-2 py-1 ${(group.discount_type || "fixed") === "fixed" ? "bg-red-100 font-semibold" : "hover:bg-red-50"}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => onGroupDiscountChange(groupIndex, group.discount, "fixed")}
                        >
                          {currencyLabel(currency)}
                        </button>
                        <button
                          type="button"
                          className={`px-2 py-1 border-l border-red-300 ${group.discount_type === "percent" ? "bg-red-100 font-semibold" : "hover:bg-red-50"}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => onGroupDiscountChange(groupIndex, group.discount, "percent")}
                        >
                          %
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingDiscountIndex(groupIndex)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-right text-sm text-red-600 hover:bg-red-50"
                    >
                      {group.discount > 0 ? (
                        <span>
                          −{" "}
                          {group.discount_type === "percent"
                            ? `${group.discount} % (${formatPrice((groupSellSubtotal * group.discount) / 100, currency)})`
                            : formatPrice(group.discount, currency)}
                        </span>
                      ) : (
                        <span>0</span>
                      )}
                      <Pencil className="h-3.5 w-3.5 opacity-70" />
                    </button>
                  )}
                </div>
                <span className="text-muted-foreground">
                  (P.):{" "}
                  <span className="font-semibold text-foreground">
                    {formatPrice(
                      Math.max(
                        0,
                        groupSellSubtotal - (group.discount_type === "percent" ? (groupSellSubtotal * (group.discount || 0)) / 100 : group.discount || 0),
                      ),
                      currency,
                    )}
                  </span>
                </span>
              </div>

              <div className="mt-3">
                <Textarea
                  placeholder="Poznámka"
                  value={group.notes || ""}
                  onChange={(e) => onGroupNotesChange(groupIndex, e.target.value)}
                  className="min-h-[60px] text-sm"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
