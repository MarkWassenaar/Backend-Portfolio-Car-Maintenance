import express, { json } from "express";
import { PrismaClient } from "@prisma/client";
import { toToken } from "./auth/jwt";
import {
  AuthRequest,
  AuthUserMiddleware,
  AuthGarageMiddleware,
} from "./auth/middleware";
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

app.get("/car/:id", AuthUserMiddleware, async (req: AuthRequest, res) => {
  const idOfCar = Number(req.params.id);
  const userId = req.userId;

  if (isNaN(idOfCar)) {
    res.status(400).send();
    return;
  }

  const selectedCar = await prisma.car.findUnique({
    where: { id: idOfCar, userId: userId },
    include: {
      UserJob: {
        include: {
          job: true,
          Bid: {
            include: {
              garage: true,
            },
          },
        },
      },
    },
  });
  if (!selectedCar) {
    res.status(404).send();
    return;
  }
  res.send(selectedCar);
});

app.get("/dashboard", AuthUserMiddleware, async (req: AuthRequest, res) => {
  const myCars = await prisma.car.findMany({
    where: {
      userId: req.userId,
    },
    include: {
      UserJob: {
        include: {
          job: true,
          Bid: {
            include: {
              garage: true,
            },
          },
        },
      },
    },
  });
  res.send(myCars);
});

app.get("/jobs", async (req, res) => {
  const allJobs = await prisma.job.findMany();
  res.send(allJobs);
});

app.get("/myuserjobs", AuthGarageMiddleware, async (req: AuthRequest, res) => {
  const myJobs = await prisma.userJob.findMany({
    include: {
      Bid: {
        where: {
          garageId: req.userId,
        },
      },
      car: { include: { user: { select: { username: true } } } },
      job: true,
    },
  });
  res.send(myJobs);
});

const newBidValidator = z.object({
  garageId: z.number().int().positive(),
  amount: z.number().int().positive(),
});

app.patch(
  "/userJobs/:userJobId/bids/:bidId",
  AuthGarageMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const idOfUserJob = Number(req.params.userJobId);
      const idOfBid = Number(req.params.bidId);
      const body = req.body;

      if (isNaN(idOfUserJob)) {
        res.status(400).send();
        return;
      }

      if (isNaN(idOfBid)) {
        res.status(400).send();
        return;
      }

      const bidToFind = await prisma.bid.findUnique({
        where: { id: idOfBid },
      });
      if (bidToFind === null) {
        return res.status(404).send({ message: "Bid not found" });
      }
      if (bidToFind.garageId !== body.garageId) return res.status(401);

      const updatedBid = await prisma.bid.update({
        where: { id: idOfBid },
        data: { amount: body.amount },
      });
      res.send(updatedBid);
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Something went wrong" });
    }
  }
);

app.post(
  "/userJobs/:id/bids",
  AuthGarageMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const idOfUserJob = Number(req.params.id);

      if (isNaN(idOfUserJob)) {
        res.status(400).send();
        return;
      }

      const validation = newBidValidator.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).send({ message: validation.error.errors });
      }
      const newBid = await prisma.bid.create({
        data: {
          ...validation.data,
          userJobId: idOfUserJob,
          accepted: false,
        },
      });
      res.status(201).json(newBid);
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Something went wrong" });
    }
  }
);
const newUserJobValidator = z
  .object({
    jobId: z.number().int().positive(),
    lastService: z.string().transform((str) => new Date(str)),
  })
  .strict();

app.post("/car/:id/job", AuthUserMiddleware, async (req: AuthRequest, res) => {
  try {
    const idOfCar = Number(req.params.id);

    if (isNaN(idOfCar)) {
      res.status(400).send();
      return;
    }

    const validation = newUserJobValidator.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).send({ message: validation.error.errors });
    }

    console.log(validation.data.lastService);
    const newUserJob = await prisma.userJob.create({
      data: {
        ...validation.data,
        carId: idOfCar,
      },
    });
    res.status(201).json(newUserJob);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Something went wrong" });
  }
});

const newCarValidator = z
  .object({
    make: z.string(),
    model: z.string(),
    img: z.string().url().optional(),
    licenseplate: z.string().min(1),
    year: z.number().int().positive(),
  })
  .strict();

