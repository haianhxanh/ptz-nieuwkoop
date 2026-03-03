"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { offersApi, exchangeRateApi, type Offer, type ItemGroup, type LineItem, type OfferStatus, type AdditionalItem } from "@/lib/api";
import { DEFAULT_ADDITIONAL_ITEMS } from "./constants";
import { buildAndDownloadOfferExcel, type OfferTotals } from "./export-offer-excel";

function normalizeGroups(raw: any[]): ItemGroup[] {
  if (!raw || raw.length === 0) return [];
  // Detect old flat LineItem[] format (items have no `items` array property)
  if (!("items" in raw[0])) {
    return [{ id: crypto.randomUUID(), name: "Produkty", discount: 0, items: raw as LineItem[] }];
  }
  return raw as ItemGroup[];
}

export function useOfferDetail() {
  const params = useParams();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedGroups, setEditedGroups] = useState<ItemGroup[]>([]);
  const [sellMultiplier, setSellMultiplier] = useState<number>(1);
  const [status, setStatus] = useState<OfferStatus>("draft");
  const [description, setDescription] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [updatingRate, setUpdatingRate] = useState(false);
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>(DEFAULT_ADDITIONAL_ITEMS);
  const [notesText, setNotesText] = useState<string>("");
  const [editingAdditionalIndex, setEditingAdditionalIndex] = useState<number | null>(null);

  useEffect(() => {
    if (params.id) loadOffer(params.id as string);
  }, [params.id]);

  const loadOffer = async (id: string) => {
    try {
      setLoading(true);
      const data = await offersApi.getById(id);
      if (data.success) {
        setOffer(data.data);
        setEditedGroups(normalizeGroups(data.data.items || []));
        setSellMultiplier(Number(data.data.sell_multiplier) || 1);
        setStatus(data.data.status);
        setDescription(data.data.description || "");
        setNotesText(data.data.notes || "");
        setAdditionalItems(data.data.additional_items?.length ? data.data.additional_items : DEFAULT_ADDITIONAL_ITEMS);
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
    const newGroup: ItemGroup = { id: crypto.randomUUID(), name, discount: 0, items: [] };
    const newGroups = [...editedGroups, newGroup];
    setEditedGroups(newGroups);
    try {
      await offersApi.update(offer.simple_id.toString(), { items: newGroups });
    } catch (err) {
      console.error("Failed to auto-save new section:", err);
      toast.error("Sekce přidána, ale nepodařilo se uložit");
    }
    return newGroup.id;
  };

  const removeGroup = (groupIndex: number) => {
    setEditedGroups((prev) => prev.filter((_, i) => i !== groupIndex));
    setHasUnsavedChanges(true);
  };

  const renameGroup = (groupIndex: number, name: string) => {
    setEditedGroups((prev) => prev.map((g, i) => (i === groupIndex ? { ...g, name } : g)));
    setHasUnsavedChanges(true);
  };

  const updateGroupDiscount = (groupIndex: number, discount: number) => {
    setEditedGroups((prev) => prev.map((g, i) => (i === groupIndex ? { ...g, discount } : g)));
    setHasUnsavedChanges(true);
  };

  const removeItemFromGroup = (groupIndex: number, itemIndex: number) => {
    setEditedGroups((prev) => prev.map((g, i) => (i === groupIndex ? { ...g, items: g.items.filter((_, j) => j !== itemIndex) } : g)));
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
        item.total = item.unit_price * quantity;
        newItems[itemIndex] = item;
        return { ...g, items: newItems };
      }),
    );
    setHasUnsavedChanges(true);
  };

  // ── Drag & drop (within a group) ────────────────────────────────────────────

  const [dragState, setDragState] = useState<{ groupIndex: number; itemIndex: number } | null>(null);

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

  // ── Totals ──────────────────────────────────────────────────────────────────

  const calculateTotals = (): OfferTotals => {
    const itemsSubtotal = editedGroups.reduce((sum, g) => sum + g.items.reduce((s, item) => s + item.unit_price * item.quantity, 0), 0);
    const groupsDiscount = editedGroups.reduce((sum, g) => sum + (Number(g.discount) || 0), 0);
    const totalDiscountAmount = groupsDiscount;
    const tax = Number(offer?.tax) || 0;
    const additionalCostTotal = additionalItems.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    const additionalSellTotal = additionalItems.reduce((sum, a) => sum + (Number(a.sell_price) || 0), 0);
    const multiplier = Number(sellMultiplier) || 1;
    const total = itemsSubtotal - totalDiscountAmount + additionalCostTotal + tax;
    const totalSell = itemsSubtotal * multiplier - totalDiscountAmount + additionalSellTotal + tax;
    return {
      itemsSubtotal,
      groupsDiscount,
      totalDiscountAmount,
      additionalCostTotal,
      additionalSellTotal,
      subtotal: itemsSubtotal,
      total,
      totalSell,
    };
  };

  // ── Exchange rate ───────────────────────────────────────────────────────────

  const displayExchangeRate = Number(offer?.exchange_rate) || 25;

  const applyTodaysExchangeRate = async () => {
    if (!offer) return;
    try {
      setUpdatingRate(true);
      const { rate } = await exchangeRateApi.get();
      await offersApi.update(offer.simple_id.toString(), { exchange_rate: rate });
      toast.success(`Kurz nabídky aktualizován na ${rate.toFixed(2)} CZK`);
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
      const rate = Number(offer.exchange_rate) || 25;

      const finalSellMultiplier = Number(sellMultiplier) || 1;

      const sanitizedGroups: ItemGroup[] = editedGroups.map((g) => ({
        ...g,
        discount: Number(g.discount) || 0,
        items: g.items.map((item) => {
          const unitPrice = Number(item.unit_price) || 0;
          const unitPriceEur = item.unit_price_eur != null ? Number(item.unit_price_eur) : Math.round((unitPrice / rate) * 100) / 100;
          return {
            ...item,
            quantity: Number(item.quantity) || 1,
            unit_price: unitPrice,
            unit_price_eur: unitPriceEur,
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

      await offersApi.update(offer.simple_id.toString(), {
        items: sanitizedGroups,
        additional_items: additionalItems.map((a) => ({ title: a.title, price: Number(a.price) || 0, sell_price: Number(a.sell_price) || 0 })),
        sell_multiplier: finalSellMultiplier,
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
    setHasUnsavedChanges(true);
  };

  return {
    offer,
    loading,
    error,
    editedGroups,
    sellMultiplier,
    setSellMultiplier: setSellMultiplierWithDirty,
    status,
    setStatus: setStatusWithDirty,
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
    updateGroupDiscount,
    removeItemFromGroup,
    updateItemQuantity,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    calculateTotals,
    displayExchangeRate,
    applyTodaysExchangeRate,
    exportToExcel,
    saveChanges,
    markUnsaved,
    updatingRate,
  };
}
