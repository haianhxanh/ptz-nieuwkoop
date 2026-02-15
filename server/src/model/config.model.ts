import { DataTypes, Model } from "sequelize";
import { db } from "../database_connection/db_connect";

export type CONFIG = {
  id?: string;
  key: string;
  value: string;
  description?: string;
  created_at?: Date;
  updated_at?: Date;
};

class Config extends Model<CONFIG> {}

Config.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
    tableName: "Config",
    modelName: "Config",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default Config;
