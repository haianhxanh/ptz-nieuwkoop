import { DataTypes, Model } from "sequelize";
import { DMP_DB_CONNECTION } from "../database_connection/dmp_db_connect";

export type DMP_CLIENT = {
  id?: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  notes?: string | null;
  companyName?: string | null;
  companyIco?: string | null;
  companyDic?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

class DmpClient extends Model<DMP_CLIENT> {}

DmpClient.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "CZ",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    companyIco: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    companyDic: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
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
    tableName: "Client",
    modelName: "DmpClient",
    timestamps: true,
  }
);

export default DmpClient;
