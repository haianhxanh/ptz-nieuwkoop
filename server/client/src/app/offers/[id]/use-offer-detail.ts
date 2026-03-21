"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  offersApi,
  exchangeRateApi,
  type Offer,
  type ItemGroup,
  type LineItem,
  type OfferStatus,
  type AdditionalItem,
  type CompanyProfile,
  type Client,
} from "@/lib/api";
import { useProducts } from "@/contexts/products-context";
import { DEFAULT_ADDITIONAL_ITEMS } from "./constants";
import { buildAndDownloadOfferExcel, type OfferTotals } from "./export-offer-excel";

function normalizeGroups(raw: any[]): ItemGroup[] {
  if (!raw || raw.length === 0) return [];
  // Detect old flat LineItem[] format (items have no `items` array property)
  if (!("items" in raw[0])) {
    return [{ id: crypto.randomUUID(), name: "Produkty", discount: 0, discountType: "fixed" as const, items: raw as LineItem[] }];
  }
  return raw as ItemGroup[];
}

export function useOfferDetail() {
  const params = useParams();
  const { products } = useProducts();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedGroups, setEditedGroups] = useState<ItemGroup[]>([]);
  const [sellMultiplier, setSellMultiplier] = useState<number>(1);
  const [status, setStatus] = useState<OfferStatus>("draft");
  const [offerTitle, setOfferTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [updatingRate, setUpdatingRate] = useState(false);
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>(DEFAULT_ADDITIONAL_ITEMS);
  const [notesText, setNotesText] = useState<string>("");
  const [editingAdditionalIndex, setEditingAdditionalIndex] = useState<number | null>(null);
  const [totalRounded, setTotalRounded] = useState<number | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [availableCompanies, setAvailableCompanies] = useState<CompanyProfile[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) loadOffer(params.id as string);
  }, [params.id]);

  useEffect(() => {
    exchangeRateApi
      .get()
      .then(({ companies }) => {
        setAvailableCompanies(companies);
        setCompanyProfile((prev) => {
          if (!prev) return prev;
          const match = companies.find((c) => c.companyName === prev.companyName);
          return match ?? prev;
        });
      })
      .catch(() => {});
    offersApi
      .listClients()
      .then((res) => {
        if (res.success) setAllClients(res.data);
      })
      .catch(() => {});
  }, []);

  const loadOffer = async (id: string) => {
    try {
      setLoading(true);
      const data = await offersApi.getById(id);
      if (data.success) {
        setOffer(data.data);
        setEditedGroups(normalizeGroups(data.data.items || []));
        setSellMultiplier(Number(data.data.sellMultiplier) || 1);
        setStatus(data.data.status);
        setOfferTitle(data.data.title || "");
        setDescription(data.data.description || "");
        setNotesText(data.data.notes || "");
        setAdditionalItems(data.data.additionalItems?.length ? data.data.additionalItems : DEFAULT_ADDITIONAL_ITEMS);
        setTotalRounded(data.data.totalRounded != null ? Number(data.data.totalRounded) : null);
        const storedProfile = data.data.companyProfile ?? null;
        if (storedProfile && availableCompanies.length > 0) {
          const match = availableCompanies.find((c) => c.companyName === storedProfile.companyName);
          setCompanyProfile(match ?? storedProfile);
        } else {
          setCompanyProfile(storedProfile);
        }
        setSelectedClientId(data.data.clientId ?? data.data.client?.id ?? null);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      setError("Nabídka nebyla nalezena");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Group management ────────────────────────────────────────────────────────

  const addGroup = async (name: string) => {
    if (!offer) return;
    const newGroup: ItemGroup = { id: crypto.randomUUID(), name, discount: 0, discountType: "fixed", items: [] };
    const newGroups = [...editedGroups, newGroup];
    setEditedGroups(newGroups);
    try {
      await offersApi.update(offer.simpleId.toString(), { items: newGroups });
    } catch (err) {
      console.error("Failed to auto-save new section:", err);
      toast.error("Sekce přidána, ale nepodařilo se uložit");
    }
    return newGroup.id;
  };

  const removeGroup = (groupIndex: number) => {
    setEditedGroups((prev) => prev.filter((_, i) => i !== groupIndex));
    setTotalRounded(null);
    setHasUnsavedChanges(true);
  };

  const renameGroup = (groupIndex: number, name: string) => {
    setEditedGroups((prev) => prev.map((g, i) => (i === groupIndex ? { ...g, name } : g)));
    setHasUnsavedChanges(true);
  };

  const updateGroupNotes = (groupIndex: number, notes: string) => {
    setEditedGroups((prev) => prev.map((g, i) => (i === groupIndex ? { ...g, notes } : g)));
    setHasUnsavedChanges(true);
  };

  const updateGroupDiscount = (groupIndex: number, discount: number, discountType?: "fixed" | "percent") => {
    setEditedGroups((prev) =>
      prev.map((g, i) => (i === groupIndex ? { ...g, discount, ...(discountType !== undefined ? { discountType } : {}) } : g)),
    );
    setTotalRounded(null);
    setHasUnsavedChanges(true);
  };

  const removeItemFromGroup = (groupIndex: number, itemIndex: number) => {
    setEditedGroups((prev) => prev.map((g, i) => (i === groupIndex ? { ...g, items: g.items.filter((_, j) => j !== itemIndex) } : g)));
    setTotalRounded(null);
    setHasUnsavedChanges(true);
  };

  // ── Item editing ────────────────────────────────────────────────────────────

  const updateItemQuantity = (groupIndex: number, itemIndex: number, quantity: number) => {
    setEditedGroups((prev) =>
      prev.map((g, i) => {
        if (i !== groupIndex) return g;
        const newItems = [...g.items];
        const item = { ...newItems[itemIndex] };
        item.quantity = quantity;
        item.total = item.unitPrice * quantity;
        newItems[itemIndex] = item;
        return { ...g, items: newItems };
      }),
    );
    setTotalRounded(null);
    setHasUnsavedChanges(true);
  };

  // ── Drag & drop (within a group) ────────────────────────────────────────────

  const [dragState, setDragState] = useState<{ groupIndex: number; itemIndex: number } | null>(null);
  const [groupDragIndex, setGroupDragIndex] = useState<number | null>(null);

  const handleDragStart = (groupIndex: number, itemIndex: number) => setDragState({ groupIndex, itemIndex });

  const handleDragOver = (e: React.DragEvent, groupIndex: number, itemIndex: number) => {
    e.preventDefault();
    if (!dragState || dragState.groupIndex !== groupIndex || dragState.itemIndex === itemIndex) return;
    setEditedGroups((prev) =>
      prev.map((g, i) => {
        if (i !== groupIndex) return g;
        const newItems = [...g.items];
        const dragged = newItems[dragState.itemIndex];
        newItems.splice(dragState.itemIndex, 1);
        newItems.splice(itemIndex, 0, dragged);
        return { ...g, items: newItems };
      }),
    );
    setDragState({ groupIndex, itemIndex });
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = () => setDragState(null);

  const handleGroupDragStart = (groupIndex: number) => setGroupDragIndex(groupIndex);

  const handleGroupDragOver = (e: React.DragEvent, groupIndex: number) => {
    e.preventDefault();
    if (groupDragIndex === null || groupDragIndex === groupIndex) return;
    setEditedGroups((prev) => {
      const newGroups = [...prev];
      const dragged = newGroups[groupDragIndex];
      newGroups.splice(groupDragIndex, 1);
      newGroups.splice(groupIndex, 0, dragged);
      return newGroups;
    });
    setGroupDragIndex(groupIndex);
    setHasUnsavedChanges(true);
  };

  const handleGroupDragEnd = () => setGroupDragIndex(null);

  // ── Totals ──────────────────────────────────────────────────────────────────

  const resolveGroupDiscount = (group: ItemGroup, groupSellSubtotal: number): number => {
    const raw = Number(group.discount) || 0;
    if (group.discountType === "percent") return (groupSellSubtotal * raw) / 100;
    return raw;
  };

  const calculateTotals = (): OfferTotals => {
    const multiplier = Number(sellMultiplier) || 1;
    const itemsSubtotal = editedGroups.reduce((sum, g) => sum + g.items.reduce((s, item) => s + item.unitPrice * item.quantity, 0), 0);

    const groupsDiscount = editedGroups.reduce((sum, g) => {
      const groupSell = g.items.reduce((s, item) => {
        const vat = (item.vatRate ?? 21) / 100;
        return s + item.unitPrice * (1 + vat) * multiplier * item.quantity;
      }, 0);
      return sum + resolveGroupDiscount(g, groupSell);
    }, 0);

    const totalDiscountAmount = groupsDiscount;
    const additionalCostTotal = additionalItems.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    const additionalSellTotal = additionalItems.reduce((sum, a) => sum + (Number(a.sellPrice) || 0), 0);
    const total = itemsSubtotal - totalDiscountAmount + additionalCostTotal;
    const itemsSellSubtotal = editedGroups.reduce(
      (sum, g) =>
        sum +
        g.items.reduce((s, item) => {
        const vat = (item.vatRate ?? 21) / 100;
        return s + item.unitPrice * (1 + vat) * multiplier * item.quantity;
        }, 0),
      0,
    );
    const itemsSellExclVat = editedGroups.reduce((sum, g) => sum + g.items.reduce((s, item) => s + item.unitPrice * multiplier * item.quantity, 0), 0);
    const totalSell = itemsSellSubtotal - totalDiscountAmount + additionalSellTotal;
    const totalSellExclVat = itemsSellExclVat - totalDiscountAmount + additionalSellTotal;
    return {
      itemsSubtotal,
      groupsDiscount,
      totalDiscountAmount,
      additionalCostTotal,
      additionalSellTotal,
      subtotal: itemsSubtotal,
      total,
      totalSell,
      totalSellExclVat,
    };
  };

  // ── Exchange rate ───────────────────────────────────────────────────────────

    const displayExchangeRate = Number(offer?.exchangeRate) || 25;

  const applyTodaysExchangeRate = async () => {
    if (!offer) return;
    try {
      setUpdatingRate(true);
      const { rate } = await exchangeRateApi.get();

      const recalculatedGroups = editedGroups.map((g) => ({
        ...g,
        items: g.items.map((item) => {
          const eurPrice = Number(item.unitPriceEur) || 0;
          const newCzk = eurPrice > 0 ? Math.round(eurPrice * rate * 100) / 100 : item.unitPrice;
          return {
            ...item,
            unitPrice: newCzk,
            unitPriceEur: eurPrice || item.unitPriceEur,
            vatRate: item.vatRate ?? 21,
            total: newCzk * item.quantity,
          };
        }),
      }));

      setEditedGroups(recalculatedGroups);

      await offersApi.update(offer.simpleId.toString(), {
        exchangeRate: rate,
        items: recalculatedGroups,
      });
      toast.success(`Kurz aktualizován na ${rate.toFixed(2)} CZK, ceny přepočítány`);
      loadOffer(params.id as string);
    } catch (err) {
      console.error(err);
      toast.error("Nepodařilo se aktualizovat kurz");
    } finally {
      setUpdatingRate(false);
    }
  };

  // ── Export ──────────────────────────────────────────────────────────────────

  const exportToExcel = () => {
    if (!offer) return;
    buildAndDownloadOfferExcel(
      offer,
      editedGroups,
      additionalItems,
      calculateTotals(),
      displayExchangeRate,
      notesText,
      () => toast.success("Export do Excelu dokončen"),
      Number(sellMultiplier) || 1,
    );
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const saveChanges = async () => {
    if (!offer) return;
    try {
      setSaving(true);
      const { subtotal, total } = calculateTotals();
      const rate = Number(offer.exchangeRate) || 25;

      const finalSellMultiplier = Number(sellMultiplier) || 1;

      const sanitizedGroups: ItemGroup[] = editedGroups.map((g) => ({
        ...g,
        discount: Number(g.discount) || 0,
        discountType: g.discountType || "fixed",
        items: g.items.map((item) => {
          const unitPrice = Number(item.unitPrice) || 0;
          const unitPriceEur = item.unitPriceEur != null ? Number(item.unitPriceEur) : Math.round((unitPrice / rate) * 100) / 100;
          return {
            ...item,
            quantity: Number(item.quantity) || 1,
            unitPrice,
            unitPriceEur,
            vatRate: item.vatRate ?? 21,
            total: unitPrice * (Number(item.quantity) || 1),
          };
        }),
      }));

      const finalSubtotal = Number(Number(subtotal).toFixed(2)) || 0;
      const finalTotal = Number(Number(total).toFixed(2)) || 0;

      if (isNaN(finalSubtotal) || isNaN(finalTotal)) {
        toast.error("Chyba při výpočtu celkové částky");
        setSaving(false);
        return;
      }

      await offersApi.update(offer.simpleId.toString(), {
        clientId: selectedClientId || undefined,
        title: offerTitle.trim() || offer.title,
        items: sanitizedGroups,
        additionalItems: additionalItems.map((a) => ({ title: a.title, price: Number(a.price) || 0, sellPrice: Number(a.sellPrice) || 0 })),
        sellMultiplier: finalSellMultiplier,
        totalRounded,
        companyProfile,
        status,
        description,
        notes: notesText || undefined,
      });

      toast.success("Změny uloženy");
      loadOffer(params.id as string);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      console.error("Error saving changes:", err);
      toast.error(ax.response?.data?.error || "Chyba při ukládání změn");
    } finally {
      setSaving(false);
    }
  };

  // ── Dirty helpers ───────────────────────────────────────────────────────────

  const setAdditionalItemsState = (items: AdditionalItem[] | ((prev: AdditionalItem[]) => AdditionalItem[])) => {
    setAdditionalItems(typeof items === "function" ? items(additionalItems) : items);
    setTotalRounded(null);
    setHasUnsavedChanges(true);
  };

  const setOfferTitleWithDirty = (v: string) => {
    setOfferTitle(v);
    setHasUnsavedChanges(true);
  };
  const setStatusWithDirty = (v: OfferStatus) => {
    setStatus(v);
    setHasUnsavedChanges(true);
  };
  const setDescriptionWithDirty = (v: string) => {
    setDescription(v);
    setHasUnsavedChanges(true);
  };
  const setNotesTextWithDirty = (v: string) => {
    setNotesText(v);
    setHasUnsavedChanges(true);
  };
  const markUnsaved = () => setHasUnsavedChanges(true);
  const setSellMultiplierWithDirty = (v: number) => {
    setSellMultiplier(v);
    setTotalRounded(null);
    setHasUnsavedChanges(true);
  };

  return {
    offer,
    setOffer,
    loading,
    error,
    editedGroups,
    sellMultiplier,
    setSellMultiplier: setSellMultiplierWithDirty,
    status,
    setStatus: setStatusWithDirty,
    offerTitle,
    setOfferTitle: setOfferTitleWithDirty,
    description,
    setDescription: setDescriptionWithDirty,
    saving,
    dragState,
    hasUnsavedChanges,
    additionalItems,
    setAdditionalItems: setAdditionalItemsState,
    notesText,
    setNotesText: setNotesTextWithDirty,
    editingAdditionalIndex,
    setEditingAdditionalIndex,
    loadOffer,
    addGroup,
    removeGroup,
    renameGroup,
    updateGroupNotes,
    updateGroupDiscount,
    removeItemFromGroup,
    updateItemQuantity,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    groupDragIndex,
    handleGroupDragStart,
    handleGroupDragOver,
    handleGroupDragEnd,
    totalRounded,
    setTotalRounded: (v: number | null) => {
      setTotalRounded(v);
      setHasUnsavedChanges(true);
    },
    companyProfile,
    setCompanyProfile: (v: CompanyProfile | null) => {
      setCompanyProfile(v);
      setHasUnsavedChanges(true);
    },
    availableCompanies,
    allClients,
    selectedClientId,
    setSelectedClientId: (id: string) => {
      setSelectedClientId(id);
      setHasUnsavedChanges(true);
    },
    calculateTotals,
    displayExchangeRate,
    applyTodaysExchangeRate,
    exportToExcel,
    saveChanges,
    markUnsaved,
    updatingRate,
  };
}
