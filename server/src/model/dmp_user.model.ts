import { DataTypes, Model } from "sequelize";
import { DMP_DB_CONNECTION } from "../database_connection/dmp_db_connect";

export type DMP_USER = {
  id?: string;
  email: string;
  name?: string;
  role?: "MANAGER" | "TECHNICIAN";
  isActive?: boolean;
  created_at?: Date;
  updated_at?: Date;
};

class DmpUser extends Model<DMP_USER> {}

DmpUser.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM("MANAGER", "TECHNICIAN"),
      allowNull: false,
      defaultValue: "TECHNICIAN",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      field: "createdAt",
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      field: "updatedAt",
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize: DMP_DB_CONNECTION,
    tableName: "User",
    modelName: "DmpUser",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

export default DmpUser;
