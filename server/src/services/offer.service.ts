import Offer from "../model/offer.model";
import Customer, { CUSTOMER } from "../model/customer.model";
import User from "../model/user.model";
import { configService } from "./config.service";
import { CreateOfferInput, UpdateOfferInput, ListOffersQuery, AddItemsToOfferInput } from "../schemas/offer.schema";

export class OffersService {
  private async findOffer(id: string): Promise<Offer | null> {
    if (/^\d+$/.test(id)) {
      return await Offer.findOne({
        where: { simple_id: parseInt(id) },
      });
    }

    return await Offer.findByPk(id);
  }

  async findOrCreateCustomer(customerData: CUSTOMER): Promise<Customer> {
    const [customer] = await Customer.findOrCreate({
      where: { email: customerData.email },
      defaults: customerData,
    });

    if (customer) {
      await customer.update(customerData);
    }

    return customer;
  }

  private sumAdditionalItems(additionalItems: { title: string; price: number }[] | undefined): number {
    if (!Array.isArray(additionalItems)) return 0;
    return additionalItems.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
  }

  async findOrCreateUser(email: string): Promise<User> {
    const [user] = await User.findOrCreate({ where: { email }, defaults: { email } });
    return user;
  }

  async createOffer(data: CreateOfferInput, userEmail?: string): Promise<Offer> {
    const customer = await this.findOrCreateCustomer(data.customer);
    const exchangeRate = data.exchange_rate ?? (await configService.getExchangeRate());
    const additionalItems = data.additional_items || [];
    const additionalTotal = this.sumAdditionalItems(additionalItems);
    const total = data.total + additionalTotal;

    let userId: string | undefined;
    if (userEmail) {
      const user = await this.findOrCreateUser(userEmail);
      userId = user.get("id") as string;
    }

    const offer = await Offer.create({
      customer_id: customer.get("id") as string,
      title: data.title,
      description: data.description,
      items: data.items || [],
      additional_items: additionalItems,
      subtotal: data.subtotal,
      discount: data.discount || 0,
      tax: data.tax || 0,
      total,
      currency: data.currency || "EUR",
      exchange_rate: exchangeRate,
      status: data.status || "draft",
      valid_until: data.valid_until ? new Date(data.valid_until) : undefined,
      notes: data.notes,
      user_id: userId,
    });

    return (await Offer.findByPk(offer.get("id") as string, {
      include: [
        { model: Customer, as: "customer" },
        { model: User, as: "user" },
      ],
    })) as Offer;
  }

  async listOffers(query: ListOffersQuery): Promise<{ data: Offer[]; total: number }> {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.customer_id) {
      where.customer_id = query.customer_id;
    }

    const limit = query.limit || 50;
    const offset = query.offset || 0;

