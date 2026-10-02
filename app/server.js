const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const dataDirectory = process.env.DATA_DIR || "/app/data";
const dataFile = path.join(dataDirectory, "visits.txt");

fs.mkdirSync(dataDirectory, { recursive: true });

app.get("/", (req, res) => {
    res.send("Jenkins CI/CD Demo Application is running");
});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "UP",
        service: "jenkins-cicd-demo"
    });
});

app.get("/api/message", (req, res) => {
    res.json({
        message: "CI/CD pipeline deployment successful",
        version: process.env.APP_VERSION || "1.0.0"
    });
});

app.get("/visit", (req, res) => {
    fs.appendFileSync(dataFile, `Visit at ${new Date().toISOString()}\n`);

    const visits = fs.readFileSync(dataFile, "utf8");

    res.type("text").send(visits);
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Application running on port ${PORT}`);
});