import dotenv from 'dotenv';
import path from 'path';
import logger from '../logger/logger';
import axios from 'axios';
import AWS from 'aws-sdk';
dotenv.config();


AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
})
const sqs = new AWS.SQS({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

if (!AWS.config.region) {
    AWS.config.update({
        region: process.env.AWS_REGION,
    });
}


export const ENV_INIT = () => {
    const requiredEnvVars = [
        'PORT',
        'AUTH_API',
        'ADMIN_MAIL',
        'ADMIN_PASSWORD',
        'PRODUCT_API',
        "EMAIL_QUEUE_URL",
        "AWS_REGION",
        "AWS_SECRET_ACCESS_KEY",
        "AWS_ACCESS_KEY_ID",
    ];

    requiredEnvVars.forEach(varName => {
        if (!process.env[varName]) {
            throw new Error(`Environment variable ${varName} is not set.`);
        }
    });

    logger.info('Environment Variables Initialized:');
};


export const authAndGetToken = async () => {
    try {

        const body = {
            email: process.env.ADMIN_MAIL,
            password: process.env.ADMIN_PASSWORD,
        };
        const res = await axios.post(process.env.AUTH_API!, body);


        if (res.data.data) {
            return res.data.data;
        }
        return null;


    } catch (error: any) {
        return null;
    }
};


export const fetchProduct = async (page: number = 1) => {
    try {
        const res = await axios.get(`${process.env.PRODUCT_API!}/search?page=${page}`);
        if (res.data.data) {
            return res.data.data;
        }
        return null;


    } catch (error: any) {
        throw new Error(`Error Authenticating...${error.message}`);
    }
}




export const updateProduct = async (productId: string, body: any, token: string) => {
    try {

        const res = await axios.put(`${process.env.PRODUCT_API!}/product?productId=${productId}`, body, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
    } catch (error: any) {

        throw new Error(`Error Updating...${error.message}`);

    };
}


export const scheduleMessage = async (message: string, subject: string) => {
    const messageBody = JSON.stringify({
        eventType: "send_email",
        mail: process.env.ADMIN_MAIL,
        subject: subject,
        body: message
    });

    const params = {
        QueueUrl: process.env.EMAIL_QUEUE_URL!,
        MessageBody: messageBody,
    };
    try {
        await sqs.sendMessage(params).promise();
        logger.info("Error notification sent to the email queue.");
    } catch (sqsError: any) {
        logger.error("Failed to send message to SQS", sqsError.message);
    }
}