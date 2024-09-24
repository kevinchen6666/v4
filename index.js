import express from "express";
import http from "node:http";
import path from "node:path";
import {
    libcurlPath
} from "@mercuryworkshop/libcurl-transport";
import {
    baremuxPath
} from "@mercuryworkshop/bare-mux/node";
import {
    createBareServer
} from "@tomphttp/bare-server-node";
import {
    uvPath
} from "@titaniumnetwork-dev/ultraviolet";
import wisp from "wisp-server-node";
import request from "@cypress/request";
import chalk from "chalk";
import packageJson from "./package.json"
assert {
    type: "json"
};
const __dirname = path.resolve(),
    server = http.createServer(),
    bareServer = createBareServer("/bear/"),
    app = express(server),
    version = packageJson.version,
    discord = "https://discord.gg/unblocking",
    routes = [{
        route: "/app",
        file: "./static/index.html"
    }, {
        route: "/portal",
        file: "./static/loader.html"
    }, {
        route: "/apps",
        file: "./static/apps.html"
    }, {
        route: "/gms",
        file: "./static/gms.html"
    }, {
        route: "/lessons",
        file: "./static/agloader.html"
    }, {
        route: "/info",
        file: "./static/info.html"
    }, {
        route: "/edu",
        file: "./static/loading.html"
    }];

function shutdown(e) {
    console.log(chalk.bgRed.white.bold(` Shutting Down (Signal: ${e}) `) + "\n"), console.log(chalk.red("-----------------------------------------------")), console.log(chalk.yellow(" 🛑 Status: ") + chalk.bold("Shutting Down")), console.log(chalk.yellow(" 🕒 Time: ") + chalk.bold((new Date).toLocaleTimeString())), console.log(chalk.red("-----------------------------------------------")), console.log(chalk.blue(" Performing graceful exit...")), server.close((() => {
        console.log(chalk.blue(" Doge has been closed.")), process.exit(0)
    }))
}
app.use(express.json()), app.use(express.urlencoded({
    extended: !0
})), app.use(express.static(path.join(__dirname, "static"))), app.use("/uv/", express.static(uvPath)), app.use("/libcurl/", express.static(libcurlPath)), app.use("/baremux/", express.static(baremuxPath)), routes.forEach((({
    route: e,
    file: o
}) => {
    app.get(e, ((e, r) => {
        r.sendFile(path.join(__dirname, o))
    }))
})), app.get("/student", ((e, o) => {
    o.redirect("/portal")
})), app.get("/worker.js", ((e, o) => {
    request("https://cdn.surfdoge.pro/worker.js", ((e, r, t) => {
        e || 200 !== r.statusCode ? o.status(500).send("Error fetching worker script") : (o.setHeader("Content-Type", "text/javascript"), o.send(t))
    }))
})), app.use(((e, o) => {
    o.statusCode = 404, o.sendFile(path.join(__dirname, "./static/404.html"))
})), server.on("request", ((e, o) => {
    bareServer.shouldRoute(e) ? bareServer.routeRequest(e, o) : app(e, o)
})), server.on("upgrade", ((e, o, r) => {
    bareServer.shouldRoute(e) ? bareServer.routeUpgrade(e, o, r) : e.url.endsWith("/wisp/") ? wisp.routeRequest(e, o, r) : o.end()
})), server.on("listening", (() => {
    console.log(chalk.bgBlue.white.bold(" Welcome to Doge V4, user! ") + "\n"), console.log(chalk.cyan("-----------------------------------------------")), console.log(chalk.green(" 🌟 Status: ") + chalk.bold("Active")), console.log(chalk.green(" 🌍 Port: ") + chalk.bold(chalk.yellow(server.address().port))), console.log(chalk.green(" 🕒 Time: ") + chalk.bold((new Date).toLocaleTimeString())), console.log(chalk.cyan("-----------------------------------------------")), console.log(chalk.magenta("📦 Version: ") + chalk.bold(version)), console.log(chalk.magenta("🔗 URL: ") + chalk.underline("http://localhost:" + server.address().port)), console.log(chalk.cyan("-----------------------------------------------")), console.log(chalk.blue("💬 Discord: ") + chalk.underline(discord)), console.log(chalk.cyan("-----------------------------------------------"))
})), process.on("SIGTERM", (() => shutdown("SIGTERM"))), process.on("SIGINT", (() => shutdown("SIGINT"))), server.listen({
    port: 8e3
});
