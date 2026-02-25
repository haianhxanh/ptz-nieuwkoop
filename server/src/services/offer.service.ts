import Offer from "../model/offer.model";
import Customer, { CUSTOMER } from "../model/customer.model";
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

  async createOffer(data: CreateOfferInput): Promise<Offer> {
    const customer = await this.findOrCreateCustomer(data.customer);
    const exchangeRate = data.exchange_rate ?? (await configService.getExchangeRate());
    const additionalItems = data.additional_items || [];
    const additionalTotal = this.sumAdditionalItems(additionalItems);
    const total = data.total + additionalTotal;

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
    });

    return (await Offer.findByPk(offer.get("id") as string, {
      include: [{ model: Customer, as: "customer" }],
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
      include: [{ model: Customer, as: "customer" }],
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });

    return { data: rows, total: count };
  }

  async getOfferById(id: string): Promise<Offer | null> {
    if (/^\d+$/.test(id)) {
      return await Offer.findOne({
        where: { simple_id: parseInt(id) },
        include: [{ model: Customer, as: "customer" }],
      });
    }

    return await Offer.findByPk(id, {
      include: [{ model: Customer, as: "customer" }],
    });
  }

  async updateOffer(id: string, data: UpdateOfferInput): Promise<Offer | null> {
    const offer = await this.findOffer(id);

    if (!offer) {
      return null;
    }

    const items = data.items || (offer.get("items") as any[]) || [];
    const additionalItems =
      data.additional_items !== undefined ? data.additional_items : (offer.get("additional_items") as { title: string; price: number }[]) || [];

    const itemsSubtotal = items.reduce((sum: number, item: any) => {
      return sum + item.unit_price * item.quantity;
    }, 0);

    const itemsDiscount = items.reduce((sum: number, item: any) => {
      return sum + (Number(item.discount) || 0);
    }, 0);

    const orderDiscount = data.discount !== undefined ? Number(data.discount) : Number(offer.get("order_discount")) || 0;

    const totalDiscount = itemsDiscount + orderDiscount;

    const tax = data.tax !== undefined ? Number(data.tax) : Number(offer.get("tax")) || 0;

    const additionalTotal = this.sumAdditionalItems(additionalItems);
    const total = itemsSubtotal - totalDiscount + tax + additionalTotal;

    const updatePayload: Record<string, unknown> = {
      customer_id: data.customer_id,
      title: data.title,
      description: data.description,
      items: data.items,
      additional_items: additionalItems,
      subtotal: Number(itemsSubtotal.toFixed(2)),
      items_discount: Number(itemsDiscount.toFixed(2)),
      order_discount: Number(orderDiscount.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      tax: tax,
      total: Number(total.toFixed(2)),
      status: data.status,
    };
    if (data.exchange_rate !== undefined) {
      updatePayload.exchange_rate = data.exchange_rate;
    }
    if (data.notes !== undefined) {
      updatePayload.notes = data.notes;
    }
    await offer.update(updatePayload);

    return await Offer.findByPk(offer.get("id") as string, {
      include: [{ model: Customer, as: "customer" }],
    });
  }

  async addItemsToOffer(id: string, data: AddItemsToOfferInput): Promise<Offer | null> {
    const offer = await this.findOffer(id);

    if (!offer) {
      return null;
    }

    const existingItems = (offer.get("items") as any[]) || [];

    const updatedItems = [...existingItems, ...data.items];

    const itemsSubtotal = updatedItems.reduce((sum, item) => {
      return sum + item.unit_price * item.quantity;
    }, 0);

    const itemsDiscount = updatedItems.reduce((sum, item) => {
      return sum + (Number(item.discount) || 0);
    }, 0);

    const orderDiscount = Number(offer.get("order_discount")) || 0;

    const totalDiscount = itemsDiscount + orderDiscount;

    const tax = Number(offer.get("tax")) || 0;

    const additionalItems = (offer.get("additional_items") as { title: string; price: number }[]) || [];
    const additionalTotal = this.sumAdditionalItems(additionalItems);
    const total = itemsSubtotal - totalDiscount + tax + additionalTotal;

    await offer.update({
      items: updatedItems,
      subtotal: Number(itemsSubtotal.toFixed(2)),
      items_discount: Number(itemsDiscount.toFixed(2)),
      order_discount: Number(orderDiscount.toFixed(2)),
      discount: Number(totalDiscount.toFixed(2)),
      total: Number(total.toFixed(2)),
    });

    return await Offer.findByPk(offer.get("id") as string, {
      include: [{ model: Customer, as: "customer" }],
    });
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
    });

    return customer;
  }
}

export const offersService = new OffersService();
