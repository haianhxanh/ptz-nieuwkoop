"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { offersApi, type Offer } from "@/lib/api";
import { Copy, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusConfig = {
  draft: { label: "Koncept", variant: "secondary" as const },
  sent: { label: "Odesláno", variant: "default" as const },
  accepted: { label: "Přijato", variant: "success" as const },
  rejected: { label: "Odmítnuto", variant: "destructive" as const },
  expired: { label: "Vypršelo", variant: "outline" as const },
};

function getVisiblePages(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    if (index > 0 && page - sortedPages[index - 1] > 1) result.push("ellipsis");
    result.push(page);
  });

  return result;
}

function computeSellTotal(offer: Offer): number {
  const multiplier = Number(offer.sellMultiplier) || 1;
  const groups = (offer.items as any[]) || [];
  let subtotal = 0;
  for (const g of groups) {
    for (const item of g.items || []) {
      subtotal += item.unitCost * multiplier * item.quantity;
    }
  }
  const additionalSell = ((offer as any).additionalItems || []).reduce((s: number, a: any) => s + (Number(a.price) || 0), 0);
  const discount = Number(offer.discount) || 0;
  return subtotal - discount + additionalSell;
}

const ITEMS_PER_PAGE = 10;

export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredOffers = offers.filter((offer) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (offer.client.name ?? "").toLowerCase().includes(q) ||
      (offer.client.email ?? "").toLowerCase().includes(q) ||
      (offer.title ?? "").toLowerCase().includes(q) ||
      `#${offer.simpleId}`.includes(q)
    );
  });

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const data = await offersApi.list();
      if (data.success) {
        setOffers(data.data);
      }
    } catch (err) {
      setError("Chyba při načítání nabídek");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (offer: Offer, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await offersApi.duplicate(offer.simpleId.toString());
      toast.success("Nabídka duplikována");
      loadOffers();
    } catch {
      toast.error("Nepodařilo se duplikovat nabídku");
    }
  };

  const handleDelete = async (offer: Offer, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(offer.simpleId.toString());
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await offersApi.delete(confirmDeleteId);
      toast.success("Nabídka smazána");
      setConfirmDeleteId(null);
      loadOffers();
    } catch {
      toast.error("Nepodařilo se smazat nabídku");
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: currency || "CZK",
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Seznam nabídek</CardTitle>
            <Button onClick={() => router.push("/products")}>Vytvořit novou nabídku</Button>
          </CardHeader>
          <CardContent>
            {!loading && offers.length > 0 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Hledat podle názvu, klienta nebo ID"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            )}

            {loading && <div className="py-8 text-center text-muted-foreground">Načítání...</div>}

            {error && <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>}

            {!loading && !error && offers.length === 0 && (
              <div className="py-12 text-center">
                <h3 className="mb-2 text-lg font-semibold">Zatím žádné nabídky</h3>
                <p className="mb-4 text-muted-foreground">Začněte vytvořením nové nabídky pro klienta</p>
                <Button onClick={() => router.push("/products")}>Vytvořit nabídku</Button>
              </div>
            )}

            {!loading &&
              !error &&
              offers.length > 0 &&
              (() => {
                const totalPages = Math.ceil(filteredOffers.length / ITEMS_PER_PAGE);
                const paginatedOffers = filteredOffers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                return (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-16">ID</TableHead>
                          <TableHead>Název</TableHead>
                          <TableHead>Klient</TableHead>
                          <TableHead>Stav</TableHead>
                          <TableHead>Počet ks</TableHead>
                          <TableHead>Celkem P.</TableHead>
                          <TableHead>Vytvořeno</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedOffers.map((offer) => (
                          <TableRow key={offer.id} className="cursor-pointer" onClick={() => router.push(`/offers/${offer.simpleId}`)}>
                            <TableCell className="font-mono font-semibold">#{offer.simpleId}</TableCell>
                            <TableCell className="font-semibold">{offer.title}</TableCell>
                            <TableCell>
                              <div>{offer.client.name}</div>
                              {offer.client.email ? <div className="text-sm text-muted-foreground">{offer.client.email}</div> : null}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusConfig[offer.status].variant}>{statusConfig[offer.status].label}</Badge>
                            </TableCell>
                            <TableCell>
                              {offer.items?.reduce(
                                (sum, group) => sum + (group.items?.reduce((groupSum, item) => groupSum + (item.quantity || 0), 0) || 0),
                                0,
                              ) || 0}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatPrice(offer.totalRounded != null ? Number(offer.totalRounded) : Math.round(computeSellTotal(offer)), offer.currency)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(offer.createdAt)}</TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Duplikovat"
                                  onClick={(e) => handleDuplicate(offer, e)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  title="Smazat"
                                  onClick={(e) => handleDelete(offer, e)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t pt-4 mt-4">
                        <span className="text-sm text-muted-foreground">
                          {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredOffers.length)} z {filteredOffers.length}{" "}
                          nabídek
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                            Předchozí
                          </Button>
                          {getVisiblePages(currentPage, totalPages).map((page, index) =>
                            page === "ellipsis" ? (
                              <span key={`ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
                                ...
                              </span>
                            ) : (
                              <Button
                                key={page}
                                variant={page === currentPage ? "default" : "outline"}
                                size="sm"
                                className="w-9"
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </Button>
                            ),
                          )}
                          <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
                            Další
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Smazat nabídku?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Tato akce je nevratná. Nabídka bude trvale odstraněna.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
              Zrušit
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Smazat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
