const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Import database and models
const connectDB = require('./config/database');
const State = require('./models/State');
const District = require('./models/District');
const MgnregaData = require('./models/MgnregaData');
const ApiCache = require('./models/ApiCache');
const mgnregaService = require('./services/mgnregaService');

// Connect to MongoDB
connectDB();

// Enhanced Cache Service (inline to avoid extra files)
class CacheService {
    async get(key) {
        try {
            const cached = await ApiCache.findOne({ 
                cache_key: key,
                expires_at: { $gt: new Date() }
            });
            return cached ? cached.data : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }

    async set(key, data, ttl = 3600) {
        try {
            const expires_at = new Date(Date.now() + ttl * 1000);
            await ApiCache.findOneAndUpdate(
                { cache_key: key },
                { 
                    cache_key: key,
                    data: data,
                    expires_at: expires_at
                },
                { upsert: true, new: true }
            );
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    }

    async delete(key) {
        try {
            await ApiCache.deleteOne({ cache_key: key });
            return true;
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    }

    async clearPattern(pattern) {
        try {
            const regex = new RegExp(pattern);
            await ApiCache.deleteMany({ cache_key: { $regex: regex } });
            return true;
        } catch (error) {
            console.error('Cache clear pattern error:', error);
            return false;
        }
    }

    async getStats() {
        try {
            const total = await ApiCache.countDocuments();
            const expired = await ApiCache.countDocuments({ expires_at: { $lt: new Date() } });
            const active = total - expired;
            
            return { total, active, expired };
        } catch (error) {
            console.error('Cache stats error:', error);
            return null;
        }
    }
}

const cacheService = new CacheService();

// Production Middleware
app.use(helmet({
    contentSecurityPolicy: isProduction ? {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"]
        }
    } : false
}));

app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('public', {
    maxAge: isProduction ? '1d' : '0'
}));

// Simple in-memory rate limiting
const rateLimitMap = new Map();
app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();
    
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100;

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, startTime: now });
    } else {
        const ipData = rateLimitMap.get(ip);
        if (now - ipData.startTime > windowMs) {
            ipData.count = 1;
            ipData.startTime = now;
        } else {
            ipData.count++;
        }

        if (ipData.count > maxRequests) {
            return res.status(429).json({ 
                error: 'Too many requests, please try again later.' 
            });
        }
    }

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
        for (const [ip, data] of rateLimitMap.entries()) {
            if (now - data.startTime > windowMs) {
                rateLimitMap.delete(ip);
            }
        }
    }

    next();
});

// Cache middleware
const cacheMiddleware = (duration = 300) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') return next();
        
        const key = `route_${req.originalUrl}`;
        const cached = await cacheService.get(key);
        
        if (cached) {
            return res.json(cached);
        }
        
        const originalJson = res.json;
        res.json = function(data) {
            cacheService.set(key, data, duration).catch(console.error);
            originalJson.call(this, data);
        };
        
        next();
    };
};

// API Routes
app.get('/api/states', cacheMiddleware(3600), async (req, res) => {
    try {
        const states = await State.find().sort({ state_name_hi: 1 });
        res.json(states);
    } catch (error) {
        console.error('Error fetching states:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/districts/:stateCode', cacheMiddleware(3600), async (req, res) => {
    try {
        const { stateCode } = req.params;
        const districts = await District.find({ state_code: stateCode }).sort({ district_name_hi: 1 });
        res.json(districts);
    } catch (error) {
        console.error('Error fetching districts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/district-data/:districtCode', cacheMiddleware(1800), async (req, res) => {
    try {
        const { districtCode } = req.params;
        
        const district = await District.findOne({ district_code: districtCode });
        if (!district) {
            return res.status(404).json({ error: 'District not found' });
        }

        const state = await State.findOne({ state_code: district.state_code });
        const mgnregaData = await MgnregaData.find({ district_code: districtCode })
            .sort({ financial_year: -1, month: -1 })
            .limit(12);

        const data = {
            district: {
                ...district.toObject(),
                state_name_hi: state?.state_name_hi,
                state_name_en: state?.state_name_en
            },
            historicalData: mgnregaData
        };
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching district data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Sync endpoint
const syncAttempts = new Map();
app.get('/api/sync-data', async (req, res) => {
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxAttempts = 5;

    if (!syncAttempts.has(ip)) {
        syncAttempts.set(ip, { count: 1, startTime: now });
    } else {
        const ipData = syncAttempts.get(ip);
        if (now - ipData.startTime > windowMs) {
            ipData.count = 1;
            ipData.startTime = now;
        } else {
            ipData.count++;
        }

        if (ipData.count > maxAttempts) {
            return res.status(429).json({ 
                error: 'Too many sync attempts, please try again later.' 
            });
        }
    }

    try {
        const result = await mgnregaService.syncData();
        res.json(result);
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({
            success: false,
            error: 'Data sync failed',
            details: error.message
        });
    }
});

app.get('/api/sync-status', async (req, res) => {
    try {
        const status = mgnregaService.getSyncStatus();
        res.json(status);
    } catch (error) {
        console.error('Sync status error:', error);
        res.status(500).json({ error: 'Failed to get sync status' });
    }
});

// Cache management
app.get('/api/cache/stats', async (req, res) => {
    try {
        const stats = await cacheService.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Cache stats error:', error);
        res.status(500).json({ error: 'Failed to get cache stats' });
    }
});

app.post('/api/cache/clear', async (req, res) => {
    try {
        await cacheService.clearPattern('.*');
        res.json({ success: true, message: 'Cache cleared successfully' });
    } catch (error) {
        console.error('Cache clear error:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

app.post('/api/clear-cache/:districtCode', async (req, res) => {
    try {
        const { districtCode } = req.params;
        await cacheService.delete(`district_data_${districtCode}`);
        res.json({ success: true, message: 'Cache cleared for district' });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

app.post('/api/reverse-geocode', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;
        
        const districts = await District.find();
        let nearestDistrict = null;
        let minDistance = Infinity;

        districts.forEach(district => {
            if (district.latitude && district.longitude) {
                const distance = Math.sqrt(
                    Math.pow(69.1 * (district.latitude - latitude), 2) + 
                    Math.pow(69.1 * (longitude - district.longitude) * Math.cos(district.latitude / 57.3), 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestDistrict = district;
                }
            }
        });

        if (nearestDistrict) {
            res.json(nearestDistrict);
        } else {
            res.status(404).json({ error: 'No district found' });
        }
    } catch (error) {
        console.error('Error in reverse geocoding:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', async (req, res) => {
    try {
        await State.findOne();
        const syncStatus = mgnregaService.getSyncStatus();
        const cacheStats = await cacheService.getStats();
        
        res.json({ 
            status: 'OK', 
            database: 'connected',
            syncStatus: syncStatus,
            cacheStats: cacheStats,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            database: 'disconnected',
            error: error.message 
        });
    }
});

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start auto-sync
mgnregaService.startAutoSync(24);

app.listen(PORT, () => {
    console.log(`🚀 MGNREGA Dashboard running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);
    console.log(`🔄 Auto-sync: Every 24 hours`);
});