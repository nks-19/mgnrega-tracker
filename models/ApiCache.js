const mongoose = require('mongoose');

const apiCacheSchema = new mongoose.Schema({
    cache_key: {
        type: String,
        required: true,
        unique: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    expires_at: {
        type: Date,
        required: true
    }
}, {
    timestamps: true
});

// TTL index for automatic expiration
apiCacheSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ApiCache', apiCacheSchema);