const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Dummy API for Mission Progress (Matching server.cpp logic)
app.post('/api/login', (req, res) => {
    res.json({ status: 'success', message: 'Logged in to cloud' });
});

app.post('/api/progress', (req, res) => {
    console.log('Progress received:', req.body);
    res.json({ status: 'success', saved: true });
});

// Fallback to index.html for unknown routes (SPA-ish behavior)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 TAMTHA FIRE server running on port ${PORT}`);
});
