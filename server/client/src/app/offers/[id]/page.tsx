"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { offersApi, type Offer, type LineItem, type OfferStatus } from "@/lib/api";
import { ArrowLeft, GripVertical, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const statusConfig = {
  draft: { label: "Koncept", variant: "secondary" as const },
  sent: { label: "Odesláno", variant: "default" as const },
  accepted: { label: "Přijato", variant: "success" as const },
  rejected: { label: "Odmítnuto", variant: "destructive" as const },
  expired: { label: "Vypršelo", variant: "outline" as const },
};

export default function OfferDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedItems, setEditedItems] = useState<LineItem[]>([]);
  const [totalDiscount, setTotalDiscount] = useState<number>(0);
  const [status, setStatus] = useState<OfferStatus>("draft");
  const [description, setDescription] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadOffer(params.id as string);
    }
  }, [params.id]);

  const loadOffer = async (id: string) => {
    try {
      setLoading(true);
      const data = await offersApi.getById(id);
      if (data.success) {
        setOffer(data.data);
        setEditedItems(data.data.items || []);
        setTotalDiscount(data.data.order_discount || 0);
        setStatus(data.data.status);
        setDescription(data.data.description || "");
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      setError("Nabídka nebyla nalezena");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("cs-CZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: currency || "CZK",
    }).format(amount);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...editedItems];
    const item = newItems[index];
    item.quantity = quantity;
    const subtotal = item.unit_price * quantity;
    const itemDiscount = item.discount || 0;
    item.total = subtotal - itemDiscount;
    setEditedItems(newItems);
    setHasUnsavedChanges(true);
  };

  const updateItemDiscount = (index: number, discount: number) => {
    const newItems = [...editedItems];
    const item = newItems[index];
    item.discount = discount;
    const subtotal = item.unit_price * item.quantity;
    item.total = subtotal - discount;
    setEditedItems(newItems);
    setHasUnsavedChanges(true);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...editedItems];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    setEditedItems(newItems);
    setDraggedIndex(index);
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const calculateTotals = () => {
    const itemsSubtotal = editedItems.reduce((sum, item) => {
      return sum + item.unit_price * item.quantity;
    }, 0);

    const itemsDiscount = editedItems.reduce((sum, item) => {
      return sum + (Number(item.discount) || 0);
    }, 0);

    const subtotalAfterItemDiscounts = itemsSubtotal - itemsDiscount;

    const orderDiscount = Number(totalDiscount) || 0;

    const totalDiscountAmount = itemsDiscount + orderDiscount;

    const tax = Number(offer?.tax) || 0;

    const total = itemsSubtotal - totalDiscountAmount + tax;

    return {
      itemsSubtotal,
      itemsDiscount,
      orderDiscount,
      totalDiscountAmount,
      subtotal: itemsSubtotal,
      total,
    };
  };

  const saveChanges = async () => {
    if (!offer) return;

    try {
      setSaving(true);
      const { subtotal, total } = calculateTotals();

      const sanitizedItems = editedItems.map((item) => ({
        ...item,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        discount: Number(item.discount) || 0,
        total: Number(item.total) || 0,
      }));

      const finalSubtotal = Number(Number(subtotal).toFixed(2)) || 0;
      const finalTotal = Number(Number(total).toFixed(2)) || 0;
      const finalDiscount = Number(totalDiscount) || 0;

      if (isNaN(finalSubtotal) || isNaN(finalTotal) || isNaN(finalDiscount)) {
        toast.error("Chyba při výpočtu celkové částky");
        setSaving(false);
        return;
      }

      console.log("Saving offer with data:", {
        items: sanitizedItems,
        subtotal: finalSubtotal,
        discount: finalDiscount,
        total: finalTotal,
      });

      const result = await offersApi.update(offer.simple_id.toString(), {
        items: sanitizedItems,
        discount: finalDiscount,
        status: status,
        description: description,
      });

      console.log("Save result:", result);
      toast.success("Změny uloženy");
      loadOffer(params.id as string);
    } catch (err: any) {
      console.error("Error saving changes:", err);
      console.error("Error details:", err.response?.data);
      toast.error(err.response?.data?.error || "Chyba při ukládání změn");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="container mx-auto px-4 py-8">
          <div className="py-8 text-center text-muted-foreground">Načítání...</div>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error || "Nabídka nebyla nalezena"}</div>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/offers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na seznam
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Button variant="outline" onClick={() => router.push("/offers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na seznam
          </Button>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              <span className="font-mono text-muted-foreground">#{offer.simple_id}</span> {offer.title}
            </h1>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as OfferStatus);
                setHasUnsavedChanges(true);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue>
                  <Badge variant={statusConfig[status].variant}>{statusConfig[status].label}</Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">
                  <Badge variant={statusConfig.draft.variant}>{statusConfig.draft.label}</Badge>
                </SelectItem>
                <SelectItem value="sent">
                  <Badge variant={statusConfig.sent.variant}>{statusConfig.sent.label}</Badge>
                </SelectItem>
                <SelectItem value="accepted">
                  <Badge variant={statusConfig.accepted.variant}>{statusConfig.accepted.label}</Badge>
                </SelectItem>
                <SelectItem value="rejected">
                  <Badge variant={statusConfig.rejected.variant}>{statusConfig.rejected.label}</Badge>
                </SelectItem>
                <SelectItem value="expired">
                  <Badge variant={statusConfig.expired.variant}>{statusConfig.expired.label}</Badge>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={saveChanges}
              disabled={saving}
              className={hasUnsavedChanges ? "border-amber-500 text-amber-600 hover:bg-amber-50" : ""}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Ukládání..." : hasUnsavedChanges ? "Uložit změny *" : "Uložit změny"}
            </Button>
            <Button onClick={() => router.push(`/products?offer=${offer.simple_id}`)}>Přidat produkty</Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Left Column - 2/3 width */}
          <div className="space-y-6 md:col-span-2">
            {/* Products Card */}
            <Card>
              <CardHeader>
                <CardTitle>Produkty</CardTitle>
              </CardHeader>
              <CardContent>
                {editedItems && editedItems.length > 0 ? (
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
                      {editedItems.map((item, index) => (
                        <TableRow
                          key={index}
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
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
                              onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                              onFocus={(e) => e.target.select()}
                              className="w-20"
                            />
                          </TableCell>
                          <TableCell>{formatPrice(item.unit_price, offer.currency)}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={item.discount === 0 || !item.discount ? "" : item.discount}
                              placeholder="0"
                              onChange={(e) => updateItemDiscount(index, e.target.value === "" ? 0 : parseFloat(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell className="font-semibold">{formatPrice(item.total, offer.currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-md bg-blue-50 p-4 text-blue-900">Zatím nebyly přidány žádné produkty.</div>
                )}
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Popis</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Přidat popis nabídky..."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Notes */}
            {offer.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Poznámky</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{offer.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>Zákazník</CardTitle>
                <Link href="/customers">
                  <Button variant="ghost" size="sm" className="gap-1">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-semibold">{offer.customer.name}</div>
                <div className="text-sm">{offer.customer.email}</div>
                {offer.customer.phone && <div className="text-sm">{offer.customer.phone}</div>}
                {offer.customer.address && (
                  <div className="mt-4 space-y-1 text-sm">
                    <div>{offer.customer.address}</div>
                    <div>
                      {offer.customer.postal_code} {offer.customer.city}
                    </div>
                    {offer.customer.country && <div>{offer.customer.country}</div>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Price Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Souhrn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Mezisoučet</span>
                  <span>{formatPrice(calculateTotals().itemsSubtotal, offer.currency)}</span>
                </div>

                {/* Item-level discounts */}
                {calculateTotals().itemsDiscount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Sleva na položky</span>
                    <span>-{formatPrice(calculateTotals().itemsDiscount, offer.currency)}</span>
                  </div>
                )}

                {/* Order-level discount */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sleva na objednávku</label>
                  <Input
                    type="number"
                    min="0"
                    value={totalDiscount === 0 ? "" : totalDiscount}
                    onChange={(e) => {
                      setTotalDiscount(e.target.value === "" ? 0 : parseFloat(e.target.value));
                      setHasUnsavedChanges(true);
                    }}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                  />
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Sleva na objednávku</span>
                      <span>-{formatPrice(totalDiscount, offer.currency)}</span>
                    </div>
                  )}
                </div>

                {/* Total discount */}
                {calculateTotals().totalDiscountAmount > 0 && (
                  <div className="flex justify-between font-medium text-red-600">
                    <span>Celková sleva</span>
                    <span>-{formatPrice(calculateTotals().totalDiscountAmount, offer.currency)}</span>
                  </div>
                )}

                {offer.tax && offer.tax > 0 && (
                  <div className="flex justify-between">
                    <span>DPH</span>
                    <span>{formatPrice(offer.tax, offer.currency)}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Celkem</span>
                    <span>{formatPrice(calculateTotals().total, offer.currency)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Informace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <div>Vytvořeno: {formatDate(offer.created_at)}</div>
                <div>Aktualizováno: {formatDate(offer.updated_at)}</div>
                {offer.valid_until && <div>Platnost do: {formatDate(offer.valid_until)}</div>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
