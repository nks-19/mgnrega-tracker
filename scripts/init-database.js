const mongoose = require('mongoose');
require('dotenv').config();

const State = require('../models/State');
const District = require('../models/District');

async function initializeDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mgnrega');
        console.log('Connected to MongoDB');

        // Clear existing data (optional - remove if you want to keep existing data)
        await State.deleteMany({});
        await District.deleteMany({});

        // Insert states
        const states = [
            { state_code: 'up', state_name_hi: 'उत्तर प्रदेश', state_name_en: 'Uttar Pradesh' },
            { state_code: 'mh', state_name_hi: 'महाराष्ट्र', state_name_en: 'Maharashtra' },
            { state_code: 'br', state_name_hi: 'बिहार', state_name_en: 'Bihar' },
            { state_code: 'wb', state_name_hi: 'पश्चिम बंगाल', state_name_en: 'West Bengal' },
            { state_code: 'mp', state_name_hi: 'मध्य प्रदेश', state_name_en: 'Madhya Pradesh' }
        ];

        await State.insertMany(states);
        console.log('States inserted successfully');

        // Insert districts for Uttar Pradesh
        const districts = [
            { district_code: 'up_lucknow', district_name_hi: 'लखनऊ', district_name_en: 'Lucknow', state_code: 'up', latitude: 26.8467, longitude: 80.9462 },
            { district_code: 'up_kanpur', district_name_hi: 'कानपुर', district_name_en: 'Kanpur', state_code: 'up', latitude: 26.4499, longitude: 80.3319 },
            { district_code: 'up_varanasi', district_name_hi: 'वाराणसी', district_name_en: 'Varanasi', state_code: 'up', latitude: 25.3176, longitude: 82.9739 },
            { district_code: 'up_gorakhpur', district_name_hi: 'गोरखपुर', district_name_en: 'Gorakhpur', state_code: 'up', latitude: 26.7606, longitude: 83.3732 },
            { district_code: 'up_agra', district_name_hi: 'आगरा', district_name_en: 'Agra', state_code: 'up', latitude: 27.1767, longitude: 78.0081 },
            { district_code: 'up_allahabad', district_name_hi: 'इलाहाबाद', district_name_en: 'Allahabad', state_code: 'up', latitude: 25.4358, longitude: 81.8463 },
            { district_code: 'up_bareilly', district_name_hi: 'बरेली', district_name_en: 'Bareilly', state_code: 'up', latitude: 28.3670, longitude: 79.4304 },
            { district_code: 'up_meerut', district_name_hi: 'मेरठ', district_name_en: 'Meerut', state_code: 'up', latitude: 28.9845, longitude: 77.7064 }
        ];

        await District.insertMany(districts);
        console.log('Districts inserted successfully');

        console.log('Database initialization completed!');
        
    } catch (error) {
        console.error('Error initializing database:', error);
    } finally {
        await mongoose.connection.close();
    }
}

initializeDatabase();