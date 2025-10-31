const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Sample data
const sampleData = {
    states: [
        {state_code: 'up', state_name_hi: 'उत्तर प्रदेश', state_name_en: 'Uttar Pradesh'},
        {state_code: 'mh', state_name_hi: 'महाराष्ट्र', state_name_en: 'Maharashtra'},
        {state_code: 'br', state_name_hi: 'बिहार', state_name_en: 'Bihar'},
        {state_code: 'wb', state_name_hi: 'पश्चिम बंगाल', state_name_en: 'West Bengal'},
        {state_code: 'mp', state_name_hi: 'मध्य प्रदेश', state_name_en: 'Madhya Pradesh'}
    ],
    districts: [
        {district_code: 'up_lucknow', district_name_hi: 'लखनऊ', district_name_en: 'Lucknow', state_code: 'up', latitude: 26.8467, longitude: 80.9462},
        {district_code: 'up_kanpur', district_name_hi: 'कानपुर', district_name_en: 'Kanpur', state_code: 'up', latitude: 26.4499, longitude: 80.3319},
        {district_code: 'up_varanasi', district_name_hi: 'वाराणसी', district_name_en: 'Varanasi', state_code: 'up', latitude: 25.3176, longitude: 82.9739},
        {district_code: 'up_gorakhpur', district_name_hi: 'गोरखपुर', district_name_en: 'Gorakhpur', state_code: 'up', latitude: 26.7606, longitude: 83.3732},
        {district_code: 'up_agra', district_name_hi: 'आगरा', district_name_en: 'Agra', state_code: 'up', latitude: 27.1767, longitude: 78.0081}
    ],
    mgnregaData: {
        'up_lucknow': [
            {financial_year: '2023-2024', month: 'January', total_households_worked: 4306, total_person_days_generated: 67337, total_wages_paid: 2380297, total_works_taken_up: 47, works_completed: 21, avg_days_per_household: 36.17},
            {financial_year: '2023-2024', month: 'February', total_households_worked: 4190, total_person_days_generated: 36059, total_wages_paid: 4606750, total_works_taken_up: 36, works_completed: 25, avg_days_per_household: 44.07}
        ],
        'up_kanpur': [
            {financial_year: '2023-2024', month: 'January', total_households_worked: 4760, total_person_days_generated: 37033, total_wages_paid: 4470400, total_works_taken_up: 22, works_completed: 29, avg_days_per_household: 29.49},
            {financial_year: '2023-2024', month: 'February', total_households_worked: 3247, total_person_days_generated: 25274, total_wages_paid: 5099651, total_works_taken_up: 20, works_completed: 7, avg_days_per_household: 31.97}
        ]
    }
};

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/states', (req, res) => {
    res.json(sampleData.states);
});

app.get('/api/districts/:stateCode', (req, res) => {
    const stateDistricts = sampleData.districts.filter(d => d.state_code === req.params.stateCode);
    res.json(stateDistricts);
});

app.get('/api/district-data/:districtCode', (req, res) => {
    const district = sampleData.districts.find(d => d.district_code === req.params.districtCode);
    const state = sampleData.states.find(s => s.state_code === district.state_code);
    const historicalData = sampleData.mgnregaData[req.params.districtCode] || [];

    res.json({
        district: {
            ...district,
            state_name_hi: state.state_name_hi,
            state_name_en: state.state_name_en
        },
        historicalData: historicalData
    });
});

app.post('/api/reverse-geocode', (req, res) => {
    const { latitude, longitude } = req.body;
    
    let nearestDistrict = null;
    let minDistance = Infinity;

    sampleData.districts.forEach(district => {
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
});

app.post('/api/clear-cache/:districtCode', (req, res) => {
    res.json({ success: true, message: 'Cache cleared' });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'MGNREGA API is running with sample data',
        timestamp: new Date().toISOString()
    });
});

// Basic route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 MGNREGA Dashboard running on port ${PORT}`);
    console.log(`📊 Using sample data - no database required`);
    console.log(`❤️  Health: http://localhost:${PORT}/health`);
});