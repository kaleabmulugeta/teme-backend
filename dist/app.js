import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { galleryRouter } from "./routes/gallery.js";
import { adminGalleryRouter } from "./routes/admin-gallery.js";
export const app = express();
const corsOptions = {
    origin: env.FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use("/api", healthRouter);
app.use("/api", galleryRouter);
app.use("/api", adminGalleryRouter);
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});
