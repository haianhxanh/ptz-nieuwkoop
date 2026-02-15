"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GripVertical } from "lucide-react";
import type { LineItem } from "@/lib/api";
import { formatPrice } from "../utils";

type OfferProductsTableProps = {
  items: LineItem[];
  currency: string;
  draggedIndex: number | null;
  onQuantityChange: (index: number, quantity: number) => void;
  onDiscountChange: (index: number, discount: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
};

export function OfferProductsTable({
  items,
  currency,
  draggedIndex,
  onQuantityChange,
  onDiscountChange,
  onDragStart,
  onDragOver,
  onDragEnd,
}: OfferProductsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Produkty</CardTitle>
      </CardHeader>
      <CardContent>
        {items?.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="w-16"></TableHead>
                <TableHead>Produkt</TableHead>
                <TableHead className="w-24">Množství</TableHead>
                <TableHead>Cena/ks</TableHead>
                <TableHead className="w-28">Sleva</TableHead>
                <TableHead>Celkem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow
                  key={index}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(e) => onDragOver(e, index)}
                  onDragEnd={onDragEnd}
                  className={`cursor-move ${draggedIndex === index ? "opacity-50" : ""}`}
                >
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => onQuantityChange(index, parseInt(e.target.value) || 1)}
                      onFocus={(e) => e.target.select()}
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>{formatPrice(item.unit_price, currency)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      value={item.discount === 0 || !item.discount ? "" : item.discount}
                      placeholder="0"
                      onChange={(e) => onDiscountChange(index, e.target.value === "" ? 0 : parseFloat(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell className="font-semibold">{formatPrice(item.total, currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="rounded-md bg-blue-50 p-4 text-blue-900">Zatím nebyly přidány žádné produkty.</div>
        )}
      </CardContent>
    </Card>
  );
}
