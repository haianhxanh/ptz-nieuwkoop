import express from "express";
import logger from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import all_routes from "./routes/all.route";

dotenv.config();

const app = express();
const { PORT } = process.env;

app.use(express.json());
app.use(logger("dev"));
app.use(express.urlencoded({ extended: false }));
var corsOptions = {
  origin: [
    "https://ptz-nieuwkoop.onrender.com",
    "https://admin.shopify.com/store/potzillas",
    "https://potzillas.myshopify.com",
    "https://les-defines-states-canada.trycloudflare.com",
  ],
  optionsSuccessStatus: 200,
  methods: "GET, PUT, POST",
};
app.use(cors(corsOptions));

app.use("/", all_routes);

app.listen(PORT, () => {
  console.log(`App is listening to PORT ${PORT}`);
});
