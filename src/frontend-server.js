require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('./utils/logger');

// Initialize Express app for frontend
const app = express();
const PORT = process.env.FRONTEND_PORT || 3000;

// Set up EJS templating
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static('public'));

// Frontend routes
app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/dashboard', (req, res) => {
    res.render('dashboard');
});

app.get('/bulk-upload', (req, res) => {
    res.render('bulk-upload');
});

app.get('/sms-instructions', (req, res) => {
    res.render('sms-instructions');
});

// Start frontend server
app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🌐 Frontend server running on port ${PORT}`);
    logger.info(`🔗 Frontend URL: http://0.0.0.0:${PORT}`);
});

module.exports = app;
