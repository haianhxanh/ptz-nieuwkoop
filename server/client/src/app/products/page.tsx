"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { offersApi, type LineItem, type ItemGroup, type Client, exchangeRateApi } from "@/lib/api";
import { useProducts } from "@/contexts/products-context";
import { ArrowLeft, RefreshCw, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingOfferId = searchParams?.get("offer");
  const targetGroupId = searchParams?.get("group");

  // Use cached products from context
  const { products, stockMap, loading, refreshProducts } = useProducts();

  const [filteredProducts, setFilteredProducts] = useState(products);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Modal states
  const [showNewOfferModal, setShowNewOfferModal] = useState(false);
  const [showExistingOfferModal, setShowExistingOfferModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [offerTitle, setOfferTitle] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [targetOfferId, setTargetOfferId] = useState(existingOfferId || "");
  const [clients, setClients] = useState<Client[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    let filtered = products;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = products.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.collection && p.collection.toLowerCase().includes(q)),
      );
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [products, searchQuery]);

  const [clientSearch, setClientSearch] = useState("");

  // Load clients once for client search
  useEffect(() => {
    offersApi
      .listClients()
      .then((res) => setClients(res.data))
      .catch(() => {});
  }, []);

  const clientSearchResults =
    clientSearch.length > 0
      ? clients
          .filter((c) => {
            const q = clientSearch.toLowerCase();
            return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
          })
          .slice(0, 6)
      : [];

  const selectClientSuggestion = (c: Client) => {
    setClientEmail(c.email);
    setClientName(c.name);
    setClientPhone(c.phone || "");
    setClientSearch("");
    setShowSuggestions(false);
  };

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const getSelectedProductsData = (exchangeRate: number): LineItem[] => {
    const rate = Number(exchangeRate) || 25;
    return products
      .filter((p) => selectedProducts.has(p.id))
      .map((product) => {
        const unitCost = Number(product.unitCost) || 0;
        const unitCostEur = Number(product.unitCostEur);
        return {
          sku: product.sku,
          name: product.title,
          quantity: 1,
          unitCost,
          unitCostEur: Number.isNaN(unitCostEur) ? Math.round((unitCost / rate) * 100) / 100 : unitCostEur,
          total: unitCost,
          image: product.image,
          vatRate: product.vatRate ?? 21,
          dimensions: product.dimensions,
        };
      });
  };

  const handleCreateNewOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!offerTitle || !clientName || !clientEmail || selectedProducts.size === 0) {
      alert("Vyplňte prosím všechna povinná pole a vyberte alespoň jeden produkt");
      return;
    }

    try {
      setSubmitting(true);
      const { rate: exchangeRate } = await exchangeRateApi.get();
      const lineItems = getSelectedProductsData(exchangeRate);
      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

      const group: ItemGroup = {
        id: crypto.randomUUID(),
        name: "Produkty",
        discount: 0,
        items: lineItems,
      };

      const result = await offersApi.create({
        client: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
        },
        title: offerTitle,
        description: offerDescription,
        items: [group],
        subtotal,
        total: subtotal,
        currency: "CZK",
        exchangeRate,
        status: "draft",
      });

      if (result.success) {
        router.push(`/offers/${result.data.simpleId}`);
      }
    } catch (err) {
      console.error("Error creating offer:", err);
      alert("Chyba při vytváření nabídky");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddToExistingOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetOfferId || selectedProducts.size === 0) {
      alert("Zadejte ID nabídky a vyberte alespoň jeden produkt");
      return;
    }

    try {
      setSubmitting(true);
      const { rate: exchangeRate } = await exchangeRateApi.get();
      const items = getSelectedProductsData(exchangeRate);

      const result = await offersApi.addItems(targetOfferId, items, targetGroupId || undefined);

      if (result.success) {
        router.push(`/offers/${targetOfferId}`);
      }
    } catch (err) {
      console.error("Error adding items:", err);
      alert("Chyba při přidávání produktů");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (amount: string) => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
    }).format(parseFloat(amount));
  };

  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-4">
          <Button variant="outline" onClick={() => router.push("/offers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na nabídky
          </Button>
        </div>

        {/* Selection Banner */}
        {selectedProducts.size > 0 && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="flex items-center justify-between py-4">
              <span className="font-medium">Vybráno {selectedProducts.size}</span>
              <div className="flex gap-2 flex-wrap">
                {existingOfferId && targetGroupId ? (
                  <Button onClick={() => setShowExistingOfferModal(true)}>Přidat do nabídky #{existingOfferId}</Button>
                ) : (
                  <>
                    <Button onClick={() => setShowNewOfferModal(true)}>Vytvořit novou nabídku</Button>
                    <Button variant="secondary" onClick={() => setShowExistingOfferModal(true)}>
                      Přidat k existující nabídce
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Input placeholder="Hledat podle názvu, SKU, značky nebo kolekce..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Produkty</CardTitle>
            <Button variant="outline" size="sm" onClick={refreshProducts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Obnovit
            </Button>
          </CardHeader>
          <CardContent>
            {loading && <div className="py-8 text-center text-muted-foreground">Načítání produktů...</div>}

            {!loading && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="w-16"></TableHead>
                      <TableHead>Produkt</TableHead>
                      <TableHead>Značka</TableHead>
                      <TableHead>Kolekce</TableHead>
                      <TableHead>Substrát</TableHead>
                      <TableHead>Dodání (dny)</TableHead>
                      <TableHead>Sklad</TableHead>
                      <TableHead>Rozměry</TableHead>
                      <TableHead>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex cursor-default items-center gap-1">
                                Cena
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cena bez DPH, po slevě 5 %</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleProduct(product.id)}
                            className="h-4 w-4 cursor-pointer"
                          />
                        </TableCell>
                        <TableCell>
                          <Image src={product.image} alt={product.title} width={50} height={50} className="rounded-md object-cover" />
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold">{product.title}</div>
                          <div className="text-sm text-muted-foreground">SKU: {product.sku}</div>
                        </TableCell>
                        <TableCell>{product.brand}</TableCell>
                        <TableCell>{product.collection}</TableCell>
                        <TableCell>{product.substrate ?? "—"}</TableCell>
                        <TableCell className="text-center">{product.deliveryTime ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const stock = stockMap[product.sku];
                            if (!stock) return <span className="text-muted-foreground">—</span>;
                            const qty = stock.stockAvailable;
                            return (
                              <span className={qty > 0 ? "font-medium text-green-600" : "text-red-500"}>
                                {qty > 0 ? qty : "0"}
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {product.dimensions?.height > 0 && <span>Výška: {product.dimensions.height} cm</span>}
                            {product.dimensions?.depth > 0 && <span>Hloubka: {product.dimensions.depth} cm</span>}
                            {product.dimensions?.diameter > 0 && <span>Průměr: {product.dimensions.diameter} cm</span>}
                            {product.dimensions?.opening > 0 && <span>Průměr vnitřní: {product.dimensions.opening} cm</span>}
                            {product.dimensions?.length > 0 && <span>Délka: {product.dimensions.length} cm</span>}
                            {product.dimensions?.potSize && <span>Velikost květináče: {product.dimensions.potSize} cm</span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {(Number(product.unitCostEur) || 0).toFixed(2)} EUR / {formatPrice(product.price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>
                      Předchozí
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Stránka {currentPage} z {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
                      Další
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Offer Modal */}
      <Dialog open={showNewOfferModal} onOpenChange={setShowNewOfferModal}>
        <DialogContent>
          <form onSubmit={handleCreateNewOffer}>
            <DialogHeader>
              <DialogTitle>Vytvořit novou nabídku</DialogTitle>
              <DialogDescription>Vyplňte údaje o nabídce a klientovi</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="offer-title">Název nabídky *</Label>
                <Input id="offer-title" value={offerTitle} onChange={(e) => setOfferTitle(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="offer-description">Popis (volitelné)</Label>
                <Input id="offer-description" value={offerDescription} onChange={(e) => setOfferDescription(e.target.value)} />
              </div>
              <div className="relative">
                <Label htmlFor="client-search">Vyhledat klienta</Label>
                <Input
                  id="client-search"
                  placeholder="Hledat podle jména nebo emailu..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  autoComplete="off"
                />
                {showSuggestions && clientSearchResults.length > 0 && (
                  <ul className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
                    {clientSearchResults.map((c) => (
                  <li key={c.id} className="cursor-pointer px-3 py-2 hover:bg-muted" onMouseDown={() => selectClientSuggestion(c)}>
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <Label htmlFor="customer-name">Jméno klienta *</Label>
                <Input id="customer-name" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="customer-email">Email klienta *</Label>
                <Input id="customer-email" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="customer-phone">Telefon (volitelné)</Label>
                <Input id="customer-phone" type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
              </div>
              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">Vybráno: {selectedProducts.size}</div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowNewOfferModal(false)}>
                Zrušit
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Vytváření..." : "Vytvořit nabídku"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Existing Offer Modal */}
      <Dialog open={showExistingOfferModal} onOpenChange={setShowExistingOfferModal}>
        <DialogContent>
          <form onSubmit={handleAddToExistingOffer}>
            <DialogHeader>
              <DialogTitle>Přidat k existující nabídce</DialogTitle>
              <DialogDescription>Zadejte ID nabídky, ke které chcete přidat produkty</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="offer-id">ID nabídky *</Label>
                <Input
                  id="offer-id"
                  value={targetOfferId}
                  onChange={(e) => setTargetOfferId(e.target.value)}
                  placeholder="např. 1, 2, 3..."
                  type="number"
                  required
                />
              </div>
              <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">Počet produktů: {selectedProducts.size}</div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowExistingOfferModal(false)}>
                Zrušit
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Přidávání..." : "Přidat produkty"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Načítání...</div>}>
      <ProductsPageContent />
    </Suspense>
  );
}
