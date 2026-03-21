import DmpOffer from "../model/dmp_offer.model";
import DmpClient, { DMP_CLIENT } from "../model/dmp_client.model";
import DmpUser from "../model/dmp_user.model";
import { configService } from "./config.service";
import { CreateOfferInput, UpdateOfferInput, ListOffersQuery, AddItemsToOfferInput } from "../schemas/offer.schema";

export class OffersService {
  private toApiClient(client: any) {
    if (!client) return null;
    const plain = typeof client.get === "function" ? client.get({ plain: true }) : client;
    return {
      id: plain.id,
      email: plain.email,
      name: plain.name,
      phone: plain.phone,
      address: plain.address,
      city: plain.city,
      postalCode: plain.postalCode ?? null,
      country: plain.country,
      notes: plain.notes,
      companyName: plain.companyName ?? null,
      companyIco: plain.companyIco ?? null,
      companyDic: plain.companyDic ?? null,
      createdAt: plain.createdAt ?? null,
      updatedAt: plain.updatedAt ?? null,
    };
  }

  private toApiUser(user: any) {
    if (!user) return null;
    const plain = typeof user.get === "function" ? user.get({ plain: true }) : user;
    return {
      id: plain.id,
      email: plain.email,
      name: plain.name,
      createdAt: plain.createdAt ?? null,
      updatedAt: plain.updatedAt ?? null,
    };
  }

  private getUnitPrice(item: any): number {
    return Number(item?.unitPrice ?? item?.unit_price ?? 0);
  }

  private getVatRate(item: any): number {
    return Number(item?.vatRate ?? item?.vat_rate ?? 21);
  }

  private getUnitPriceEur(item: any): number | null {
    const value = item?.unitPriceEur ?? item?.unit_price_eur;
    return value == null ? null : Number(value);
  }

  private getDiscountType(group: any): "fixed" | "percent" {
    return (group?.discountType ?? group?.discount_type ?? "fixed") as "fixed" | "percent";
  }

  private normalizeAdditionalItem(item: any) {
    return {
      ...item,
      sellPrice: item?.sellPrice ?? item?.sell_price ?? null,
    };
  }

  private normalizeLineItem(item: any) {
    return {
      ...item,
      productId: item?.productId ?? item?.product_id,
      unitPrice: this.getUnitPrice(item),
      unitPriceEur: this.getUnitPriceEur(item),
      vatRate: this.getVatRate(item),
      dimensions: item?.dimensions
        ? {
            ...item.dimensions,
            potSize: item.dimensions.potSize ?? item.dimensions.pot_size,
          }
        : item?.dimensions,
    };
  }

  private normalizeItemGroup(group: any) {
    return {
      ...group,
      discountType: this.getDiscountType(group),
      items: Array.isArray(group?.items) ? group.items.map((item: any) => this.normalizeLineItem(item)) : [],
    };
  }

  private toApiOffer(offer: any) {
    if (!offer) return null;
    const plain = typeof offer.get === "function" ? offer.get({ plain: true }) : offer;
    return {
      id: plain.id,
      simpleId: plain.simpleId ?? null,
      clientId: plain.clientId,
      client: this.toApiClient(plain.client),
      title: plain.title,
      description: plain.description,
      items: (plain.items ?? []).map((group: any) => this.normalizeItemGroup(group)),
      additionalItems: (plain.additionalItems ?? []).map((item: any) => this.normalizeAdditionalItem(item)),
      subtotal: Number(plain.subtotal ?? 0),
      itemsDiscount: plain.itemsDiscount == null ? null : Number(plain.itemsDiscount),
      orderDiscount: plain.orderDiscount == null ? null : Number(plain.orderDiscount),
      discount: plain.discount == null ? null : Number(plain.discount),
      tax: plain.tax == null ? null : Number(plain.tax),
      total: Number(plain.total ?? 0),
      totalSell: plain.totalSell == null ? null : Number(plain.totalSell),
      totalRounded: plain.totalRounded == null ? null : Number(plain.totalRounded),
      currency: plain.currency,
      exchangeRate: plain.exchangeRate == null ? null : Number(plain.exchangeRate),
      status: String(plain.status || "DRAFT").toLowerCase(),
      validUntil: plain.validUntil ?? null,
      sellMultiplier: plain.sellMultiplier == null ? null : Number(plain.sellMultiplier),
      notes: plain.notes ?? null,
      companyProfile: plain.companyProfile
        ? {
            companyName: plain.companyProfile.companyName ?? plain.companyProfile.company_name ?? "",
            companyIco: plain.companyProfile.companyIco ?? plain.companyProfile.company_ico ?? "",
            companyDic: plain.companyProfile.companyDic ?? plain.companyProfile.company_dic ?? "",
            logoUrl: plain.companyProfile.logoUrl ?? plain.companyProfile.logo_url,
            fakturoidSlug: plain.companyProfile.fakturoidSlug ?? plain.companyProfile.fakturoid_slug,
          }
        : null,
      proformaUrl: plain.proformaUrl ?? null,
      proformaId: plain.proformaId ?? null,
      userId: plain.userId ?? null,
      user: this.toApiUser(plain.user),
      createdAt: plain.createdAt ?? null,
      updatedAt: plain.updatedAt ?? null,
    };
  }

