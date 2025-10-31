const ApiCache = require('../models/ApiCache');

class CacheService {
    constructor() {
        this.defaultTTL = 3600; // 1 hour
        this.longTTL = 24 * 3600; // 24 hours
        this.shortTTL = 300; // 5 minutes
    }

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

    async set(key, data, ttl = this.defaultTTL) {
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

    // Cache keys
    static keys = {
        districtData: (districtCode) => `district_data_${districtCode}`,
        states: 'states_data',
        districts: (stateCode) => `districts_${stateCode}`,
        apiResponse: (endpoint, params) => `api_${endpoint}_${JSON.stringify(params)}`
    };

    // Cache statistics
    async getStats() {
        try {
            const total = await ApiCache.countDocuments();
            const expired = await ApiCache.countDocuments({ expires_at: { $lt: new Date() } });
            const active = total - expired;
            
            return {
                total,
                active,
                expired
            };
        } catch (error) {
            console.error('Cache stats error:', error);
            return null;
        }
    }
}

module.exports = new CacheService();