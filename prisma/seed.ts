import { PrismaClient } from "@prisma/client";
import users from "./data/users.json";
import garages from "./data/garage.json";
import bids from "./data/bids.json";
import cars from "./data/cars.json";
import jobs from "./data/jobs.json";
import userJobs from "./data/userJobs.json";

const prisma = new PrismaClient();

const seed = async () => {
  for (let i = 0; i < users.length; i++) {
    const userData = users[i];
    await prisma.user.create({
      data: userData,
    });
  }

  for (let i = 0; i < garages.length; i++) {
    const garageData = garages[i];
    await prisma.garage.create({
      data: garageData,
    });
  }

  for (let i = 0; i < jobs.length; i++) {
    const jobData = jobs[i];
    await prisma.job.create({
      data: jobData,
    });
  }

  for (let i = 0; i < cars.length; i++) {
    const carData = cars[i];
    await prisma.car.create({
      data: carData,
    });
  }

  for (let i = 0; i < userJobs.length; i++) {
    const userJobData = userJobs[i];
    await prisma.userJob.create({
      data: userJobData,
    });
  }

  for (let i = 0; i < bids.length; i++) {
    const bidData = bids[i];
    await prisma.bid.create({
      data: bidData,
    });
  }
};

seed();
