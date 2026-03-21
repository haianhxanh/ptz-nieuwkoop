"use client";

import { useEffect, useMemo, useState } from "react";
import { Nav } from "@/components/nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { configsApi, type AppConfig } from "@/lib/api";
import { Plus, Search, Edit } from "lucide-react";
import { toast } from "sonner";

const EXAMPLE_KEYS = ["EXCHANGE_RATE_EUR_CZK", "NIEUWKOOP_DISCOUNT", "COMPANY_PROFILES"];

type EditableConfig = {
  key: string;
  value: string;
  description: string;
};

export default function ConfigsPage() {
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EditableConfig>({
    key: "",
    value: "",
    description: "",
  });

  useEffect(() => {
    void loadConfigs();
  }, []);

  const filteredConfigs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return configs;
    return configs.filter(
      (config) =>
        config.key.toLowerCase().includes(query) || config.value.toLowerCase().includes(query) || (config.description || "").toLowerCase().includes(query),
    );
  }, [configs, searchQuery]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await configsApi.list();
      if (result.success) {
        setConfigs(result.data);
      }
    } catch (err) {
      console.error("Error loading configs:", err);
      setError("Nepodařilo se načíst konfigurace");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = (presetKey = "") => {
    setIsCreating(true);
    setEditingConfig({
      key: presetKey,
      value: "",
      description: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (config: AppConfig) => {
    setIsCreating(false);
    setEditingConfig({
      key: config.key,
      value: config.value,
      description: config.description || "",
    });
    setDialogOpen(true);
  };

  const saveConfig = async () => {
    if (!editingConfig.key.trim()) {
      toast.error("Klíč konfigurace je povinný");
      return;
    }

    try {
      setSaving(true);
      if (isCreating) {
        await configsApi.create({
          key: editingConfig.key.trim(),
          value: editingConfig.value,
          description: editingConfig.description.trim() || undefined,
        });
        toast.success("Konfigurace byla vytvořena");
      } else {
        await configsApi.update(editingConfig.key, {
          value: editingConfig.value,
          description: editingConfig.description.trim() || undefined,
        });
        toast.success("Konfigurace byla aktualizována");
      }
      setDialogOpen(false);
      await loadConfigs();
    } catch (err: any) {
      console.error("Error saving config:", err);
      toast.error(err?.response?.data?.error || "Nepodařilo se uložit konfiguraci");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Konfigurace</CardTitle>
              </div>
              <Button onClick={() => openCreateDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Přidat konfiguraci
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_KEYS.map((key) => (
                <Button key={key} type="button" variant="outline" size="sm" onClick={() => openCreateDialog(key)}>
                  {key}
                </Button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hledat podle klíče, hodnoty nebo popisu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading && <div className="py-8 text-center text-muted-foreground">Načítání...</div>}
            {error && <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error}</div>}

            {!loading && !error && filteredConfigs.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">Zatím zde nejsou žádné konfigurace.</div>
            )}

            {!loading && !error && filteredConfigs.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[260px]">Klíč</TableHead>
                    <TableHead>Hodnota</TableHead>
                    <TableHead className="w-[260px]">Popis</TableHead>
                    <TableHead className="w-[140px]">Aktualizováno</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConfigs.map((config) => (
                    <TableRow key={config.key}>
                      <TableCell className="font-mono text-xs font-semibold">{config.key}</TableCell>
                      <TableCell className="max-w-[520px]">
                        <pre className="whitespace-pre-wrap break-words text-xs text-foreground">{config.value}</pre>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{config.description || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {config.updatedAt ? new Date(config.updatedAt).toLocaleString("cs-CZ") : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(config)} className="gap-1">
                          <Edit className="h-3.5 w-3.5" />
                          Upravit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isCreating ? "Přidat konfiguraci" : "Upravit konfiguraci"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="config-key">Klíč</Label>
              <Input
                id="config-key"
                value={editingConfig.key}
                onChange={(e) => setEditingConfig((prev) => ({ ...prev, key: e.target.value }))}
                disabled={!isCreating}
                placeholder="EXCHANGE_RATE_EUR_CZK"
              />
            </div>

            <div>
              <Label htmlFor="config-description">Popis</Label>
              <Input
                id="config-description"
                value={editingConfig.description}
                onChange={(e) => setEditingConfig((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Např. aktuální kurz EUR/CZK"
              />
            </div>

            <div>
              <Label htmlFor="config-value">Hodnota</Label>
              <Textarea
                id="config-value"
                value={editingConfig.value}
                onChange={(e) => setEditingConfig((prev) => ({ ...prev, value: e.target.value }))}
                placeholder='Např. "24.95" nebo JSON pro COMPANY_PROFILES'
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Zrušit
            </Button>
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? "Ukládání..." : "Uložit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
