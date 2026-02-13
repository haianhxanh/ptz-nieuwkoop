"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { offersApi, type Offer } from "@/lib/api";

const statusConfig = {
  draft: { label: "Koncept", variant: "secondary" as const },
  sent: { label: "Odesláno", variant: "default" as const },
  accepted: { label: "Přijato", variant: "success" as const },
  rejected: { label: "Odmítnuto", variant: "destructive" as const },
  expired: { label: "Vypršelo", variant: "outline" as const },
};

export default function OffersPage() {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("cs-CZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
            {loading && <div className="py-8 text-center text-muted-foreground">Načítání...</div>}

            {error && <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>}

            {!loading && !error && offers.length === 0 && (
              <div className="py-12 text-center">
                <h3 className="mb-2 text-lg font-semibold">Zatím žádné nabídky</h3>
                <p className="mb-4 text-muted-foreground">Začněte vytvořením nové nabídky pro zákazníka</p>
                <Button onClick={() => router.push("/products")}>Vytvořit nabídku</Button>
              </div>
            )}

            {!loading && !error && offers.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>Název</TableHead>
                    <TableHead>Zákazník</TableHead>
                    <TableHead>Stav</TableHead>
                    <TableHead>Počet</TableHead>
                    <TableHead>Celkem</TableHead>
                    <TableHead>Vytvořeno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.map((offer) => (
                    <TableRow key={offer.id} className="cursor-pointer" onClick={() => router.push(`/offers/${offer.simple_id}`)}>
                      <TableCell className="font-mono font-semibold">#{offer.simple_id}</TableCell>
                      <TableCell className="font-semibold">{offer.title}</TableCell>
                      <TableCell>
                        <div>{offer.customer.name}</div>
                        <div className="text-sm text-muted-foreground">{offer.customer.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[offer.status].variant}>{statusConfig[offer.status].label}</Badge>
                      </TableCell>
                      <TableCell>{offer.items?.length || 0}</TableCell>
                      <TableCell className="font-semibold">{formatPrice(offer.total, offer.currency)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(offer.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
