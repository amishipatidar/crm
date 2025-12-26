const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            this.enabled = true;
        } else {
            logger.warn('⚠️ SENDGRID_API_KEY not found in .env. Email service disabled.');
            this.enabled = false;
        }
    }

    /**
     * Send an email helper
     */
    async sendEmail({ to, subject, text, html }) {
        if (!this.enabled) {
            logger.warn('❌ Cannot send email: Service disabled (missing API key).');
            return false;
        }

        const msg = {
            to,
            from: process.env.FROM_EMAIL, // Must be verified in SendGrid
            subject,
            text,
            html: html || text,
        };

        try {
            await sgMail.send(msg);
            logger.info(`📧 Email sent to ${to}`);
            return true;
        } catch (error) {
            logger.error('❌ SendGrid Error:', error);
            if (error.response) {
                logger.error(error.response.body);
            }
            return false;
        }
    }

    /**
     * Alert the Agent (You) about a new lead
     */
    async sendAgentAlert(lead) {
        const agentEmail = process.env.ADMIN_EMAIL || 'admin@example.com'; 
        const subject = `🚀 New Lead: ${lead.name}`;
        const html = `
            <h2>New SMS Lead Received</h2>
            <table border="1" cellpadding="5" cellspacing="0">
                <tr><td><strong>Name</strong></td><td>${lead.name}</td></tr>
                <tr><td><strong>Phone</strong></td><td>${lead.phone}</td></tr>
                <tr><td><strong>Email</strong></td><td>${lead.email || 'N/A'}</td></tr>
                <tr><td><strong>Status</strong></td><td>${lead.status}</td></tr>
            </table>
            <p>Go to your <a href="http://localhost:3000/dashboard">Dashboard</a> to view details.</p>
        `;
        return this.sendEmail({ to: agentEmail, subject, html });
    }

    /**
     * Welcome the Client automatically
     */
    async sendClientWelcome(lead) {
        if (!lead.email) return false;

        const subject = `Hi ${lead.name.split(' ')[0]}, received your message!`;
        const text = `Hi ${lead.name},\n\nThanks for reaching out to Superior Closings. I've received your info and will be in touch shortly.\n\nBest,\nSuperior Closings Team`;
        
        return this.sendEmail({ to: lead.email, subject, text });
    }
}

module.exports = new EmailService();
