import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const { DB_NAME, DB_USERNAME, DB_PASSWORD, DB_HOST } = process.env;

export const db = new Sequelize(
  DB_NAME!,
  DB_USERNAME!,
  DB_PASSWORD!,

  {
    host: DB_HOST,
    port: 5432,
    dialect: "postgres",
    logging: false,
    define: {
      timestamps: false,
    },
    dialectOptions: {
      encrypt: true,
      ssl: {
        rejectUnauthorized: true,
      },
    },
  }
);
