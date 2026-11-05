import { DataTypes, Model } from "sequelize";
import { DMP_DB_CONNECTION } from "../database_connection/dmp_db_connect";

export type GIFTCARD = {
  id?: number;
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

// Tabulka žije ve sdílené Render DB (DMP_DB) ve schématu "giftcards".
// Na DMP_DB_CONNECTION NIKDY nevolat sync() — DB sdílí údržba, nabídky, CRM
// a pricing; tabulka se zakládá ručně SQL (viz handover/giftcards-neon-to-render.md).
GiftCard.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
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
    sequelize: DMP_DB_CONNECTION,
    schema: "giftcards",
    tableName: "GiftCards",
    modelName: "GiftCard",
  }
);

export default GiftCard;
