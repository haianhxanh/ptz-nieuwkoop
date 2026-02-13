import { DataTypes, Model } from "sequelize";
import { db } from "../database_connection/db_connect";
import Customer from "./customer.model";

export type OFFER_STATUS = "draft" | "sent" | "accepted" | "rejected" | "expired";

export type OFFER = {
  id?: string;
  simple_id?: number;
  customer_id: string;
  title: string;
  description?: string;
  items?: any;
  subtotal: number;
  items_discount?: number;
  order_discount?: number;
  discount?: number;
  tax?: number;
  total: number;
  currency?: string;
  status: OFFER_STATUS;
  valid_until?: Date;
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
};

class Offer extends Model<OFFER> {}

Offer.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    simple_id: {
      type: DataTypes.INTEGER,
      unique: true,
      allowNull: true,
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Customers",
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    items: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    items_discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    order_discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    discount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    tax: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "CZK",
    },
    status: {
      type: DataTypes.ENUM("draft", "sent", "accepted", "rejected", "expired"),
      allowNull: false,
      defaultValue: "draft",
    },
    valid_until: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: db,
    tableName: "Offers",
    modelName: "Offer",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    hooks: {
      beforeCreate: async (offer: any) => {
        const maxOffer = await Offer.findOne({
          order: [["simple_id", "DESC"]],
          attributes: ["simple_id"],
        });
        offer.simple_id = maxOffer?.get("simple_id") ? (maxOffer.get("simple_id") as number) + 1 : 1;
      },
    },
  },
);

Offer.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
Customer.hasMany(Offer, { foreignKey: "customer_id", as: "offers" });

export default Offer;
