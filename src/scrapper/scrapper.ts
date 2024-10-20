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
// set region if not set (as not set by the SDK by default)
if (!AWS.config.region) {
    AWS.config.update({
        region: process.env.AWS_REGION,
    });
}
const sqs = new AWS.SQS({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

export const fetchAndUpdatePrice = async () => {
    try {
        let pageNumber = 1;
        const token = await authAndGetToken();
        console.log("TOKEN", token);
        if (!token) {
            console.log("ERROR AUTH");
            throw new Error(`Error Authenticating...`);
        }
        let products = await fetchProduct(pageNumber);
        console.log("PRODUCTS", products);

        const browser = await puppeteer.launch({ headless: false });
        let totalPage = products.totalPages;
        pageNumber = products.page;
        const page = await browser.newPage();
        console.log("Using AWS Region:", process.env.AWS_REGION);  // Debug log


        page.setViewport({ width: 900, height: 800 })


        const updateProductLoop = async (products: any) => {
            for (const product of products.products) {
                await page.goto(product.link, { waitUntil: "domcontentloaded" });
                const priceSelector = 'div.Nx9bqj.CxhGGd';
                try {
                    await page.waitForSelector(priceSelector);
                    if (page) {

                        const price = await page.$eval(priceSelector, el => el.textContent?.trim() || '');

                        // console.log("PRICE", price);
                        // console.log("Product_PRICE", products.products[0].price);

                        console.log("ISPRICE SAME", price, product.price, product.title, price && price !== product.price)
                        if (price && price !== product.price) {
                            const body = {
                                id: product._id,
                                price: price,
                            };
                            console.log("body", body)
                            await updateProduct(product._id, body, token)


                        }

                    }

                } catch (error: any) {
                    console.error("Error", error.message);
                }
            }
        }


        while (pageNumber < totalPage) {
            console.log("PAGE NUMBER", pageNumber);
            console.log("TOTAL_PAGE", totalPage);
            await updateProductLoop(products);
            pageNumber = pageNumber + 1;
            products = await fetchProduct(pageNumber);

        }

    }
    catch (error: any) {
        console.log("ERROR", error);
        await scheduleMessage("🚨🚨🚨🚨 Error Scrapping and updating product", error.message)


    }

};


