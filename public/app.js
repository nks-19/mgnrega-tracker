// MGNREGA Dashboard - Standalone Version
class MGNREGADashboard {
    constructor() {
        this.states = [
            {state_code: 'up', state_name_hi: 'उत्तर प्रदेश', state_name_en: 'Uttar Pradesh'},
            {state_code: 'mh', state_name_hi: 'महाराष्ट्र', state_name_en: 'Maharashtra'},
            {state_code: 'br', state_name_hi: 'बिहार', state_name_en: 'Bihar'}
        ];
        this.districts = [
            {district_code: 'up_lucknow', district_name_hi: 'लखनऊ', district_name_en: 'Lucknow', state_code: 'up'},
            {district_code: 'up_kanpur', district_name_hi: 'कानपुर', district_name_en: 'Kanpur', state_code: 'up'},
            {district_code: 'up_varanasi', district_name_hi: 'वाराणसी', district_name_en: 'Varanasi', state_code: 'up'}
        ];
        this.mgnregaData = {
            'up_lucknow': [
                {month: 'January 2024', households: '4,306', days: '67,337', wages: '₹23,80,297', works: '21'},
                {month: 'December 2023', households: '3,890', days: '59,210', wages: '₹21,45,670', works: '18'}
            ],
            'up_kanpur': [
                {month: 'January 2024', households: '4,760', days: '37,033', wages: '₹44,70,400', works: '29'},
                {month: 'December 2023', households: '4,210', days: '42,150', wages: '₹38,90,220', works: '24'}
            ]
        };
        this.currentLanguage = 'hi';
        this.init();
    }

    init() {
        this.bindEvents();
        this.populateStateDropdown();
        this.updateUIText();
    }

    bindEvents() {
        document.getElementById('stateSelect').addEventListener('change', (e) => {
            this.onStateChange(e.target.value);
        });

        document.getElementById('fetchData').addEventListener('click', () => {
            this.fetchDistrictData();
        });

        document.getElementById('languageSelect').addEventListener('change', (e) => {
            this.changeLanguage(e.target.value);
        });
    }

    populateStateDropdown() {
        const stateSelect = document.getElementById('stateSelect');
        stateSelect.innerHTML = `<option value="">${this.translate('select_state')}</option>`;
        
        this.states.forEach(state => {
            const option = document.createElement('option');
            option.value = state.state_code;
            option.textContent = state[`state_name_${this.currentLanguage}`];
            stateSelect.appendChild(option);
        });
    }

    onStateChange(stateCode) {
        const districtSelect = document.getElementById('districtSelect');
        const fetchButton = document.getElementById('fetchData');
        
        if (stateCode) {
            districtSelect.disabled = false;
            this.populateDistrictDropdown(stateCode);
            fetchButton.disabled = false;
        } else {
            districtSelect.disabled = true;
            fetchButton.disabled = true;
        }
    }

    populateDistrictDropdown(stateCode) {
        const districtSelect = document.getElementById('districtSelect');
        districtSelect.innerHTML = `<option value="">${this.translate('select_district')}</option>`;
        
        const stateDistricts = this.districts.filter(d => d.state_code === stateCode);
        stateDistricts.forEach(district => {
            const option = document.createElement('option');
            option.value = district.district_code;
            option.textContent = district[`district_name_${this.currentLanguage}`];
            districtSelect.appendChild(option);
        });
    }

    fetchDistrictData() {
        const districtSelect = document.getElementById('districtSelect');
        const districtCode = districtSelect.value;
        
        if (!districtCode) {
            this.showError(this.translate('select_district_first'));
            return;
        }

        const dashboard = document.getElementById('dashboard');
        dashboard.style.display = 'block';
        
        // Use sample data
        const district = this.districts.find(d => d.district_code === districtCode);
        const state = this.states.find(s => s.state_code === district.state_code);
        const data = this.mgnregaData[districtCode] || [];

        this.displayDashboard(district, state, data);
    }

