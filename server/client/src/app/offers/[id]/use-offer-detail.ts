"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { offersApi, exchangeRateApi, type Offer, type LineItem, type OfferStatus, type AdditionalItem } from "@/lib/api";
import { DEFAULT_ADDITIONAL_ITEMS } from "./constants";
import { buildAndDownloadOfferExcel, type OfferTotals } from "./export-offer-excel";

export function useOfferDetail() {
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
  const [updatingRate, setUpdatingRate] = useState(false);
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>(DEFAULT_ADDITIONAL_ITEMS);
  const [notesText, setNotesText] = useState<string>("");
  const [editingOrderDiscount, setEditingOrderDiscount] = useState(false);
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
        setEditedItems(data.data.items || []);
        setTotalDiscount(data.data.order_discount || 0);
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

  const handleDragStart = (index: number) => setDraggedIndex(index);

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

  const handleDragEnd = () => setDraggedIndex(null);

  const calculateTotals = (): OfferTotals => {
    const itemsSubtotal = editedItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const itemsDiscount = editedItems.reduce((sum, item) => sum + (Number(item.discount) || 0), 0);
    const orderDiscount = Number(totalDiscount) || 0;
    const totalDiscountAmount = itemsDiscount + orderDiscount;
    const tax = Number(offer?.tax) || 0;
    const additionalTotal = additionalItems.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    const subtotalWithAdditional = itemsSubtotal + additionalTotal;
    const total = itemsSubtotal - totalDiscountAmount + tax + additionalTotal;
    return {
      itemsSubtotal,
      itemsDiscount,
      orderDiscount,
      totalDiscountAmount,
      additionalTotal,
      subtotal: itemsSubtotal,
      subtotalWithAdditional,
      total,
    };
  };

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

  const exportToExcel = () => {
    if (!offer) return;
    buildAndDownloadOfferExcel(offer, editedItems, additionalItems, calculateTotals(), displayExchangeRate, notesText, () =>
      toast.success("Export do Excelu dokončen"),
    );
  };

  const saveChanges = async () => {
    if (!offer) return;
    try {
      setSaving(true);
      const { subtotal, total } = calculateTotals();
      const rate = Number(offer.exchange_rate) || 25;
      const sanitizedItems = editedItems.map((item) => {
        const unitPrice = Number(item.unit_price) || 0;
        const unitPriceEur = item.unit_price_eur != null ? Number(item.unit_price_eur) : Math.round((unitPrice / rate) * 100) / 100;
        return {
          ...item,
          quantity: Number(item.quantity) || 1,
          unit_price: unitPrice,
          unit_price_eur: unitPriceEur,
          discount: Number(item.discount) || 0,
          total: Number(item.total) || 0,
        };
      });
      const finalSubtotal = Number(Number(subtotal).toFixed(2)) || 0;
      const finalTotal = Number(Number(total).toFixed(2)) || 0;
      const finalDiscount = Number(totalDiscount) || 0;
      if (isNaN(finalSubtotal) || isNaN(finalTotal) || isNaN(finalDiscount)) {
        toast.error("Chyba při výpočtu celkové částky");
        setSaving(false);
        return;
      }
      await offersApi.update(offer.simple_id.toString(), {
        items: sanitizedItems,
        additional_items: additionalItems.map((a) => ({ title: a.title, price: Number(a.price) || 0 })),
        discount: finalDiscount,
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
  const setTotalDiscountWithDirty = (v: number) => {
    setTotalDiscount(v);
    setHasUnsavedChanges(true);
  };

  return {
    offer,
    loading,
    error,
    editedItems,
    totalDiscount,
    setTotalDiscount: setTotalDiscountWithDirty,
    status,
    setStatus: setStatusWithDirty,
    description,
    setDescription: setDescriptionWithDirty,
    saving,
    draggedIndex,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    additionalItems,
    setAdditionalItems: setAdditionalItemsState,
    notesText,
    setNotesText: setNotesTextWithDirty,
    editingOrderDiscount,
    setEditingOrderDiscount,
    editingAdditionalIndex,
    setEditingAdditionalIndex,
    loadOffer,
    updateItemQuantity,
    updateItemDiscount,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    calculateTotals,
    displayExchangeRate,
    applyTodaysExchangeRate,
    exportToExcel,
    saveChanges,
    offerId: params.id as string,
    markUnsaved,
    updatingRate,
  };
}
