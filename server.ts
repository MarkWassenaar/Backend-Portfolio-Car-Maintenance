import express, { json } from "express";
import { PrismaClient } from "@prisma/client";
import { toToken } from "./auth/jwt";
import { AuthMiddleware, AuthRequest } from "./auth/middleware";
import cors from "cors";
import { ZodError, z } from "zod";

const app = express();
app.use(cors());
const port = 3001;
app.use(json());

const prisma = new PrismaClient();

app.get("/", (req, res) => {
  res.send("Hello world!");
});

app.listen(port, () => console.log(`⚡ Listening on port: ${port}`));
