import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { log } from "./logger";

const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key";

export async function loginMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    await log("backend", "error", "middleware", "No token provided in request");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    await log("backend", "info", "middleware", "Token verified successfully");
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    await log(
      "backend",
      "fatal",
      "middleware",
      Token verification failed: ${err.message}\nStack: ${err.stack}
    );
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}