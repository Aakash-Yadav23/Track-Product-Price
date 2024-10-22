import puppeteer from "puppeteer";
import { authAndGetToken, fetchProduct, scheduleMessage, updateProduct } from "../utils/utils";
import axios from "axios";
import logger from "../logger/logger";
import AWS from 'aws-sdk';

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const sqs = new AWS.SQS();

export const fetchAndUpdatePrice = async () => {
    try {
        let pageNumber = 1;
        const token = await authAndGetToken();
        if (!token) {
            logger.error("Error Authenticating...");
            throw new Error(`Error Authenticating...`);
        }
        
        let products = await fetchProduct(pageNumber,100);
        const browser = await puppeteer.launch({ headless: true });
        let totalPage = products.totalPages;
        const page = await browser.newPage();
        page.setViewport({ width: 900, height: 800 });

        const updateProductLoop = async (products: any) => {
            for (const product of products.products) {
                await page.goto(product.link, { waitUntil: "domcontentloaded" });
                const priceSelector = 'div.Nx9bqj.CxhGGd';

                try {
                    await page.waitForSelector(priceSelector);
                    const priceWithRuppesIcon = await page.$eval(priceSelector, el => el.textContent?.trim() || '');

                    const formatPrice = (price: string): number => {
                        return parseFloat(price.replace(/[₹,]/g, ''));
                    };

                    let price: number | undefined; // Declare price as undefined initially
                    
                    if (priceWithRuppesIcon) {
                        price = formatPrice(priceWithRuppesIcon);
                    }

                    // Only update if price is defined and different from the current price
                    if (price !== undefined && price !== product.price) {
                        const body = {
                            id: product._id,
                            price: price,
                        };
                        await updateProduct(product._id, body, token);
                        logger.info(`Updated product ${product.title} with new price: ${price}`);
                    } else {
                        logger.info(`No price change for product ${product.title}. Current price: ${product.price}, New price: ${price}`);
                        const body = {
                            id: product._id,
                            inStock: false,
                        };
                        await updateProduct(product._id, body, token);
                    }

                } catch (error: any) {
                    logger.error(`Error fetching price for product ${product.title}: ${error.message}`);
                    // Handle scenario where price is not found
                    logger.warn(`Price selector not found for product ${product.title}, skipping...`);
                }
            }
        }

        while (pageNumber <= totalPage) {
            console.log("PAGE NUMBER", pageNumber);
            console.log("TOTAL_PAGE", totalPage);
            await updateProductLoop(products);
            pageNumber++;
            products = await fetchProduct(pageNumber);
        }

        await browser.close();
    } catch (error: any) {
        logger.error("Error in price fetching and updating: ", error.message);
        await scheduleMessage("🚨🚨🚨🚨 Error Scraping and updating product", error.message);
    }
};
