import { config as loadEnv } from "dotenv";

/**
 * Load the repository .env once for the whole suite.
 *
 * Database-backed tests point DATABASE_URL at TEST_DATABASE_URL so they can
 * never touch a development database, and skip entirely when it is unset.
 */
loadEnv({ path: ".env", quiet: true });

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
