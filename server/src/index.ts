import express from "express";
import logger from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import all_routes from "./routes/all.route";
import wolt_routes from "./app_wolt/routes";
import offer_routes from "./routes/offer.route";
import bodyParser from "body-parser";
import { db } from "./database_connection/db_connect";

dotenv.config();

const app = express();
const { PORT } = process.env;

const allowedOrigins = [
  "https://ptz-nieuwkoop.onrender.com",
  "https://admin.shopify.com/store/potzillas",
  "https://potzillas.myshopify.com",
  "potzillas.myshopify.com",
  "https://disabilities-quiet-doll-accountability.trycloudflare.com",
  "https://extensions.shopifycdn.com",
  "https://npclient.eu.ngrok.io",
  "http://localhost:3001",
];

var corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (origin.includes(".ngrok.io") || origin.includes(".ngrok-free.app")) {
      return callback(null, true);
    }

    callback(new Error("Not allowed by CORS"));
  },
  optionsSuccessStatus: 200,
  methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
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

app.use("/wolt", wolt_routes);
app.use("/offers", offer_routes);
app.use("/", all_routes);

/*----Checking Database Connection-------------*/
db.sync({ alter: true })
  .then(() => {
    console.log("Database is connected SUCCESSFULLY");
  })
  .catch((error) => {
    console.error("Unable to connect to the database:", error);
  });

app.listen(PORT, () => {
  console.log(`App is listening to PORT ${PORT}`);
});
