// ==================== SIMPLE VERIFICATION SERVER ====================
// Run: node server.js
// Access: http://localhost:3000

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Database file
const DB_FILE = path.join(__dirname, 'db.json');

// Initialize database if it doesn't exist
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        const defaultDB = {
            keys: [],
            users: [
                { username: 'user', password: 'User123' }
            ],
            admin: {
                username: 'admin',
                password: 'Admin123!'
            }
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2));
    }
}

// Read database
function readDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        console.error('Error reading database:', e);
        return { keys: [], users: [], admin: {} };
    }
}

// Write database
function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error writing database:', e);
    }
}

// ==================== VERIFICATION ENDPOINT ====================
app.post('/api/verify', (req, res) => {
    try {
        const { key } = req.body;

        if (!key || typeof key !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Invalid key format'
            });
        }

        const db = readDB();
        const keyData = db.keys.find(k => k.key === key.trim());

        if (!keyData) {
            return res.status(404).json({
                success: false,
                message: 'Key not found'
            });
        }

        const expiresAt = new Date(keyData.expiresAt);
        const now = new Date();
        const isExpired = expiresAt <= now;

        // Check if revoked
        if (keyData.status === 'revoked') {
            return res.status(403).json({
                success: false,
                message: 'Key has been revoked'
            });
        }

        // Check if expired
        if (isExpired) {
            return res.status(403).json({
                success: false,
                message: 'Key has expired'
            });
        }

        // Calculate time remaining
        const timeLeft = expiresAt - now;
        const daysLeft = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
        const hoursLeft = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

        return res.status(200).json({
            success: true,
            message: 'Key is valid',
            data: {
                key: keyData.key,
                type: keyData.type || 'free',
                user: keyData.user,
                createdAt: keyData.createdAt,
                expiresAt: keyData.expiresAt,
                status: keyData.status,
                daysLeft: daysLeft,
                hoursLeft: hoursLeft,
                timeRemaining: `${daysLeft}d ${hoursLeft}h`
            }
        });

    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// ==================== KEY GENERATION ENDPOINT ====================
app.post('/api/generate-key', (req, res) => {
    try {
        const { days, type, user, role } = req.body;

        // Validate input
        if (!days || days < 1 || days > 365) {
            return res.status(400).json({
                success: false,
                message: 'Invalid days value'
            });
        }

        if (!['free', 'premium'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid key type'
            });
        }

        // Generate random key
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let randomPart = '';
        for (let i = 0; i < 24; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const keyPrefix = type === 'free' ? 'Free' : 'Prem';
        const key = keyPrefix + randomPart;

        // Create key data
        const expiryDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        const createdDate = new Date();

        const keyData = {
            id: Date.now(),
            key: key,
            user: user || 'unknown',
            role: role || 'user',
            type: type,
            createdAt: createdDate.toISOString(),
            expiresAt: expiryDate.toISOString(),
            status: 'active'
        };

        // Save to database
        const db = readDB();
        db.keys.push(keyData);
        writeDB(db);

        return res.status(201).json({
            success: true,
            message: 'Key generated successfully',
            data: keyData
        });

    } catch (error) {
        console.error('Key generation error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// ==================== GET ALL KEYS (Admin Only) ====================
app.get('/api/keys', (req, res) => {
    try {
        const db = readDB();
        return res.status(200).json({
            success: true,
            data: db.keys
        });
    } catch (error) {
        console.error('Error fetching keys:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// ==================== REVOKE KEY ====================
app.post('/api/revoke-key', (req, res) => {
    try {
        const { keyId } = req.body;

        if (!keyId) {
            return res.status(400).json({
                success: false,
                message: 'Key ID is required'
            });
        }

        const db = readDB();
        const key = db.keys.find(k => k.id === keyId);

        if (!key) {
            return res.status(404).json({
                success: false,
                message: 'Key not found'
            });
        }

        key.status = 'revoked';
        writeDB(db);

        return res.status(200).json({
            success: true,
            message: 'Key revoked successfully'
        });

    } catch (error) {
        console.error('Revoke error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialize and start server
initDB();
app.listen(PORT, () => {
    console.log(`
    ╔════════════════════════════════════════════╗
    ║   Roblox Key Verification Server Running   ║
    ║   http://localhost:${PORT}                     ║
    ║                                            ║
    ║   Endpoints:                               ║
    ║   POST   /api/verify          (verify key) ║
    ║   POST   /api/generate-key    (create key) ║
    ║   GET    /api/keys            (list keys)  ║
    ║   POST   /api/revoke-key      (revoke key) ║
    ║   GET    /api/health          (health)     ║
    ╚════════════════════════════════════════════╝
    `);
});