    displayDashboard(district, state, historicalData) {
        const dashboard = document.getElementById('dashboard');
        const districtName = district[`district_name_${this.currentLanguage}`];
        const stateName = state[`state_name_${this.currentLanguage}`];

        if (historicalData.length === 0) {
            dashboard.innerHTML = `
                <div class="error">
                    <h3>${this.translate('no_data_available')}</h3>
                    <p>${this.translate('try_another_district')}</p>
                </div>
            `;
            return;
        }

        const latestData = historicalData[0];

        dashboard.innerHTML = `
            <div class="dashboard-header">
                <h2>${districtName}, ${stateName}</h2>
                <p>${this.translate('latest_data')}: ${latestData.month}</p>
                <div class="data-source">
                    <small>${this.translate('data_source')}: MGNREGA Sample Data</small>
                </div>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${latestData.households}</div>
                    <div class="metric-label">${this.translate('households_worked')}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${latestData.days}</div>
                    <div class="metric-label">${this.translate('person_days')}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${latestData.wages}</div>
                    <div class="metric-label">${this.translate('wages_paid')}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${latestData.works}</div>
                    <div class="metric-label">${this.translate('works_completed')}</div>
                </div>
            </div>

            <div class="historical-section">
                <h3>${this.translate('historical_data')}</h3>
                <div class="historical-list">
                    ${historicalData.map(item => `
                        <div class="historical-item">
                            <div class="period">${item.month}</div>
                            <div class="details">
                                <span>${this.translate('households')}: ${item.households}</span>
                                <span>${this.translate('days')}: ${item.days}</span>
                                <span>${this.translate('wages')}: ${item.wages}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    changeLanguage(lang) {
        this.currentLanguage = lang;
        this.updateUIText();
        this.populateStateDropdown();
        
        const stateSelect = document.getElementById('stateSelect');
        if (stateSelect.value) {
            this.populateDistrictDropdown(stateSelect.value);
        }
    }

    updateUIText() {
        const translations = this.getTranslations();
        
        // Update UI elements
        document.getElementById('appTitle').textContent = translations.app_title;
        document.getElementById('appSubtitle').textContent = translations.app_subtitle;
        document.getElementById('selectDistrictTitle').textContent = translations.select_your_district;
        document.getElementById('stateLabel').textContent = translations.select_state;
        document.getElementById('districtLabel').textContent = translations.select_district;
        document.getElementById('fetchData').textContent = translations.view_data;

        // Update dropdown placeholders
        const stateSelect = document.getElementById('stateSelect');
        if (stateSelect.options.length > 0) {
            stateSelect.options[0].text = translations.select_state;
        }
        
        const districtSelect = document.getElementById('districtSelect');
        if (districtSelect.options.length > 0) {
            districtSelect.options[0].text = translations.select_district;
        }
    }

    translate(key) {
        const translations = this.getTranslations();
        return translations[key] || key;
    }

    getTranslations() {
        return {
            hi: {
                'app_title': 'हमारी आवाज़, हमारे अधिकार',
                'app_subtitle': 'MGNREGA जिला प्रदर्शन डैशबोर्ड',
                'select_your_district': 'अपना जिला चुनें',
                'select_state': 'राज्य चुनें',
                'select_district': 'जिला चुनें',
                'view_data': 'डेटा देखें',
                'select_district_first': 'कृपया पहले जिला चुनें',
                'no_data_available': 'कोई डेटा उपलब्ध नहीं है',
                'try_another_district': 'कृपया कोई अन्य जिला चुनें',
                'latest_data': 'नवीनतम डेटा',
                'households_worked': 'काम करने वाले परिवार',
                'person_days': 'व्यक्ति-दिवस',
                'wages_paid': 'भुगतान की गई मजदूरी',
                'works_completed': 'पूरे किए गए कार्य',
                'historical_data': 'ऐतिहासिक डेटा',
                'households': 'परिवार',
                'days': 'दिन',
                'wages': 'मजदूरी',
                'data_source': 'डेटा स्रोत'
            },
            en: {
                'app_title': 'Our Voice, Our Rights',
                'app_subtitle': 'MGNREGA District Performance Dashboard',
                'select_your_district': 'Select Your District',
                'select_state': 'Select State',
                'select_district': 'Select District',
                'view_data': 'View Data',
                'select_district_first': 'Please select a district first',
                'no_data_available': 'No data available',
                'try_another_district': 'Please try another district',
                'latest_data': 'Latest Data',
                'households_worked': 'Households Worked',
                'person_days': 'Person Days',
                'wages_paid': 'Wages Paid',
                'works_completed': 'Works Completed',
                'historical_data': 'Historical Data',
                'households': 'Households',
                'days': 'Days',
                'wages': 'Wages',
                'data_source': 'Data Source'
            }
        }[this.currentLanguage];
    }

    showError(message) {
        alert(message); // Simple error display
    }
}

// Start the application
const dashboard = new MGNREGADashboard();