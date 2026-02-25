"use client";

import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { useOfferDetail } from "./use-offer-detail";
import {
  OfferDetailHeader,
  OfferProductsTable,
  OfferDescriptionCard,
  OfferCustomerCard,
  OfferSummaryCard,
  OfferNotesCard,
  OfferMetadataCard,
} from "./components";
import { ArrowLeft } from "lucide-react";

export default function OfferDetailPage() {
  const router = useRouter();
  const {
    offer,
    loading,
    error,
    editedItems,
    totalDiscount,
    setTotalDiscount,
    status,
    setStatus,
    description,
    setDescription,
    saving,
    draggedIndex,
    hasUnsavedChanges,
    additionalItems,
    setAdditionalItems,
    notesText,
    setNotesText,
    editingOrderDiscount,
    setEditingOrderDiscount,
    editingAdditionalIndex,
    setEditingAdditionalIndex,
    markUnsaved,
    updatingRate,
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
    offerId,
  } = useOfferDetail();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="container mx-auto px-4 py-8">
          <div className="py-8 text-center text-muted-foreground">Načítání...</div>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Nav />
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-md bg-destructive/10 p-4 text-destructive">
            {error || "Nabídka nebyla nalezena"}
          </div>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/offers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na seznam
          </Button>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className="container mx-auto px-4 py-8">
        <OfferDetailHeader
          offerId={offer.simple_id}
          title={offer.title}
          status={status}
          onStatusChange={setStatus}
          saving={saving}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={saveChanges}
          onExportExcel={exportToExcel}
          onBack={() => router.push("/offers")}
          onAddProducts={() => router.push(`/products?offer=${offer.simple_id}`)}
        />

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <OfferProductsTable
              items={editedItems}
              currency={offer.currency}
              draggedIndex={draggedIndex}
              onQuantityChange={updateItemQuantity}
              onDiscountChange={updateItemDiscount}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            />
            <OfferDescriptionCard value={description} onChange={setDescription} />
          </div>

          <div className="space-y-6">
            <OfferCustomerCard customer={offer.customer} />
            <OfferSummaryCard
              additionalItems={additionalItems}
              onAdditionalItemsChange={setAdditionalItems}
              editingAdditionalIndex={editingAdditionalIndex}
              onEditingAdditionalIndexChange={setEditingAdditionalIndex}
              totalDiscount={totalDiscount}
              onTotalDiscountChange={setTotalDiscount}
              editingOrderDiscount={editingOrderDiscount}
              onEditingOrderDiscountChange={setEditingOrderDiscount}
              onUnsavedChange={markUnsaved}
              currency={offer.currency}
              tax={Number(offer.tax) || 0}
              itemsDiscount={totals.itemsDiscount}
              total={totals.total}
            />
            <OfferNotesCard value={notesText} onChange={setNotesText} />
            <OfferMetadataCard
              createdAt={offer.created_at}
              updatedAt={offer.updated_at}
              validUntil={offer.valid_until}
              exchangeRate={displayExchangeRate}
              updatingRate={updatingRate}
              onApplyTodaysRate={applyTodaysExchangeRate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
