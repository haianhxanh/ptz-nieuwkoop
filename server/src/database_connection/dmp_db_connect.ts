import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const { DMP_DB, DMP_DB_ALLOW_REMOTE, NODE_ENV } = process.env;

if (!DMP_DB) {
  throw new Error("Missing env var: DMP_DB");
}

let dmpDbUrl: URL;

try {
  dmpDbUrl = new URL(DMP_DB);
} catch {
  throw new Error("Invalid env var: DMP_DB must be a valid Postgres connection URL");
}

const isLocalDmpHost = ["localhost", "127.0.0.1"].includes(dmpDbUrl.hostname);

if (NODE_ENV !== "production" && !isLocalDmpHost && DMP_DB_ALLOW_REMOTE !== "true") {
  throw new Error("Refusing to use a remote DMP_DB outside production. Point DMP_DB to localhost or set DMP_DB_ALLOW_REMOTE=true intentionally.");
}

const useSsl = !isLocalDmpHost;

export const DMP_DB_CONNECTION = new Sequelize(DMP_DB, {
  dialect: "postgres",
  logging: false,
  define: {
    timestamps: false,
  },
  dialectOptions: useSsl
    ? {
        ssl: {
          rejectUnauthorized: true,
        },
      }
    : undefined,
});
