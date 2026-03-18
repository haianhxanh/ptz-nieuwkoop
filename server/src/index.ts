import express from "express";
import logger from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import cron from "node-cron";
import all_routes from "./routes/all.route";
import wolt_routes from "./app_wolt/routes";
import api_routes from "./routes/api.route";
import bodyParser from "body-parser";
import { db } from "./database_connection/db_connect";
import { syncAllStock } from "./controllers/stock_sync.controller";

dotenv.config();

const app = express();
const { PORT } = process.env;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

var corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (origin.includes(".ngrok.io") || origin.includes(".ngrok-free.app") || origin.includes(".trycloudflare.com")) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  optionsSuccessStatus: 200,
  methods: ["GET", "PUT", "POST", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(logger("dev"));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: false }));
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));

app.use(express.static(path.join(__dirname, "../public")));

app.use("/api", api_routes);
app.use("/wolt", wolt_routes);
app.use("/", all_routes);

/*----Checking Database Connection-------------*/
db.sync({ alter: true })
  .then(() => {
    console.log("Database is connected SUCCESSFULLY");

    if (process.env.NODE_ENV === "production") {
      syncAllStock().catch((err) => console.error("[StockSync] Initial sync failed:", err));
      cron.schedule("0 */6 * * *", () => {
        syncAllStock().catch((err) => console.error("[StockSync] Scheduled sync failed:", err));
      });
      console.log("[StockSync] Cron scheduled: every 6 hours");
    } else {
      console.log("[StockSync] Skipped in development — use GET /get-stock/sync to trigger manually");
    }
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });

if (process.env.NODE_ENV === "production") {
  const next = require("next");
  const nextApp = next({ dev: false, dir: path.join(__dirname, "../client") });
  const handle = nextApp.getRequestHandler();
  nextApp.prepare().then(() => {
    app.use("/app", (req, res) => {
      (req as express.Request & { url?: string }).url = req.originalUrl;
      return handle(req, res);
    });
    app.listen(PORT, () => {
      console.log(`App is listening to PORT ${PORT}`);
    });
  });
} else {
  app.listen(PORT, () => {
    console.log(`App is listening to PORT ${PORT}`);
  });
}
