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
import { offersApi } from "@/lib/api";
import { Search, Mail, Phone, MapPin, User, Edit } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  notes?: string;
  created_at: string;
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCustomers(customers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = customers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(query) ||
          customer.email.toLowerCase().includes(query) ||
          customer.phone?.toLowerCase().includes(query) ||
          customer.city?.toLowerCase().includes(query),
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await offersApi.listCustomers();
      if (data.success) {
        setCustomers(data.data as Customer[]);
        setFilteredCustomers(data.data as Customer[]);
      }
    } catch (err) {
      setError("Chyba při načítání zákazníků");
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

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer({ ...customer });
    setEditDialogOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!editingCustomer) return;

    try {
      setSaving(true);
      const result = await offersApi.updateCustomer(editingCustomer.id, {
        name: editingCustomer.name,
        email: editingCustomer.email,
        phone: editingCustomer.phone,
        address: editingCustomer.address,
        city: editingCustomer.city,
        postal_code: editingCustomer.postal_code,
        country: editingCustomer.country,
        notes: editingCustomer.notes,
      });

      if (result.success) {
        toast.success("Zákazník byl aktualizován");
        setEditDialogOpen(false);
        loadCustomers();
      }
    } catch (err: any) {
      console.error("Error updating customer:", err);
      toast.error(err.response?.data?.error || "Chyba při ukládání změn");
    } finally {
      setSaving(false);
    }
  };

  const updateEditingCustomer = (field: keyof Customer, value: string) => {
    if (editingCustomer) {
      setEditingCustomer({ ...editingCustomer, [field]: value });
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
                <CardTitle>Seznam zákazníků</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Celkem {customers.length} {customers.length === 1 ? "zákazník" : customers.length < 5 ? "zákazníci" : "zákazníků"}
                </p>
              </div>
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

            {!loading && !error && customers.length === 0 && (
              <div className="py-12 text-center">
                <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Zatím žádní zákazníci</h3>
                <p className="text-muted-foreground">Zákazníci se vytvoří automaticky při vytvoření nabídky</p>
              </div>
            )}

            {!loading && !error && customers.length > 0 && filteredCustomers.length === 0 && (
              <div className="py-12 text-center">
                <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Žádné výsledky</h3>
                <p className="text-muted-foreground">Zkuste změnit vyhledávací dotaz</p>
              </div>
            )}

            {!loading && !error && filteredCustomers.length > 0 && (
              <div className="space-y-4">
                {filteredCustomers.map((customer) => (
                  <Card key={customer.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div>
                            <h3 className="text-lg font-semibold">{customer.name}</h3>
                            <p className="text-sm text-muted-foreground">Vytvořeno {formatDate(customer.created_at)}</p>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                                {customer.email}
                              </a>
                            </div>

                            {customer.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                                  {customer.phone}
                                </a>
                              </div>
                            )}

                            {(customer.address || customer.city) && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">
                                  {customer.address && <span>{customer.address}, </span>}
                                  {customer.postal_code && <span>{customer.postal_code} </span>}
                                  {customer.city}
                                  {customer.country && <span>, {customer.country}</span>}
                                </span>
                              </div>
                            )}
                          </div>

                          {customer.notes && (
                            <div className="mt-2 rounded-md bg-muted p-3 text-sm">
                              <p className="text-muted-foreground">{customer.notes}</p>
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleEditClick(customer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upravit zákazníka</DialogTitle>
          </DialogHeader>
          {editingCustomer && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Jméno *</Label>
                  <Input id="name" value={editingCustomer.name} onChange={(e) => updateEditingCustomer("name", e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={editingCustomer.email} onChange={(e) => updateEditingCustomer("email", e.target.value)} required />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="phone">Telefon</Label>
                  <Input id="phone" value={editingCustomer.phone || ""} onChange={(e) => updateEditingCustomer("phone", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="postal_code">PSČ</Label>
                  <Input id="postal_code" value={editingCustomer.postal_code || ""} onChange={(e) => updateEditingCustomer("postal_code", e.target.value)} />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Adresa</Label>
                <Input id="address" value={editingCustomer.address || ""} onChange={(e) => updateEditingCustomer("address", e.target.value)} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="city">Město</Label>
                  <Input id="city" value={editingCustomer.city || ""} onChange={(e) => updateEditingCustomer("city", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="country">Země</Label>
                  <Input id="country" value={editingCustomer.country || ""} onChange={(e) => updateEditingCustomer("country", e.target.value)} />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Poznámky</Label>
                <Textarea
                  id="notes"
                  value={editingCustomer.notes || ""}
                  onChange={(e) => updateEditingCustomer("notes", e.target.value)}
                  placeholder="Poznámky k zákazníkovi..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Zrušit
            </Button>
            <Button onClick={handleSaveCustomer} disabled={saving}>
              {saving ? "Ukládání..." : "Uložit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
