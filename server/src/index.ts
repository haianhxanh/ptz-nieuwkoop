import express from "express";
import logger from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import all_routes from "./routes/all.route";
import bodyParser from "body-parser";
import { db } from "./database_connection/db_connect";

dotenv.config();

const app = express();
const { PORT } = process.env;

app.use(express.json());
app.use(logger("dev"));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: false }));
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
var corsOptions = {
  origin: [
    "https://ptz-nieuwkoop.onrender.com",
    "https://admin.shopify.com/store/potzillas",
    "https://potzillas.myshopify.com",
    "potzillas.myshopify.com",
    "https://angela-oliver-whats-five.trycloudflare.com",
    "https://extensions.shopifycdn.com",
  ],
  optionsSuccessStatus: 200,
  methods: "GET, PUT, POST",
};
app.use(cors(corsOptions));

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
