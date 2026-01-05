# Superior Closings CRM 🚀

![Project Banner](https://placehold.co/1200x400/2563eb/ffffff?text=Superior+Closings+CRM)

> **A powerful, AI-driven Lead Management System designed for high-performance title agents.**

![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Twilio](https://img.shields.io/badge/Twilio-SMS-F22F46?style=for-the-badge&logo=twilio&logoColor=white)
![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)

---

## 📖 Overview

**Superior Closings CRM** solves the problem of manual lead tracking for busy title agents. Instead of navigating complex dashboards for every small update, agents can use **Natural Language SMS Commands** to creating leads, setting follow-ups, and managing their pipeline on the go.

Built with an **"AI-First"** approach, the system strictly leverages Google Gemini to parse intent from unstructured text, turning simple messages like *"Remind me to call John tomorrow"* into scheduled database jobs.

---

## ✨ Key Features

### 🧠 AI-Powered Core
- **Natural Language Parsing**: Uses **Google Gemini AI** to interpret complex SMS commands.
  - *Example*: "Create a lead named John Doe, 555-0102" → Auto-extracts Name, Phone, and Email.
- **Smart Context**: Intelligently distinguishes between creating leads, updating statuses, or booking appointments.

### ⚡ Automated Outreach Engine
- **Reliable Scheduling**: Powered by **BullMQ & Redis** to guarantee job execution even during server restarts.
- **Smart Follow-ups**: Automatically schedules SMS/Email reminders (e.g., *"Follow up in 3 days"*).
- **Multi-Channel**: Seamlessly integrates **Twilio (SMS)** and **SendGrid (Email)**.

### 🛡️ Enterprise-Grade
- **Security**: JWT Authentication, Helmet headers, and Rate Limiting.
- **Scalable Architecture**: Modular service-based design (Controller-Service-Model pattern).
- **Data Integrity**: MongoDB storage with strict Mongoose validation schemas.

---

## 🛠️ Tech Stack

| Component | Technology | Why? |
| :--- | :--- | :--- |
| **Backend** | Node.js, Express | Non-blocking I/O for real-time webhook processing. |
| **Database** | MongoDB (Atlas) | Flexible schema for evolving lead data structures. |
| **Queue** | BullMQ + Redis | Robust handling of background jobs and delayed follow-ups. |
| **AI** | Google Gemini | Cost-effective, high-performance natural language understanding. |
| **Frontend** | EJS + Tailwind CSS | Lightweight, server-side rendered UI for fast load times. |

---

## 📸 Screenshots

*(Add your screenshots here: Dashboard, SMS Interaction, etc.)*

| Dashboard View | Mobile SMS View |
|:---:|:---:|
| ![Dashboard](https://placehold.co/600x400/e2e8f0/475569?text=Dashboard+Preview) | ![SMS](https://placehold.co/300x600/e2e8f0/475569?text=SMS+Interaction) |

---

## 🚀 Quick Start

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

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- [🚀 Deployment Guide](docs/DEPLOYMENT.md)
- [📡 SMS System Documentation](docs/SMS_SYSTEM_DOCUMENTATION.md)
- [🧪 Webhook Test Reference](docs/WEBHOOK_TEST_REFERENCE.md)

---

## ✅ Testing

The project includes a comprehensive test suite.

```bash
# Run all tests
npm test

# Run generic SMS simulation
npm run test:sms

# Verify AI Model connection
node src/services/geminiService.js
```

---

## 📝 License

This project is licensed under the ISC License.