  private async findOffer(id: string): Promise<DmpOffer | null> {
    if (/^\d+$/.test(id)) {
      return await DmpOffer.findOne({
        where: { simpleId: parseInt(id) },
      });
    }

    return await DmpOffer.findByPk(id);
  }

  async findOrCreateClient(clientData: any): Promise<DmpClient> {
    const normalizedEmail = clientData.email?.trim().toLowerCase();
    const where = normalizedEmail ? { email: normalizedEmail } : { name: clientData.name };
    const defaults: Partial<DMP_CLIENT> = {
      name: clientData.name,
      email: normalizedEmail,
      phone: clientData.phone,
      address: clientData.address,
      city: clientData.city,
      postalCode: clientData.postalCode,
      country: clientData.country,
      notes: clientData.notes,
      companyName: clientData.companyName,
      companyIco: clientData.companyIco,
      companyDic: clientData.companyDic,
    };
    const [client] = await DmpClient.findOrCreate({
      where,
      defaults,
    } as any);

    if (client) {
      await client.update(defaults);
    }

    return client;
  }

  async createClient(data: any): Promise<any> {
    const client = await this.findOrCreateClient(data);
    return this.toApiClient(client);
  }

  private sumAdditionalItems(additionalItems: { title: string; price: number }[] | undefined): number {
    if (!Array.isArray(additionalItems)) return 0;
    return additionalItems.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  }

