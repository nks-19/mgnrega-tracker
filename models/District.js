const mongoose = require('mongoose');

const districtSchema = new mongoose.Schema({
    district_code: {
        type: String,
        required: true,
        unique: true
    },
    district_name_hi: {
        type: String,
        required: true
    },
    district_name_en: {
        type: String,
        required: true
    },
    state_code: {
        type: String,
        required: true
    },
    latitude: {
        type: Number
    },
    longitude: {
        type: Number
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('District', districtSchema);