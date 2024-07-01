import express, { NextFunction, Request, Response } from "express";
import { toData } from "./jwt";
import { TokenInfo } from "./jwt";

export interface AuthRequest extends Request {
  userId?: number;
  type?: string;
}

const createAuthMiddleware = (type: TokenInfo["type"]) => {
  const newAuthMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    // Get the headers
    const headers = req.headers;
    // Check if the authorization key is in the headers and if the token is provided correctly
    if (
      headers["authorization"] && // Is the header there
      headers["authorization"].split(" ")[0] === "Bearer" && // Is the first word (before the space) equal to "Bearer"
      headers["authorization"].split(" ")[1] // Is there a part after the space
    ) {
      // get the token
      const token = headers["authorization"].split(" ")[1];
      try {
        // Verify the token, this will throw an error if it isn't
        const data = toData(token);
        if (data.type !== type) {
          res.status(401).send({ message: "Token missing or invalid" });
          return;
        }
        req.userId = data.userId;
        // If we reach this point the token was correct!
        // If successful, we call the actual route
        next();
      } catch (e) {
        res.status(401).send({ message: "Token missing or invalid" });
        return;
      }
    } else {
      res.status(401).send({ message: "Token missing or invalid" });
      return;
    }
  };
  return newAuthMiddleware;
};

export const AuthUserMiddleware = createAuthMiddleware("user");

export const AuthGarageMiddleware = createAuthMiddleware("garage");
