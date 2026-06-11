import express from "express";
import dotenv from "dotenv";
import { log } from "./logger";
import { loginMiddleware } from "./logginmiddleware";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  await log("backend", "info", "route", "Health check hit");
  res.json({ message: "Server is running" });
});

app.get("/protected", loginMiddleware, async (req, res) => {
  await log("backend", "info", "route", "Protected route accessed");
  res.json({ message: "Access granted" });
});

app.listen(PORT, () => {
  log("backend", "info", "service", Server started on port ${PORT});
});