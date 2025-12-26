require('dotenv').config();
const sgMail = require('@sendgrid/mail');

const API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
const TO_EMAIL = process.env.ADMIN_EMAIL;

console.log('--- SendGrid Debugger ---');
console.log(`API Key Length: ${API_KEY ? API_KEY.length : 'MISSING'}`);
console.log(`From: ${FROM_EMAIL}`);
console.log(`To: ${TO_EMAIL}`);

if (!API_KEY || !FROM_EMAIL || !TO_EMAIL) {
    console.error('❌ Missing .env variables! Check SENDGRID_API_KEY, FROM_EMAIL, and ADMIN_EMAIL.');
    process.exit(1);
}

sgMail.setApiKey(API_KEY);

const msg = {
  to: TO_EMAIL,
  from: FROM_EMAIL,
  subject: 'SendGrid Test - Superior Closings',
  text: 'If you receive this, SendGrid is working!',
  html: '<strong>If you receive this, SendGrid is working!</strong>',
};

(async () => {
  try {
    await sgMail.send(msg);
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Error sending email:');
    console.error(error);
    if (error.response) {
      console.error(JSON.stringify(error.response.body, null, 2));
    }
  }
})();
