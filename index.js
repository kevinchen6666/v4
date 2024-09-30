import express from "express";
import http from "node:http";
import path from "node:path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { createBareServer } from "@tomphttp/bare-server-node";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import wisp from "wisp-server-node";
import request from "@cypress/request";
import chalk from "chalk";
import compression from "compression";
import packageJson from "./package.json" assert { type: "json" };

const __dirname = path.resolve();
const app = express();
const server = http.createServer();
const bareServer = createBareServer("/bare/");
const version = packageJson.version;
const discord = "https://discord.gg/unblocking";

// Pre-compile static paths
const staticFiles = {
  "/app": "index.html",
  "/portal": "loader.html",
  "/apps": "apps.html",
  "/gms": "gms.html",
  "/lessons": "agloader.html",
  "/info": "info.html",
  "/edu": "loading.html",
};

// Middleware
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "static"), { maxAge: "1d" }));
app.use("/uv/", express.static(uvPath, { maxAge: "1d" }));
app.use("/libcurl/", express.static(libcurlPath, { maxAge: "1d" }));
app.use("/baremux/", express.static(baremuxPath, { maxAge: "1d" }));

// Precompiled routes
Object.entries(staticFiles).forEach(([route, file]) => {
  app.get(route, (req, res) => res.sendFile(path.join(__dirname, "static", file)));
});

// Redirection
app.get("/student", (_, res) => res.redirect(302, "/portal"));

// Worker script caching (use express static if possible)
const workerScriptCache = {
  data: null,
  timestamp: 0,
  ttl: 10 * 60 * 1000, // 10 minutes
};

app.get("/worker.js", (req, res) => {
  const now = Date.now();
  if (workerScriptCache.data && now - workerScriptCache.timestamp < workerScriptCache.ttl) {
    res.type("text/javascript").send(workerScriptCache.data);
  } else {
    request("https://cdn.surfdoge.pro/worker.js", (error, response, body) => {
      if (!error && response.statusCode === 200) {
        workerScriptCache.data = body;
        workerScriptCache.timestamp = now;
        res.type("text/javascript").send(body);
      } else {
        res.status(500).send("Error fetching worker script");
      }
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "static", "404.html"));
});

// Server events
server.on("request", (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

server.on("upgrade", (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else if (req.url.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.end();
  }
});

server.on("listening", () => {
  const port = server.address().port;
  console.log(chalk.bgBlue.white.bold(`  Welcome to Doge V4, user!  `));
  console.log(chalk.cyan("-----------------------------------------------"));
  console.log(chalk.green("  🌟 Status: ") + chalk.bold("Active"));
  console.log(chalk.green("  🌍 Port: ") + chalk.bold(chalk.yellow(port)));
  console.log(chalk.green("  🕒 Time: ") + chalk.bold(new Date().toLocaleTimeString()));
  console.log(chalk.cyan("-----------------------------------------------"));
  console.log(chalk.magenta("📦 Version: ") + chalk.bold(version));
  console.log(chalk.magenta("🔗 URL: ") + chalk.underline(`http://localhost:${port}`));
  console.log(chalk.blue("💬 Discord: ") + chalk.underline(discord));
});

// Graceful shutdown
const shutdown = (signal) => {
  console.log(chalk.bgRed.white.bold(`  Shutting Down (Signal: ${signal})  `));
  console.log(chalk.yellow("  🛑 Status: ") + chalk.bold("Shutting Down"));
  console.log(chalk.yellow("  🕒 Time: ") + chalk.bold(new Date().toLocaleTimeString()));
  server.close(() => {
    console.log(chalk.blue("  Doge has been closed."));
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Start server
server.listen(8000);
