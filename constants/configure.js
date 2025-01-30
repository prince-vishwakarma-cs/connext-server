
import dotenv from "dotenv";



dotenv.config({
  path: "./.env",
});

export const corsOptions = {
    origin: process.env.FRONTEND_URL,
    credentials: true
  }