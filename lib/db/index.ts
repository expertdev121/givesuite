import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL || "") {
  throw new Error("DATABASE_URL is not set in the environment variables");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, {
  schema,
  logger: process.env.NODE_ENV === "development" ? true : false,
});
