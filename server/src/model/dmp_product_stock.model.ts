import { DataTypes, Model } from "sequelize";
import { DMP_DB_CONNECTION } from "../database_connection/dmp_db_connect";

export type DMP_PRODUCT_STOCK = {
  itemcode: string;
  stockAvailable: number;
  firstAvailable?: Date | null;
  sysmodified?: Date | null;
  updatedAt?: Date;
};

class DmpProductStock extends Model<DMP_PRODUCT_STOCK> {}

DmpProductStock.init(
  {
    itemcode: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    stockAvailable: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    firstAvailable: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: "ProductStock",
    modelName: "DmpProductStock",
    timestamps: false,
  },
);

export default DmpProductStock;