    const { rows, count } = await Offer.findAndCountAll({
      where,
      include: [
        { model: Customer, as: "customer" },
        { model: User, as: "user" },
      ],
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    return { data: rows, total: count };
  }

  async getOfferById(id: string): Promise<Offer | null> {
    const include = [
      { model: Customer, as: "customer" },
      { model: User, as: "user" },
    ];
    if (/^\d+$/.test(id)) {
      return await Offer.findOne({ where: { simple_id: parseInt(id) }, include });
    }
    return await Offer.findByPk(id, { include });
  }

  async updateOffer(id: string, data: UpdateOfferInput, userEmail?: string): Promise<Offer | null> {
    const offer = await this.findOffer(id);

    if (!offer) {
      return null;
    }

    if (userEmail && !offer.get("user_id")) {
      const user = await this.findOrCreateUser(userEmail);
      await offer.update({ user_id: user.get("id") as string });
    }

    const groups = data.items || (offer.get("items") as any[]) || [];
    const additionalItems =
      data.additional_items !== undefined ? data.additional_items : (offer.get("additional_items") as { title: string; price: number }[]) || [];

    const allItems = groups.flatMap((g: any) => (Array.isArray(g.items) ? g.items : []));

    const itemsSubtotal = allItems.reduce((sum: number, item: any) => {
      return sum + item.unit_price * item.quantity;
    }, 0);

    const sellMultiplier = data.sell_multiplier !== undefined ? Number(data.sell_multiplier) : Number(offer.get("sell_multiplier")) || 1;

    const groupsDiscount = groups.reduce((sum: number, g: any) => {
      const raw = Number(g.discount) || 0;
      if (g.discount_type === "percent") {
        const groupSell = (g.items || []).reduce((s: number, item: any) => {
          const vat = (item.vat_rate ?? 21) / 100;
          return s + item.unit_price * (1 + vat) * sellMultiplier * item.quantity;
        }, 0);
        return sum + (groupSell * raw) / 100;
      }
      return sum + raw;
    }, 0);

    const orderDiscount = data.discount !== undefined ? Number(data.discount) : Number(offer.get("order_discount")) || 0;

    const totalDiscount = groupsDiscount + orderDiscount;

    const tax = data.tax !== undefined ? Number(data.tax) : Number(offer.get("tax")) || 0;

    const additionalTotal = this.sumAdditionalItems(additionalItems);
    const total = itemsSubtotal - totalDiscount + tax + additionalTotal;
    const additionalSellTotal = additionalItems.reduce((sum: number, a: any) => sum + (Number(a.sell_price) || 0), 0);
    const itemsSellSubtotal = allItems.reduce((sum: number, item: any) => {
      const vat = (item.vat_rate ?? 21) / 100;
      return sum + item.unit_price * (1 + vat) * sellMultiplier * item.quantity;
    }, 0);
    const totalSell = itemsSellSubtotal - totalDiscount + additionalSellTotal;

    const updatePayload: Record<string, unknown> = {
      customer_id: data.customer_id,
      title: data.title,
      description: data.description,
      items: data.items,
      additional_items: additionalItems,
      subtotal: Number(itemsSubtotal.toFixed(2)),
      items_discount: Number(groupsDiscount.toFixed(2)),
      order_discount: Number(orderDiscount.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      tax: tax,
      total: Number(total.toFixed(2)),
      total_sell: Number(totalSell.toFixed(2)),
      status: data.status,
    };
    if (data.exchange_rate !== undefined) {
      updatePayload.exchange_rate = data.exchange_rate;
    }
    if (data.notes !== undefined) {
      updatePayload.notes = data.notes;
    }
    if (data.sell_multiplier !== undefined) {
      updatePayload.sell_multiplier = data.sell_multiplier;
    }
    if (data.total_rounded !== undefined) {
      updatePayload.total_rounded = data.total_rounded ?? Math.round(totalSell);
    }
    if (data.company_profile !== undefined) {
      updatePayload.company_profile = data.company_profile;
    }
    if (data.proforma_url !== undefined) {
      updatePayload.proforma_url = data.proforma_url;
    }
    if (data.proforma_id !== undefined) {
      updatePayload.proforma_id = data.proforma_id;
    }
    await offer.update(updatePayload);

    return await Offer.findByPk(offer.get("id") as string, {
      include: [
        { model: Customer, as: "customer" },
        { model: User, as: "user" },
      ],
    });
  }

  async addItemsToOffer(id: string, data: AddItemsToOfferInput): Promise<Offer | null> {
    const offer = await this.findOffer(id);

    if (!offer) {
      return null;
    }

    const existingGroups = (offer.get("items") as any[]) || [];

    let updatedGroups: any[];
    if (data.group_id) {
      const groupIndex = existingGroups.findIndex((g: any) => g.id === data.group_id);
      if (groupIndex >= 0) {
        updatedGroups = existingGroups.map((g: any, i: number) => (i === groupIndex ? { ...g, items: [...(g.items || []), ...data.items] } : g));
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
          items: data.items,
        },
      ];
    }

    const allItems = updatedGroups.flatMap((g: any) => (Array.isArray(g.items) ? g.items : []));
    const itemsSubtotal = allItems.reduce((sum: number, item: any) => sum + item.unit_price * item.quantity, 0);
    const sellMultiplier = Number(offer.get("sell_multiplier")) || 1;
    const groupsDiscount = updatedGroups.reduce((sum: number, g: any) => {
      const raw = Number(g.discount) || 0;
      if (g.discount_type === "percent") {
        const groupSell = (g.items || []).reduce((s: number, item: any) => {
          const vat = (item.vat_rate ?? 21) / 100;
          return s + item.unit_price * (1 + vat) * sellMultiplier * item.quantity;
        }, 0);
        return sum + (groupSell * raw) / 100;
      }
      return sum + raw;
    }, 0);
    const orderDiscount = Number(offer.get("order_discount")) || 0;
    const totalDiscount = groupsDiscount + orderDiscount;
    const tax = Number(offer.get("tax")) || 0;
    const additionalItems = (offer.get("additional_items") as { title: string; price: number; sell_price?: number }[]) || [];
    const additionalTotal = this.sumAdditionalItems(additionalItems);
    const total = itemsSubtotal - totalDiscount + tax + additionalTotal;
    const additionalSellTotal = additionalItems.reduce((sum: number, a: any) => sum + (Number(a.sell_price) || 0), 0);
    const itemsSellSubtotal = allItems.reduce((sum: number, item: any) => {
      const vat = (item.vat_rate ?? 21) / 100;
      return sum + item.unit_price * (1 + vat) * sellMultiplier * item.quantity;
    }, 0);
    const totalSell = itemsSellSubtotal - totalDiscount + additionalSellTotal;

    await offer.update({
      items: updatedGroups,
      subtotal: Number(itemsSubtotal.toFixed(2)),
      items_discount: Number(groupsDiscount.toFixed(2)),
      order_discount: Number(orderDiscount.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      total: Number(total.toFixed(2)),
      total_sell: Number(totalSell.toFixed(2)),
      total_rounded: null as any,
    });

    return await Offer.findByPk(offer.get("id") as string, {
      include: [
        { model: Customer, as: "customer" },
        { model: User, as: "user" },
      ],
    });
  }

  async duplicateOffer(id: string): Promise<Offer> {
    const original = await this.findOffer(id);
    if (!original) throw new Error("Offer not found");

    const d = original.get({ plain: true }) as any;
    return await Offer.create({
      customer_id: d.customer_id,
      title: `Kopie – ${d.title}`,
      description: d.description,
      items: d.items,
      additional_items: d.additional_items,
      subtotal: d.subtotal,
      total: d.total,
      total_sell: d.total_sell,
      currency: d.currency,
      exchange_rate: d.exchange_rate,
      status: "draft",
      notes: d.notes,
      sell_multiplier: d.sell_multiplier,
      user_id: d.user_id,
    } as any);
  }

  async deleteOffer(id: string): Promise<boolean> {
    const offer = await this.findOffer(id);

    if (!offer) {
      return false;
    }

    await offer.destroy();
    return true;
  }

  async listCustomers(): Promise<Customer[]> {
    return await Customer.findAll({
      order: [["created_at", "DESC"]],
    });
  }

  async updateCustomer(id: string, data: Partial<any>): Promise<Customer | null> {
    const customer = await Customer.findByPk(id);

    if (!customer) {
      return null;
    }

    await customer.update({
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      city: data.city,
      postal_code: data.postal_code,
      country: data.country,
      notes: data.notes,
      company_name: data.company_name,
      company_ico: data.company_ico,
      company_dic: data.company_dic,
    });

    return customer;
  }
}

export const offersService = new OffersService();
