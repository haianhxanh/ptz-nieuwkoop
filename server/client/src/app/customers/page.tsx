"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { offersApi, type Client } from "@/lib/api";
import { Search, Mail, Phone, MapPin, User, Edit, Plus } from "lucide-react";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 12;

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredClients(clients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = clients.filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          client.email.toLowerCase().includes(query) ||
          client.phone?.toLowerCase().includes(query) ||
          client.city?.toLowerCase().includes(query),
      );
      setFilteredClients(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, clients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await offersApi.listClients();
      if (data.success) {
        setClients(data.data as Client[]);
        setFilteredClients(data.data as Client[]);
      }
    } catch (err) {
      setError("Chyba při načítání klientů");
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

  const handleEditClick = (client: Client) => {
    setEditingClient({ ...client });
    setIsCreating(false);
    setEditDialogOpen(true);
  };

  const handleNewClick = () => {
    setEditingClient({ id: "", name: "", email: "", createdAt: "" });
    setIsCreating(true);
    setEditDialogOpen(true);
  };

  const handleSaveClient = async () => {
    if (!editingClient) return;

    try {
      setSaving(true);
      const payload = {
        name: editingClient.name,
        email: editingClient.email,
        phone: editingClient.phone,
        address: editingClient.address,
        city: editingClient.city,
        postalCode: editingClient.postalCode,
        country: editingClient.country,
        notes: editingClient.notes,
        companyName: editingClient.companyName,
        companyIco: editingClient.companyIco,
        companyDic: editingClient.companyDic,
      };

      let result;
      if (isCreating) {
        result = await offersApi.createClient(payload);
      } else {
        result = await offersApi.updateClient(editingClient.id!, payload);
      }

      if (result.success) {
        toast.success(isCreating ? "Klient byl vytvořen" : "Klient byl aktualizován");
        setEditDialogOpen(false);
        loadClients();
      }
    } catch (err: any) {
      console.error("Error saving client:", err);
      toast.error(err.response?.data?.error || "Chyba při ukládání");
    } finally {
      setSaving(false);
    }
  };

  const updateEditingClient = (field: keyof Client, value: string) => {
    if (editingClient) {
      setEditingClient({ ...editingClient, [field]: value });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Seznam klientů</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Celkem {clients.length} {clients.length === 1 ? "klient" : clients.length < 5 ? "klienti" : "klientů"}
                </p>
              </div>
              <Button onClick={handleNewClick} className="gap-2">
                <Plus className="h-4 w-4" />
                Nový klient
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hledat podle jména, emailu, telefonu nebo města..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading && <div className="py-8 text-center text-muted-foreground">Načítání...</div>}

            {error && <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>}

            {!loading && !error && clients.length === 0 && (
              <div className="py-12 text-center">
                <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Zatím žádní klienti</h3>
                <p className="text-muted-foreground">Klienti se vytvoří automaticky při vytvoření nabídky</p>
              </div>
            )}

            {!loading && !error && clients.length > 0 && filteredClients.length === 0 && (
              <div className="py-12 text-center">
                <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Žádné výsledky</h3>
                <p className="text-muted-foreground">Zkuste změnit vyhledávací dotaz</p>
              </div>
            )}

            {!loading &&
              !error &&
              filteredClients.length > 0 &&
              (() => {
                const totalPages = Math.ceil(filteredClients.length / ITEMS_PER_PAGE);
                const paginatedClients = filteredClients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                return (
                  <>
                    <div className="space-y-4">
                      {paginatedClients.map((client) => (
                        <Card key={client.id} className="transition-shadow hover:shadow-md">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between gap-4">
                              <div className="grid flex-1 gap-5 md:grid-cols-[minmax(180px,220px)_1fr]">
                                <div className="space-y-2">
                                  <h3 className="text-lg font-semibold leading-tight">{client.name}</h3>
                                </div>

                                <div className="space-y-4">
                                  <div className="grid gap-3 md:grid-cols-3 text-sm">
                                    <div className="flex items-start gap-2">
                                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                      <a href={`mailto:${client.email}`} className="break-all text-blue-600 hover:underline">
                                        {client.email}
                                      </a>
                                    </div>

                                    <div className="flex items-start gap-2">
                                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                      {client.phone ? (
                                        <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                                          {client.phone}
                                        </a>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </div>

                                    <div className="flex items-start gap-2">
                                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                      <span className="text-muted-foreground">
                                        {client.address && <span>{client.address}, </span>}
                                        {client.postalCode && <span>{client.postalCode} </span>}
                                        {client.city || client.country ? (
                                          <>
                                            {client.city}
                                            {client.country && (
                                              <span>
                                                {client.city ? ", " : ""}
                                                {client.country}
                                              </span>
                                            )}
                                          </>
                                        ) : (
                                          "-"
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  {(client.companyName || client.companyIco || client.companyDic) && (
                                    <div className="grid gap-3 rounded-md bg-muted/40 p-3 text-sm md:grid-cols-3">
                                      <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Firma</p>
                                        <p className="font-medium">{client.companyName || "-"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">IČO</p>
                                        <p className="font-medium">{client.companyIco || "-"}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs uppercase tracking-wide text-muted-foreground">DIČ</p>
                                        <p className="font-medium">{client.companyDic || "-"}</p>
                                      </div>
                                    </div>
                                  )}

                                  {client.notes && (
                                    <div className="rounded-md bg-muted p-3 text-sm">
                                      <p className="text-muted-foreground">{client.notes}</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <Button variant="outline" size="sm" onClick={() => handleEditClick(client)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {totalPages > 1 && (
                      <div className="mt-4 flex items-center justify-between border-t pt-4">
                        <span className="text-sm text-muted-foreground">
                          {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredClients.length)} z {filteredClients.length}{" "}
                          klientů
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                            Předchozí
                          </Button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={page === currentPage ? "default" : "outline"}
                              size="sm"
                              className="w-9"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          ))}
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

      {/* Edit Client Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isCreating ? "Nový klient" : "Upravit klienta"}</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Jméno *</Label>
                  <Input id="name" value={editingClient.name} onChange={(e) => updateEditingClient("name", e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={editingClient.email} onChange={(e) => updateEditingClient("email", e.target.value)} required />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" value={editingClient.phone || ""} onChange={(e) => updateEditingClient("phone", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="postalCode">PSČ</Label>
                  <Input id="postalCode" value={editingClient.postalCode || ""} onChange={(e) => updateEditingClient("postalCode", e.target.value)} />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Adresa</Label>
                <Input id="address" value={editingClient.address || ""} onChange={(e) => updateEditingClient("address", e.target.value)} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="city">Město</Label>
                  <Input id="city" value={editingClient.city || ""} onChange={(e) => updateEditingClient("city", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="country">Země</Label>
                  <Input id="country" value={editingClient.country || ""} onChange={(e) => updateEditingClient("country", e.target.value)} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="companyName">Firma</Label>
                  <Input id="companyName" value={editingClient.companyName || ""} onChange={(e) => updateEditingClient("companyName", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="companyIco">IČO</Label>
                  <Input id="companyIco" value={editingClient.companyIco || ""} onChange={(e) => updateEditingClient("companyIco", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="companyDic">DIČ</Label>
                  <Input id="companyDic" value={editingClient.companyDic || ""} onChange={(e) => updateEditingClient("companyDic", e.target.value)} />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Poznámky</Label>
                <Textarea
                  id="notes"
                  value={editingClient.notes || ""}
                  onChange={(e) => updateEditingClient("notes", e.target.value)}
                  placeholder="Poznámky"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Zrušit
            </Button>
            <Button onClick={handleSaveClient} disabled={saving}>
              {saving ? "Ukládání..." : "Uložit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
