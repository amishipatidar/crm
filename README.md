# Superior Closings CRM 

A powerful, AI-driven Lead Management System designed for high-performance title agents. Built with a focus on automation and multi-channel outreach.

## Key Features

### AI-Powered Core
- **Natural Language Parsing**: Uses **Google Gemini AI** to interpret complex SMS commands (e.g., *"Create a lead named John Doe..."*).
- **Smart Context**: Understands intent for creating leads, booking appointments, and setting status updates.

### Automated Outreach Engine
- **Robust Scheduling**: Powered by **BullMQ & Redis** to handle reliable, delayed job execution.
- **Smart Follow-ups**: Automatically schedules SMS/Email follow-ups (e.g., *"Follow up in 3 days"*).
- **Multi-Channel**: Seamlessly sends messages via **Twilio (SMS)** and **SendGrid (Email)**.

### Enterprise-Grade
- **Security**: JWT Authentication, Helmet headers, and Rate Limiting.
- **Data Integrity**: MongoDB storage with Mongoose schemas.
- **Scalable**: Built on Node.js + Express.

---

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: MongoDB (Atlas)
- **Queue/Cache**: Redis, BullMQ
- **AI**: Google Gemini (Flash Model)
- **Communication**: Twilio SDK, SendGrid SDK
- **Frontend**: EJS, Tailwind CSS (Custom Config)

---

## Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas URI
- Redis Instance (Cloud or Local)
- API Keys: Twilio, SendGrid, Google Gemini

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/amishipatidar/crm.git
    cd crm
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file based on `.env.example`:
    ```env
    MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/crm
    REDIS_URL=redis://your-redis-url:6379
    TWILIO_ACCOUNT_SID=...
    SENDGRID_API_KEY=...
    GEMINI_API_KEY=...
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

5.  **Access the App**
    - **Dashboard**: `http://localhost:3000`
    - **Login**: `http://localhost:3000/login`

---

## 📱 SMS Commands Guide

Agents can manage leads directly via SMS using natural language.

| Action | Command Example |
| :--- | :--- |
| **Create Lead** | "New lead: Sarah Jones, 555-0102, sarah@test.com" |
| **Update Status** | "Mark Sarah Jones as Qualified" |
| **Follow Up** | "Remind me to call Sarah in 2 days" |
| **Send Link** | "Send booking link to Sarah Jones" |

---

## Testing

The project includes a suite of test scripts and simulations.

- **Run SMS Simulation**: `npm run test:sms`
- **Verify Webhooks**: `node tests/sms-webhook.test.js`
- **Check AI**: `node test_gemini_real.js`

---

## License

This project is licensed under the ISC License.

---