  async findUserByEmail(email: string): Promise<DmpUser | null> {
    return await DmpUser.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  async createOffer(data: CreateOfferInput, userEmail?: string): Promise<any> {
    const client = await this.findOrCreateClient(data.client);
    const exchangeRate = data.exchangeRate ?? (await configService.getExchangeRate());
    const additionalItems = (data.additionalItems || []).map((item: any) => this.normalizeAdditionalItem(item));
    const groups = (data.items || []).map((group: any) => this.normalizeItemGroup(group));
    const additionalTotal = this.sumAdditionalItems(additionalItems);
    const total = data.total + additionalTotal;

    let userId: string | undefined;
    if (userEmail) {
      const user = await this.findUserByEmail(userEmail);
      userId = user?.get("id") as string | undefined;
    }

    const offer = await DmpOffer.create({
      clientId: client.get("id") as string,
      title: data.title,
      description: data.description,
      items: groups,
      additionalItems,
      subtotal: data.subtotal,
      discount: data.discount || 0,
      tax: data.tax || 0,
      total,
      currency: data.currency || "EUR",
      exchangeRate,
      status: (data.status || "draft").toUpperCase() as any,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      notes: data.notes,
      sellMultiplier: data.sellMultiplier,
      userId,
    });

    const created = await DmpOffer.findByPk(offer.get("id") as string, {
      include: [
        { model: DmpClient, as: "client" },
        { model: DmpUser, as: "user" },
      ],
    });
    return this.toApiOffer(created);
  }

  async listOffers(query: ListOffersQuery): Promise<{ data: any[]; total: number }> {
    const where: any = {};

    if (query.status) {
      where.status = query.status.toUpperCase();
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const { rows, count } = await DmpOffer.findAndCountAll({
      where,
      include: [
        { model: DmpClient, as: "client" },
        { model: DmpUser, as: "user" },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return { data: rows.map((row) => this.toApiOffer(row)), total: count };
  }

  async getOfferById(id: string): Promise<any | null> {
    const include = [
      { model: DmpClient, as: "client" },
      { model: DmpUser, as: "user" },
    ];
    if (/^\d+$/.test(id)) {
      return this.toApiOffer(await DmpOffer.findOne({ where: { simpleId: parseInt(id) }, include }));
    }
    return this.toApiOffer(await DmpOffer.findByPk(id, { include }));
  }

  async updateOffer(id: string, data: UpdateOfferInput, userEmail?: string): Promise<any | null> {
    const offer = await this.findOffer(id);

    if (!offer) {
      return null;
    }

    if (userEmail && !offer.get("userId")) {
      const user = await this.findUserByEmail(userEmail);
      if (user) {
        await offer.update({ userId: user.get("id") as string });
      }
    }

    const groups = (data.items || (offer.get("items") as any[]) || []).map((group: any) => this.normalizeItemGroup(group));
    const additionalItems =
      (data.additionalItems !== undefined ? data.additionalItems : (offer.get("additionalItems") as { title: string; price: number }[]) || []).map((item: any) =>
        this.normalizeAdditionalItem(item),
      );

    const allItems = groups.flatMap((g: any) => (Array.isArray(g.items) ? g.items : []));

    const itemsSubtotal = allItems.reduce((sum: number, item: any) => {
      return sum + this.getUnitPrice(item) * item.quantity;
    }, 0);

    const sellMultiplier = data.sellMultiplier !== undefined ? Number(data.sellMultiplier) : Number(offer.get("sellMultiplier")) || 1;

    const groupsDiscount = groups.reduce((sum: number, g: any) => {
      const raw = Number(g.discount) || 0;
      if (this.getDiscountType(g) === "percent") {
        const groupSell = (g.items || []).reduce((s: number, item: any) => {
          const vat = this.getVatRate(item) / 100;
          return s + this.getUnitPrice(item) * (1 + vat) * sellMultiplier * item.quantity;
        }, 0);
        return sum + (groupSell * raw) / 100;
      }
      return sum + raw;
    }, 0);

    const orderDiscount = data.discount !== undefined ? Number(data.discount) : Number(offer.get("orderDiscount")) || 0;

    const totalDiscount = groupsDiscount + orderDiscount;

    const tax = data.tax !== undefined ? Number(data.tax) : Number(offer.get("tax")) || 0;

    const additionalTotal = this.sumAdditionalItems(additionalItems);
    const total = itemsSubtotal - totalDiscount + tax + additionalTotal;
    const additionalSellTotal = additionalItems.reduce((sum: number, a: any) => sum + (Number(a.sellPrice) || 0), 0);
    const itemsSellSubtotal = allItems.reduce((sum: number, item: any) => {
      const vat = this.getVatRate(item) / 100;
      return sum + this.getUnitPrice(item) * (1 + vat) * sellMultiplier * item.quantity;
    }, 0);
    const totalSell = itemsSellSubtotal - totalDiscount + additionalSellTotal;

    const updatePayload: Record<string, unknown> = {
      clientId: data.clientId,
      title: data.title,
      description: data.description,
      items: groups,
      additionalItems,
      subtotal: Number(itemsSubtotal.toFixed(2)),
      itemsDiscount: Number(groupsDiscount.toFixed(2)),
      orderDiscount: Number(orderDiscount.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      tax: tax,
      total: Number(total.toFixed(2)),
      totalSell: Number(totalSell.toFixed(2)),
      status: data.status ? data.status.toUpperCase() : undefined,
    };
    if (data.exchangeRate !== undefined) {
      updatePayload.exchangeRate = data.exchangeRate;
    }
    if (data.notes !== undefined) {
      updatePayload.notes = data.notes;
    }
    if (data.sellMultiplier !== undefined) {
      updatePayload.sellMultiplier = data.sellMultiplier;
    }
    if (data.totalRounded !== undefined) {
      updatePayload.totalRounded = data.totalRounded ?? Math.round(totalSell);
    }
    if (data.companyProfile !== undefined) {
      updatePayload.companyProfile = data.companyProfile;
    }
    if (data.proformaUrl !== undefined) {
      updatePayload.proformaUrl = data.proformaUrl;
    }
    if (data.proformaId !== undefined) {
      updatePayload.proformaId = data.proformaId;
    }
    await offer.update(updatePayload);

    const updated = await DmpOffer.findByPk(offer.get("id") as string, {
      include: [
        { model: DmpClient, as: "client" },
        { model: DmpUser, as: "user" },
      ],
    });
    return this.toApiOffer(updated);
  }

  async addItemsToOffer(id: string, data: AddItemsToOfferInput): Promise<any | null> {
    const offer = await this.findOffer(id);

    if (!offer) {
      return null;
    }

    const existingGroups = ((offer.get("items") as any[]) || []).map((group: any) => this.normalizeItemGroup(group));

    let updatedGroups: any[];
    if (data.groupId) {
      const groupIndex = existingGroups.findIndex((g: any) => g.id === data.groupId);
      if (groupIndex >= 0) {
        updatedGroups = existingGroups.map((g: any, i: number) =>
          i === groupIndex ? { ...g, items: [...(g.items || []), ...data.items.map((item: any) => this.normalizeLineItem(item))] } : g,
        );
      } else {
        updatedGroups = existingGroups;
      }
    } else {
      updatedGroups = [
        ...existingGroups,
        {
          id: crypto.randomUUID(),
          name: "Produkty",
          discount: 0,
          discountType: "fixed",
          items: data.items.map((item: any) => this.normalizeLineItem(item)),
        },
      ];
    }

    const allItems = updatedGroups.flatMap((g: any) => (Array.isArray(g.items) ? g.items : []));
    const itemsSubtotal = allItems.reduce((sum: number, item: any) => sum + this.getUnitPrice(item) * item.quantity, 0);
    const sellMultiplier = Number(offer.get("sellMultiplier")) || 1;
    const groupsDiscount = updatedGroups.reduce((sum: number, g: any) => {
      const raw = Number(g.discount) || 0;
      if (this.getDiscountType(g) === "percent") {
        const groupSell = (g.items || []).reduce((s: number, item: any) => {
          const vat = this.getVatRate(item) / 100;
          return s + this.getUnitPrice(item) * (1 + vat) * sellMultiplier * item.quantity;
        }, 0);
        return sum + (groupSell * raw) / 100;
      }
      return sum + raw;
    }, 0);
    const orderDiscount = Number(offer.get("orderDiscount")) || 0;
    const totalDiscount = groupsDiscount + orderDiscount;
    const tax = Number(offer.get("tax")) || 0;
    const additionalItems = ((offer.get("additionalItems") as { title: string; price: number; sellPrice?: number }[]) || []).map((item: any) =>
      this.normalizeAdditionalItem(item),
    );
    const additionalTotal = this.sumAdditionalItems(additionalItems);
    const total = itemsSubtotal - totalDiscount + tax + additionalTotal;
    const additionalSellTotal = additionalItems.reduce((sum: number, a: any) => sum + (Number(a.sellPrice) || 0), 0);
    const itemsSellSubtotal = allItems.reduce((sum: number, item: any) => {
      const vat = this.getVatRate(item) / 100;
      return sum + this.getUnitPrice(item) * (1 + vat) * sellMultiplier * item.quantity;
    }, 0);
    const totalSell = itemsSellSubtotal - totalDiscount + additionalSellTotal;

    await offer.update({
      items: updatedGroups,
      subtotal: Number(itemsSubtotal.toFixed(2)),
      itemsDiscount: Number(groupsDiscount.toFixed(2)),
      orderDiscount: Number(orderDiscount.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      total: Number(total.toFixed(2)),
      totalSell: Number(totalSell.toFixed(2)),
      totalRounded: null as any,
    });

    const updated = await DmpOffer.findByPk(offer.get("id") as string, {
      include: [
        { model: DmpClient, as: "client" },
        { model: DmpUser, as: "user" },
      ],
    });
    return this.toApiOffer(updated);
  }

  async duplicateOffer(id: string): Promise<any> {
    const original = await this.findOffer(id);
    if (!original) throw new Error("Offer not found");

    const d = original.get({ plain: true }) as any;
    const duplicated = await DmpOffer.create({
      clientId: d.clientId,
      title: `Kopie – ${d.title}`,
      description: d.description,
      items: d.items,
      additionalItems: d.additionalItems,
      subtotal: d.subtotal,
      total: d.total,
      totalSell: d.totalSell,
      currency: d.currency,
      exchangeRate: d.exchangeRate,
      status: "DRAFT",
      notes: d.notes,
      sellMultiplier: d.sellMultiplier,
      userId: d.userId,
    } as any);
    const hydrated = await DmpOffer.findByPk(duplicated.get("id") as string, {
      include: [
        { model: DmpClient, as: "client" },
        { model: DmpUser, as: "user" },
      ],
    });
    return this.toApiOffer(hydrated);
  }

  async deleteOffer(id: string): Promise<boolean> {
    const offer = await this.findOffer(id);

    if (!offer) {
      return false;
    }

    await offer.destroy();
    return true;
  }

  async listClients(): Promise<any[]> {
    const clients = await DmpClient.findAll({
      order: [["createdAt", "DESC"]],
    });
    return clients.map((client) => this.toApiClient(client));
  }

  async updateClient(id: string, data: Partial<any>): Promise<any | null> {
    const client = await DmpClient.findByPk(id);

    if (!client) {
      return null;
    }

    await client.update({
      name: data.name,
      email: typeof data.email === "string" ? data.email.trim().toLowerCase() : data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      country: data.country,
      notes: data.notes,
      companyName: data.companyName,
      companyIco: data.companyIco,
      companyDic: data.companyDic,
    });

    return this.toApiClient(client);
  }
}

export const offersService = new OffersService();
