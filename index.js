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
import packageJson from "./package.json" assert { type: "json" };

const __dirname = path.resolve();
const server = http.createServer();
const bareServer = createBareServer("/bear/");
const app = express();
const version = packageJson.version;
const discord = "https://discord.gg/unblocking";

// Pre-compile routes once to improve route lookup performance
const routes = [
  { route: "/app", file: "./static/index.html" },
  { route: "/portal", file: "./static/loader.html" },
  { route: "/apps", file: "./static/apps.html" },
  { route: "/gms", file: "./static/gms.html" },
  { route: "/lessons", file: "./static/agloader.html" },
  { route: "/info", file: "./static/info.html" },
  { route: "/edu", file: "./static/loading.html" }
];

// Use compression for faster content delivery
import compression from "compression";
app.use(compression());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files with proper cache control for better performance
app.use(express.static(path.join(__dirname, "static"), { maxAge: "1d" }));
app.use("/uv/", express.static(uvPath, { maxAge: "1d" }));
app.use("/libcurl/", express.static(libcurlPath, { maxAge: "1d" }));
app.use("/baremux/", express.static(baremuxPath, { maxAge: "1d" }));

// Route handling
routes.forEach(({ route, file }) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, file));
  });
});

// Use more efficient redirection
app.get("/student", (_, res) => res.redirect(302, "/portal"));

// Cache external request (if frequently requested)
const workerScriptCache = {
  data: null,
  timestamp: 0,
  ttl: 1000 * 60 * 10, // Cache for 10 minutes
};

app.get("/worker.js", (req, res) => {
  const now = Date.now();
  if (workerScriptCache.data && now - workerScriptCache.timestamp < workerScriptCache.ttl) {
    res.setHeader("Content-Type", "text/javascript");
    return res.send(workerScriptCache.data);
  }

  request("https://cdn.surfdoge.pro/worker.js", (error, response, body) => {
    if (!error && response.statusCode === 200) {
      workerScriptCache.data = body;
      workerScriptCache.timestamp = now;
      res.setHeader("Content-Type", "text/javascript");
      res.send(body);
    } else {
      res.status(500).send("Error fetching worker script");
    }
  });
});

// Handle 404 efficiently
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "./static/404.html"));
});

// Improved server handling
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

// Add server listening event
server.on("listening", () => {
  const port = server.address().port;

  console.log(chalk.bgBlue.white.bold(`  Welcome to Doge V4, user!  `) + "\n");
  console.log(chalk.cyan("-----------------------------------------------"));
  console.log(chalk.green("  🌟 Status: ") + chalk.bold("Active"));
  console.log(chalk.green("  🌍 Port: ") + chalk.bold(chalk.yellow(port)));
  console.log(chalk.green("  🕒 Time: ") + chalk.bold(new Date().toLocaleTimeString()));
  console.log(chalk.cyan("-----------------------------------------------"));
  console.log(chalk.magenta("📦 Version: ") + chalk.bold(version));
  console.log(chalk.magenta("🔗 URL: ") + chalk.underline(`http://localhost:${port}`));
  console.log(chalk.cyan("-----------------------------------------------"));
  console.log(chalk.blue("💬 Discord: ") + chalk.underline(discord));
  console.log(chalk.cyan("-----------------------------------------------"));
});

// Graceful shutdown function
function shutdown(signal) {
  console.log(chalk.bgRed.white.bold(`  Shutting Down (Signal: ${signal})  `) + "\n");
  console.log(chalk.red("-----------------------------------------------"));
  console.log(chalk.yellow("  🛑 Status: ") + chalk.bold("Shutting Down"));
  console.log(chalk.yellow("  🕒 Time: ") + chalk.bold(new Date().toLocaleTimeString()));
  console.log(chalk.red("-----------------------------------------------"));
  console.log(chalk.blue("  Performing graceful exit..."));

  server.close(() => {
    console.log(chalk.blue("  Doge has been closed."));
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Start the server with port 8000
server.listen({ port: 8000 });