app.post("/car", AuthUserMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.userId;

    const validation = newCarValidator.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).send({ message: validation.error?.errors });
    }

    if (!userId) {
      return res.status(404).send({ message: "User not found" });
    }

    const newCar = await prisma.car.create({
      data: {
        ...validation.data,
        userId: userId,
      },
    });
    res.status(201).json(newCar);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Something went wrong" });
  }
});

app.delete("/car/:id", AuthUserMiddleware, async (req: AuthRequest, res) => {
  const idFromReq = Number(req.params.id);
  const userId = req.userId;

  if (isNaN(idFromReq)) {
    return res.status(400).send();
  }

  const carToDelete = await prisma.car.findUnique({
    where: { id: idFromReq, userId: userId },
  });

  if (carToDelete === null) {
    return res.status(404).send({ message: "Car not found" });
  }

  await prisma.car.delete({
    where: { id: idFromReq },
  });
  res.status(200).send({ message: "Car was deleted" });
});

app.delete(
  "/userJob/:id",
  AuthUserMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const userJobId = Number(req.params.id);

      if (isNaN(userJobId)) {
        return res.status(400).send({ message: "Invalid job ID" });
      }

      const deletedJob = await prisma.userJob.delete({
        where: {
          id: userJobId,
        },
      });

      res.status(200).send(deletedJob);
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Something went wrong" });
    }
  }
);

app.delete("/bid/:id", AuthGarageMiddleware, async (req: AuthRequest, res) => {
  try {
    const bidId = Number(req.params.id);

    if (isNaN(bidId)) {
      return res.status(400).send({ message: "Invalid bid Id" });
    }

    const deleteBid = await prisma.bid.delete({
      where: {
        id: bidId,
      },
    });
    res.status(200).send(deleteBid);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Something went wrong" });
  }
});

app.patch("/bid/:id/accept", AuthUserMiddleware, async (req, res) => {
  try {
    const bidId = Number(req.params.id);
    const { accept } = req.body;

    if (isNaN(bidId)) {
      return res.status(400).send({ message: "Invalid bid ID" });
    }

    const updatedBid = await prisma.bid.update({
      where: {
        id: bidId,
      },
      data: {
        accepted: accept,
      },
    });

    if (accept) {
      await prisma.bid.updateMany({
        where: {
          userJobId: updatedBid.userJobId,
          id: {
            not: bidId,
          },
        },
        data: {
          accepted: false,
        },
      });
    }

    res.status(200).json(updatedBid);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Something went wrong" });
  }
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
      const userToLogin = await prisma.user.findUnique({
        where: {
          username: requestBody.username,
        },
      });
      if (userToLogin && userToLogin.password === requestBody.password) {
        const token = toToken({ userId: userToLogin.id, type: "user" });
        res.status(200).send({ token: token, type: "user" });
        return;
      }

      res.status(400).send({ message: "Login failed" });
    } catch (error) {
      res.status(500).send({ message: "Something went wrong!" });
    }
  } else {
    res
      .status(400)
      .send({ message: "'username' and 'password' are required!" });
  }
});

const registerGarageValidator = z
  .object({
    name: z.string().min(1),
    username: z.string().min(1).email(),
    password: z.string().min(5),
  })
  .strict();

app.post("/registergarage", async (req, res) => {
  const bodyFromRequest = req.body;
  const parsedBody = registerGarageValidator.safeParse(bodyFromRequest);

  if (parsedBody.success) {
    try {
      const newGarage = await prisma.garage.create({
        data: {
          name: bodyFromRequest.name,
          username: bodyFromRequest.username,
          password: bodyFromRequest.password,
        },
      });
      res.status(201).send(newGarage);
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: "Something went wrong" });
    }
  } else {
    res.status(400).send(parsedBody.error.flatten());
  }
});

app.post("/logingarage", async (req, res) => {
  const requestBody = req.body;
  if ("username" in requestBody && "password" in requestBody) {
    try {
      const garageToLogin = await prisma.garage.findUnique({
        where: {
          username: requestBody.username,
        },
      });

      if (garageToLogin && garageToLogin.password === requestBody.password) {
        const token = toToken({ userId: garageToLogin.id, type: "garage" });
        res.status(200).send({ token: token, type: "garage" });
        return;
      }

      res.status(400).send({ message: "Login failed" });
    } catch (error) {
      res.status(500).send({ message: "Something went wrong!" });
    }
  } else {
    res
      .status(400)
      .send({ message: "'username' and 'password' are required!" });
  }
});

app.listen(port, () => console.log(`⚡ Listening on port: ${port}`));
