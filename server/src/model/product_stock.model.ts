import { DataTypes, Model } from "sequelize";
import { db } from "../database_connection/db_connect";

export type PRODUCT_STOCK = {
  itemcode: string;
  stock_available: number;
  first_available?: Date | null;
  sysmodified?: Date | null;
  updated_at?: Date;
};

class ProductStock extends Model<PRODUCT_STOCK> {}

ProductStock.init(
  {
    itemcode: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    stock_available: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    first_available: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sysmodified: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: db,
    tableName: "ProductStock",
    modelName: "ProductStock",
    timestamps: false,
  },
);

export default ProductStock;
