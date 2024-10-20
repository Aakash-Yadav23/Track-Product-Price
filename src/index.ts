import express from 'express';
import path from 'path';
import { ENV_INIT, scheduleMessage } from './utils/utils';
import logger from './logger/logger';
import { fetchAndUpdatePrice } from './scrapper/scrapper';
import * as cron from 'node-cron';

ENV_INIT();

const app = express();
const PORT = process.env.PORT;

app.use(express.json());

const initializePrices = async () => {
    try {
        await fetchAndUpdatePrice();
        logger.info("Price fetching and updating completed.");
    } catch (error: any) {
        logger.error("Error during price update: ", error.message);
    }
};


cron.schedule('0 * * * *', () => {
    logger.info("Scheduled task triggered.");
    initializePrices();
});


// initializePrices();

// Basic route
app.get("/", (req, res) => {
    res.json("OK!");
});

// Start the server
app.listen(PORT, () => {
    logger.info(`Server is listening on http://localhost:${PORT}`);
});

process.on("uncaughtException", async (error) => {
    logger.error("Uncaught Exception: ", error.message);
    await scheduleMessage("🚨🚨🚨🚨 Server Down! Uncaught Exception", error.message);
    shutDownServer();
});

process.on("unhandledRejection", async (reason) => {
    logger.error("Unhandled Rejection: ", reason);
    await scheduleMessage("🚨🚨🚨🚨 Server Down! Unhandled Rejection", String(reason));
    shutDownServer();
});

const shutDownServer = () => {
    logger.info("Shutting down server...");
    process.exit(1); 
};
