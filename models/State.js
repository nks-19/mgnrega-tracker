const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
    state_code: {
        type: String,
        required: true,
        unique: true
    },
    state_name_hi: {
        type: String,
        required: true
    },
    state_name_en: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('State', stateSchema);