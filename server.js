const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Sample data
const sampleData = {
    states: [
        {state_code: 'up', state_name_hi: 'उत्तर प्रदेश', state_name_en: 'Uttar Pradesh'},
        {state_code: 'mh', state_name_hi: 'महाराष्ट्र', state_name_en: 'Maharashtra'}
    ],
    districts: [
        {district_code: 'up_lucknow', district_name_hi: 'लखनऊ', district_name_en: 'Lucknow', state_code: 'up', latitude: 26.8467, longitude: 80.9462},
        {district_code: 'up_kanpur', district_name_hi: 'कानपुर', district_name_en: 'Kanpur', state_code: 'up', latitude: 26.4499, longitude: 80.3319}
    ]
};

// Middleware - simplified
app.use(express.json());
app.use(express.static('public'));

// API Routes
app.get('/api/states', (req, res) => {
    console.log('GET /api/states');
    res.json(sampleData.states);
});

app.get('/api/districts/:stateCode', (req, res) => {
    console.log('GET /api/districts/' + req.params.stateCode);
    const stateDistricts = sampleData.districts.filter(d => d.state_code === req.params.stateCode);
    res.json(stateDistricts);
});

app.get('/api/district-data/:districtCode', (req, res) => {
    console.log('GET /api/district-data/' + req.params.districtCode);
    const district = sampleData.districts.find(d => d.district_code === req.params.districtCode);
    
    if (!district) {
        return res.status(404).json({ error: 'District not found' });
    }

    const state = sampleData.states.find(s => s.state_code === district.state_code);
    
    // Sample MGNREGA data
    const sampleMgnregaData = [
        {
            financial_year: '2023-2024',
            month: 'January', 
            total_households_worked: 4306,
            total_person_days_generated: 67337,
            total_wages_paid: 2380297,
            total_works_taken_up: 47,
            works_completed: 21,
            avg_days_per_household: 36.17
        }
    ];

    res.json({
        district: {
            ...district,
            state_name_hi: state.state_name_hi,
            state_name_en: state.state_name_en
        },
        historicalData: sampleMgnregaData
    });
});

app.post('/api/reverse-geocode', (req, res) => {
    console.log('POST /api/reverse-geocode');
    // Just return the first district for now
    res.json(sampleData.districts[0]);
});

app.post('/api/clear-cache/:districtCode', (req, res) => {
    console.log('POST /api/clear-cache/' + req.params.districtCode);
    res.json({ success: true, message: 'Cache cleared' });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'MGNREGA API is running',
        timestamp: new Date().toISOString()
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
});