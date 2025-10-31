const mongoose = require('mongoose');

const mgnregaDataSchema = new mongoose.Schema({
    district_code: {
        type: String,
        required: true
    },
    financial_year: {
        type: String,
        required: true
    },
    month: {
        type: String,
        required: true
    },
    total_households_worked: Number,
    total_person_days_generated: Number,
    total_wages_paid: Number,
    total_works_taken_up: Number,
    works_completed: Number,
    avg_days_per_household: Number,
    data_updated_at: Date
}, {
    timestamps: true
});

// Compound index for unique combination
mgnregaDataSchema.index({ district_code: 1, financial_year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('MgnregaData', mgnregaDataSchema);