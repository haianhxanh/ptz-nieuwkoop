import { DataTypes, Model } from "sequelize";
import { DMP_DB_CONNECTION } from "../database_connection/dmp_db_connect";
import DmpClient from "./dmp_client.model";
import DmpUser from "./dmp_user.model";

export type DMP_OFFER_STATUS = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type DmpAdditionalItem = { title: string; cost: number; price?: number };

export type DMP_OFFER = {
  id?: string;
  simpleId?: number | null;
  clientId: string;
  title: string;
  description?: string | null;
  items?: any;
  additionalItems?: DmpAdditionalItem[] | null;
  subtotal: number;
  itemsDiscount?: number | null;
  orderDiscount?: number | null;
  discount?: number | null;
  tax?: number | null;
  total: number;
  totalRounded?: number | null;
  currency?: string;
  exchangeRate?: number;
  status: DMP_OFFER_STATUS;
  validUntil?: Date | null;
  sellMultiplier?: number | null;
  notes?: string | null;
  companyProfile?: any;
  proformaUrl?: string | null;
  proformaId?: number | null;
  userId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

class DmpOffer extends Model<DMP_OFFER> {}

DmpOffer.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    simpleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
    },
    clientId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: "Client",
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
    additionalItems: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    itemsDiscount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    orderDiscount: {
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
    totalRounded: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "CZK",
    },
    exchangeRate: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 25.0,
    },
    status: {
      type: DataTypes.ENUM("DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sellMultiplier: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
      defaultValue: 1.0,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    companyProfile: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    proformaUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    proformaId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: "User",
        key: "id",
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: DMP_DB_CONNECTION,
    tableName: "Offer",
    modelName: "DmpOffer",
    timestamps: true,
    hooks: {
      beforeCreate: async (offer: any) => {
        if (offer.simpleId) return;
        const maxOffer = await DmpOffer.findOne({
          order: [["simpleId", "DESC"]],
          attributes: ["simpleId"],
        });
        offer.simpleId = maxOffer?.get("simpleId") ? (maxOffer.get("simpleId") as number) + 1 : 1;
      },
    },
  },
);

DmpOffer.belongsTo(DmpClient, { foreignKey: "clientId", as: "client" });
DmpClient.hasMany(DmpOffer, { foreignKey: "clientId", as: "offers" });

DmpOffer.belongsTo(DmpUser, { foreignKey: "userId", as: "user" });
DmpUser.hasMany(DmpOffer, { foreignKey: "userId", as: "offers" });

export default DmpOffer;
