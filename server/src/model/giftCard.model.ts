import { DataTypes, Model } from "sequelize";
import { db } from "../database_connection/db_connect";

export type GIFTCARD = {
  last_characters: string;
  potzillas_id: string | null;
  dmp_id: string | null;
  order_name: string | null;
  masked_code: string | null;
  initial_value: number | null;
  balance: number | null;
  enabled: boolean | null;
  expires_on: string | null;
  purchased_from: string | null;
};

class GiftCard extends Model<GIFTCARD> {}

GiftCard.init(
  {
    last_characters: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    potzillas_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dmp_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    order_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    masked_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    initial_value: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    balance: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    expires_on: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    purchased_from: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: "GiftCards",
    modelName: "GiftCard",
  }
);

export default GiftCard;
