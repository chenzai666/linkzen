/* eslint-disable no-console */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const chalk = require("chalk");
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// 若未提供 AUTH_SECRET，自动生成并持久化到数据卷
const secretFile = path.join(process.env.DATA_DIR || "/app/data", ".auth_secret");
if (!process.env.AUTH_SECRET) {
  let secret;
  if (fs.existsSync(secretFile)) {
    secret = fs.readFileSync(secretFile, "utf-8").trim();
    console.log(chalk.blueBright("ℹ AUTH_SECRET loaded from data volume."));
  } else {
    secret = crypto.randomBytes(32).toString("base64");
    fs.mkdirSync(path.dirname(secretFile), { recursive: true });
    fs.writeFileSync(secretFile, secret, { mode: 0o600 });
    console.log(chalk.greenBright("✓ AUTH_SECRET generated and saved to data volume."));
  }
  process.env.AUTH_SECRET = secret;
  // 写入临时 .env 让 Next.js 服务进程也能读取
  fs.appendFileSync("/app/.env", `\nAUTH_SECRET=${secret}\n`);
}

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
