"use client";

import { useRouter } from "next/navigation";
import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import { useOfferDetail } from "./use-offer-detail";
import { useState } from "react";
import { offersApi, fakturoidApi } from "@/lib/api";
import {
  OfferDetailHeader,
  OfferProductsTable,
  OfferDescriptionCard,
  OfferCustomerCard,
  OfferSummaryCard,
  OfferNotesCard,
  OfferMetadataCard,
  OfferCompanyCard,
} from "./components";
import { ArrowLeft, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";

export default function OfferDetailPage() {
  const router = useRouter();
  const {
    offer,
    setOffer,
    loading,
    error,
    editedGroups,
    sellMultiplier,
    setSellMultiplier,
    status,
    setStatus,
    offerTitle,
    setOfferTitle,
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
    groupDragIndex,
    handleGroupDragStart,
    handleGroupDragOver,
    handleGroupDragEnd,
    totalRounded,
    setTotalRounded,
    companyProfile,
    setCompanyProfile,
    availableCompanies,
    allCustomers,
    selectedCustomerId,
    setSelectedCustomerId,
    calculateTotals,
    displayExchangeRate,
    applyTodaysExchangeRate,
    exportToExcel,
    saveChanges,
  } = useOfferDetail();

  const [creatingProforma, setCreatingProforma] = useState(false);

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

  const handleDuplicate = async () => {
    try {
      const result = await offersApi.duplicate(offer.simple_id.toString());
      toast.success("Nabídka duplikována");
      router.push(`/offers/${result.data.simple_id}`);
    } catch {
      toast.error("Nepodařilo se duplikovat nabídku");
    }
  };

  const handleDelete = async () => {
    try {
      await offersApi.delete(offer.simple_id.toString());
      toast.success("Nabídka smazána");
      router.push("/offers");
    } catch {
      toast.error("Nepodařilo se smazat nabídku");
    }
  };

  const handleAddProductsToGroup = (groupId: string) => {
    router.push(`/products?offer=${offer.simple_id}&group=${groupId}`);
  };

  const buildProformaPayload = () => {
    const customer = offer.customer;
    const multiplier = Number(sellMultiplier) || 1;

    const lineItems = editedGroups.flatMap((group) => {
      const discountType = group.discount_type || "fixed";
      const rawDiscount = Number(group.discount) || 0;

      const itemsWithVat = group.items.map((item) => {
        const vat = (item.vat_rate ?? 21) / 100;
        const priceWithVat = item.unit_price * multiplier * (1 + vat);
        return { ...item, priceWithVat, totalWithVat: priceWithVat * item.quantity };
      });

      const groupTotal = itemsWithVat.reduce((s, i) => s + i.totalWithVat, 0);
      const discountAmount = rawDiscount > 0 ? (discountType === "percent" ? (groupTotal * rawDiscount) / 100 : rawDiscount) : 0;
      const discountRatio = groupTotal > 0 && discountAmount > 0 ? 1 - discountAmount / groupTotal : 1;

      return itemsWithVat.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit_price: Math.round(item.priceWithVat * discountRatio * 100) / 100,
        vat_rate: item.vat_rate ?? 21,
      }));
    });

    const additionalLineItems = additionalItems
      .filter((a) => (Number(a.sell_price) || 0) > 0)
      .map((a) => ({
        name: a.title,
        quantity: 1,
        unit_price: Number(a.sell_price) || 0,
        vat_rate: 21,
      }));

    return {
      slug: process.env.NODE_ENV === "development" ? "upgrowthdev" : companyProfile?.fakturoid_slug || "",
      client_name: customer.company_name || customer.name,
      client_email: customer.email,
      client_phone: customer.phone,
      client_street: customer.address,
      client_city: customer.city,
      client_zip: customer.postal_code,
      client_ico: customer.company_ico,
      client_dic: customer.company_dic,
      items: [...lineItems, ...additionalLineItems],
    };
  };

  const saveProformaToOffer = async (result: { public_html_url: string; invoice_id: number }) => {
    await offersApi.update(offer.simple_id.toString(), {
      proforma_url: result.public_html_url,
      proforma_id: result.invoice_id,
    });
    setOffer((prev) => (prev ? { ...prev, proforma_url: result.public_html_url, proforma_id: result.invoice_id } : prev));
  };

  const handleCreateProforma = async (sendEmail = false) => {
    if (!offer) return;
    try {
      setCreatingProforma(true);
      const result = await fakturoidApi.createProforma({ ...buildProformaPayload(), send_email: sendEmail });
      await saveProformaToOffer(result);
      toast.success(sendEmail ? "Proforma vytvořena a odeslána" : "Proforma vytvořena");
    } catch (err: any) {
      console.error("Proforma creation error:", err);
      toast.error(err?.response?.data?.error || "Nepodařilo se vytvořit proformu");
    } finally {
      setCreatingProforma(false);
    }
  };

  const handleUpdateProforma = async (sendEmail = false) => {
    if (!offer || !offer.proforma_id) return;
    try {
      setCreatingProforma(true);
      const result = await fakturoidApi.updateProforma(offer.proforma_id, { ...buildProformaPayload(), send_email: sendEmail });
      await saveProformaToOffer(result);
      toast.success(sendEmail ? "Proforma aktualizována a odeslána" : "Proforma aktualizována");
    } catch (err: any) {
      console.error("Proforma update error:", err);
      toast.error(err?.response?.data?.error || "Nepodařilo se aktualizovat proformu");
    } finally {
      setCreatingProforma(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      const { downloadOfferPdf } = await import("./export-offer-pdf");
      await downloadOfferPdf(offer, editedGroups, additionalItems, totals, sellMultiplier, notesText, totalRounded, () => toast.success("PDF exportováno"));
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Chyba při generování PDF");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav />
      <div className={`container mx-auto px-4 py-8 ${hasUnsavedChanges ? "pb-24" : ""}`}>
        <OfferDetailHeader
          offerId={offer.simple_id}
          title={offerTitle}
          onTitleChange={setOfferTitle}
          status={status}
          onStatusChange={setStatus}
          saving={saving}
          hasUnsavedChanges={hasUnsavedChanges}
          onSave={saveChanges}
          onExportExcel={exportToExcel}
          onExportPdf={handleExportPdf}
          onBack={() => router.push("/offers")}
          onDiscard={() => loadOffer(offer.simple_id.toString())}
          onAddSection={handleAddSection}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          proformaUrl={offer.proforma_url}
          proformaId={offer.proforma_id}
          fakturoidSlug={process.env.NODE_ENV === "development" ? "upgrowthdev" : (companyProfile?.fakturoid_slug || "")}
          creatingProforma={creatingProforma}
          onCreateProforma={handleCreateProforma}
          onUpdateProforma={handleUpdateProforma}
        />

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-6 md:col-span-2">
            <OfferProductsTable
              groups={editedGroups}
              currency={offer.currency}
              sellMultiplier={sellMultiplier}
              dragState={dragState}
              groupDragIndex={groupDragIndex}
              onQuantityChange={updateItemQuantity}
              onGroupDiscountChange={updateGroupDiscount}
              onGroupRename={renameGroup}
              onGroupRemove={removeGroup}
              onItemRemove={removeItemFromGroup}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onGroupDragStart={handleGroupDragStart}
              onGroupDragOver={handleGroupDragOver}
              onGroupDragEnd={handleGroupDragEnd}
              onAddProductsToGroup={handleAddProductsToGroup}
            />
            <OfferDescriptionCard value={description} onChange={setDescription} />
          </div>

          <div className="space-y-6">
            <OfferCompanyCard companyProfile={companyProfile} availableCompanies={availableCompanies} onChange={setCompanyProfile} />
            <OfferCustomerCard
              customer={offer.customer}
              allCustomers={allCustomers}
              selectedCustomerId={selectedCustomerId}
              onCustomerChange={setSelectedCustomerId}
            />
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
              totalSellExclVat={totals.totalSellExclVat}
              totalRounded={totalRounded}
              onTotalRoundedChange={setTotalRounded}
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

      {hasUnsavedChanges && (
        <div className="fixed bottom-0 inset-x-0 z-50 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
          <div className="container mx-auto flex items-center justify-end gap-3 px-4 py-3">
            <span className="mr-auto text-sm text-amber-600 font-medium">Máte neuložené změny</span>
            <Button
              variant="ghost"
              onClick={() => loadOffer(offer.simple_id.toString())}
              disabled={saving}
              className="text-muted-foreground hover:text-foreground"
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Zrušit změny
            </Button>
            <Button onClick={saveChanges} disabled={saving} className="bg-amber-500 text-white hover:bg-amber-600">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Ukládání..." : "Uložit změny"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
