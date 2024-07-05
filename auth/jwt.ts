import jwt from "jsonwebtoken";
import { JwtPayload } from "jsonwebtoken";
const SECRET = process.env.SECRET || "apple-pie"; // This can be any random string, longer is better (safer)

export const userTypes = ["garage", "user"] as const;

type UserT = (typeof userTypes)[number];

export interface TokenInfo extends JwtPayload {
  userId: number;
  type: UserT;
}

export const toToken = (data: TokenInfo) => {
  const token = jwt.sign(data, SECRET, { expiresIn: "14 days" });
  return token;
};

export const toData = (token: string) => {
  const data = jwt.verify(token, SECRET) as TokenInfo;
  return data;
};
