# Deployment Guide for Render.com

This guide will help you deploy your **Superior Closings CRM** to Render.com.

## 1. Prerequisites
- Your code is pushed to GitHub.
- You have a [Render.com](https://render.com) account.
- You have your MongoDB Atlas connection string (from `.env`).
- You have your Twilio, SendGrid, and Gemini API keys (from `.env`).

## 2. Create a Redis Service (Required for Job Queues)
Your application uses BullMQ, which requires Redis.

1.  On Render.com Dashboard, click **New +** and select **Redis**.
2.  **Name**: `crm-redis` (or similar).
3.  **Region**: Choose the same region you plan to use for your Web Service (e.g., Oregon or Frankfurt).
4.  **Plan**: Select **Free** (if available) or the cheapest Starter plan.
5.  Click **Create Redis**.
6.  **IMPORTANT**: Once created, copy the **Internal Connection URL**. It will look like `redis://...:6379`. You will need this for the `REDIS_URL` environment variable.

## 3. Create the Web Service
1.  Click **New +** and select **Web Service**.
2.  Connect your GitHub repository (`amishipatidar/crm`).
3.  **Name**: `superior-closings-crm` (or your choice).
4.  **Region**: Same as your Redis instance.
5.  **Branch**: `main`.
6.  **Runtime**: **Node**.
7.  **Build Command**: `npm install`
8.  **Start Command**: `node src/server.js` (Render should auto-detect this).

## 4. Environment Variables
You must add your environment variables to Render so the app works.

Scroll down to **Environment Variables** and add the following keys from your local `.env` file:

| Key | Value |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Your MongoDB Atlas Connection String (ensure you use the NEW password) |
| `REDIS_URL` | The **Internal Connection URL** from the Redis service you created in Step 2 |
| `TWILIO_ACCOUNT_SID` | Your Twilio SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio Phone Number |
| `SENDGRID_API_KEY` | Your SendGrid Key |
| `GEMINI_API_KEY` | Your Google Gemini Key |
| `SESSION_SECRET` | A long random string (e.g., production-secret-key) |
| `JWT_SECRET` | A long random string (different from session secret) for secure logins |

## 5. Deploy
1.  Click **Create Web Service**.
2.  Render will start building your app. You can watch the logs.
3.  Once finished, you will see a green **Live** badge and your URL (e.g., `https://superior-closings-crm.onrender.com`).

## 6. Post-Deployment Checks
1.  **Visit the URL**: Ensure the login page loads.
2.  **Log In**: Use your admin credentials (`admin@example.com` / `admin123` unless you changed them).
3.  **Test SMS**: Try sending a command to your Twilio number to verify the webhook is reachable (you will need to update your Twilio Webhook URL to the new Render URL: `https://YOUR-APP-URL.onrender.com/api/sms/webhook`).
