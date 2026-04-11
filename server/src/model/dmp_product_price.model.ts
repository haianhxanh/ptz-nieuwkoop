import { DataTypes, Model } from "sequelize";
import { DMP_DB_CONNECTION } from "../database_connection/dmp_db_connect";

export type DMP_PRODUCT_PRICE = {
  itemCode: string;
  priceGross: number;
  discountPercentage: number;
  priceNett: number;
  sysmodified?: Date | null;
  updatedAt?: Date;
};

class DmpProductPrice extends Model<DMP_PRODUCT_PRICE> {}

DmpProductPrice.init(
  {
    itemCode: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    priceGross: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    discountPercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    priceNett: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    sysmodified: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: DMP_DB_CONNECTION,
    tableName: "ProductPrice",
    modelName: "DmpProductPrice",
    timestamps: false,
  },
);

export default DmpProductPrice;
