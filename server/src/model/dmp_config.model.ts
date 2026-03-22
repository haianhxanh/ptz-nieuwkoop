import { DataTypes, Model } from "sequelize";
import { DMP_DB_CONNECTION } from "../database_connection/dmp_db_connect";

export type DMP_CONFIG = {
  id?: string;
  key: string;
  value: string;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

class DmpConfig extends Model<DMP_CONFIG> {}

DmpConfig.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    tableName: "Config",
    modelName: "DmpConfig",
    timestamps: true,
  }
);

export default DmpConfig;
