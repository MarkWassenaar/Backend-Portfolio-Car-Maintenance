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

app.get("/dashboard", AuthMiddleware, async (req: AuthRequest, res) => {
  const myCars = await prisma.car.findMany({
    where: {
      userId: req.userId,
    },
    include: {
      UserJob: true,
    },
  });
  res.send(myCars);
});

const registerValidator = z.object({
  username: z.string().min(4),
  password: z.string().min(10),
});

app.post("/register", async (req, res) => {
  const bodyFromRequest = req.body;
  const parsedBody = registerValidator.safeParse(bodyFromRequest);

  if (parsedBody.success) {
    try {
      const newUser = await prisma.user.create({
        data: {
          username: bodyFromRequest.username,
          password: bodyFromRequest.password,
        },
      });
      res.status(201).send(newUser);
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: "Something went wrong" });
    }
  } else {
    res.status(400).send(parsedBody.error.flatten());
  }
});

app.post("/login", async (req, res) => {
  const requestBody = req.body;
  if ("username" in requestBody && "password" in requestBody) {
    try {
      // First find the user
      const userToLogin = await prisma.user.findUnique({
        where: {
          username: requestBody.username,
        },
      });
      if (userToLogin && userToLogin.password === requestBody.password) {
        const token = toToken({ userId: userToLogin.id });
        res.status(200).send({ token: token });
        return;
      }
      // If we didn't find the user or the password doesn't match, send back an error message
      res.status(400).send({ message: "Login failed" });
    } catch (error) {
      // If we get an error, send back HTTP 500 (Server Error)
      res.status(500).send({ message: "Something went wrong!" });
    }
  } else {
    // If we are missing fields, send back a HTTP 400
    res
      .status(400)
      .send({ message: "'username' and 'password' are required!" });
  }
});

app.listen(port, () => console.log(`⚡ Listening on port: ${port}`));
