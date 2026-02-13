"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { offersApi, type LineItem } from "@/lib/api";
import { useProducts } from "@/contexts/products-context";
import { ArrowLeft, RefreshCw } from "lucide-react";

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingOfferId = searchParams?.get("offer");

  // Use cached products from context
  const { products, loading, refreshProducts } = useProducts();

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
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [targetOfferId, setTargetOfferId] = useState(existingOfferId || "");

  useEffect(() => {
    let filtered = products;

    if (searchQuery) {
      filtered = products.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [products, searchQuery]);

  const toggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const getSelectedProductsData = (): LineItem[] => {
    return products
      .filter((p) => selectedProducts.has(p.id))
      .map((product) => ({
        sku: product.sku,
        name: product.title,
        quantity: 1,
        unit_price: parseFloat(product.price),
        total: parseFloat(product.price),
        image: product.image,
      }));
  };

  const handleCreateNewOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!offerTitle || !customerName || !customerEmail || selectedProducts.size === 0) {
      alert("Vyplňte prosím všechna povinná pole a vyberte alespoň jeden produkt");
      return;
    }

    try {
      setSubmitting(true);
      const items = getSelectedProductsData();
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);

      const result = await offersApi.create({
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
        title: offerTitle,
        description: offerDescription,
        items,
        subtotal,
        total: subtotal,
        currency: "CZK",
        status: "draft",
      });

      if (result.success) {
        router.push(`/offers/${result.data.simple_id}`);
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
      const items = getSelectedProductsData();

      const result = await offersApi.addItems(targetOfferId, items);

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
              <div className="flex gap-2">
                <Button onClick={() => setShowNewOfferModal(true)}>Vytvořit novou nabídku</Button>
                <Button variant="secondary" onClick={() => setShowExistingOfferModal(true)}>
                  Přidat k existující nabídce
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Input placeholder="Hledat podle názvu nebo SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
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
                      <TableHead>Cena</TableHead>
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
                        <TableCell className="font-semibold">{formatPrice(product.price)}</TableCell>
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
              <DialogDescription>Vyplňte údaje o nabídce a zákazníkovi</DialogDescription>
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
              <div>
                <Label htmlFor="customer-name">Jméno zákazníka *</Label>
                <Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="customer-email">Email zákazníka *</Label>
                <Input id="customer-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="customer-phone">Telefon (volitelné)</Label>
                <Input id="customer-phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
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
