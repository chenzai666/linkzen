/* eslint-disable no-console */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const chalk = require("chalk");
const { execSync } = require("child_process");

if (process.env.SKIP_DB_CHECK === "true") {
  console.log("Skipping database check.");
  process.exit(0);
}

const prisma = new PrismaClient();

function success(msg) {
  console.log(chalk.greenBright(`✓ ${msg}`));
}

function error(msg) {
  console.log(chalk.redBright(`✗ ${msg}`));
}

async function checkEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined.");
  } else {
    success("DATABASE_URL is defined.");
  }
}

async function checkConnection() {
  try {
    await prisma.$connect();
    success("Database connection successful.");
  } catch (e) {
    throw new Error("Unable to connect to the database: " + e.message);
  }
}

async function applyMigration() {
  if (process.env.SKIP_DB_MIGRATION !== "true") {
    console.log(execSync("prisma generate").toString());
    console.log(execSync("prisma db push --skip-generate").toString());
    success("Database is up to date.");
  }
}

(async () => {
  let err = false;
  for (let fn of [checkEnv, checkConnection, applyMigration]) {
    try {
      await fn();
    } catch (e) {
      error(e.message);
      err = true;
    } finally {
      await prisma.$disconnect();
      if (err) {
        process.exit(1);
      }
    }
  }
})();
