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
import { toast } from "sonner";

export default function OfferDetailPage() {
  const router = useRouter();
  const {
    offer,
    loading,
    error,
    editedGroups,
    sellMultiplier,
    setSellMultiplier,
    status,
    setStatus,
    description,
    setDescription,
    saving,
    dragState,
    hasUnsavedChanges,
    additionalItems,
    setAdditionalItems,
    notesText,
    setNotesText,
    editingAdditionalIndex,
    setEditingAdditionalIndex,
    markUnsaved,
    updatingRate,
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
          <div className="rounded-md bg-destructive/10 p-4 text-destructive">{error || "Nabídka nebyla nalezena"}</div>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/offers")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na seznam
          </Button>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  const handleAddSection = async (name: string) => {
    await addGroup(name);
  };

  const handleAddProductsToGroup = (groupId: string) => {
    router.push(`/products?offer=${offer.simple_id}&group=${groupId}`);
  };

  const handleExportPdf = async () => {
    try {
      const { downloadOfferPdf } = await import("./export-offer-pdf");
      await downloadOfferPdf(offer, editedGroups, additionalItems, totals, sellMultiplier, notesText, () => toast.success("PDF exportováno"));
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Chyba při generování PDF");
    }
  };

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
          onExportPdf={handleExportPdf}
          onBack={() => router.push("/offers")}
          onAddSection={handleAddSection}
        />

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <OfferProductsTable
              groups={editedGroups}
              currency={offer.currency}
              sellMultiplier={sellMultiplier}
              dragState={dragState}
              onQuantityChange={updateItemQuantity}
              onGroupDiscountChange={updateGroupDiscount}
              onGroupRename={renameGroup}
              onGroupRemove={removeGroup}
              onItemRemove={removeItemFromGroup}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onAddProductsToGroup={handleAddProductsToGroup}
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
              onUnsavedChange={markUnsaved}
              currency={offer.currency}
              tax={Number(offer.tax) || 0}
              groupsDiscount={totals.groupsDiscount}
              total={totals.total}
              totalSell={totals.totalSell}
              sellMultiplier={sellMultiplier}
              onSellMultiplierChange={setSellMultiplier}
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
