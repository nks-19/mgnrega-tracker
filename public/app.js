// Enhanced app functionality with API integration
class MGNREGADashboard {
    constructor() {
        this.states = [];
        this.districts = [];
        this.currentLanguage = 'hi';
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadStates();
        this.updateUIText();
    }

    bindEvents() {
        document.getElementById('stateSelect').addEventListener('change', (e) => {
            this.onStateChange(e.target.value);
        });

        document.getElementById('fetchData').addEventListener('click', () => {
            this.fetchDistrictData();
        });

        document.getElementById('useLocation').addEventListener('click', () => {
            this.getUserLocation();
        });

        document.getElementById('languageSelect').addEventListener('change', (e) => {
            this.changeLanguage(e.target.value);
        });
    }

    async loadStates() {
        try {
            const response = await fetch('/api/states');
            if (!response.ok) throw new Error('Failed to load states');
            
            this.states = await response.json();
            console.log('Loaded states:', this.states); // Debug
            this.populateStateDropdown();
        } catch (error) {
            console.error('Error loading states:', error);
            this.showError(this.translate('error_loading_states'));
            
            // Fallback states
            this.states = [
                { state_code: 'up', state_name_hi: 'उत्तर प्रदेश', state_name_en: 'Uttar Pradesh' },
                { state_code: 'mh', state_name_hi: 'महाराष्ट्र', state_name_en: 'Maharashtra' },
                { state_code: 'br', state_name_hi: 'बिहार', state_name_en: 'Bihar' },
                { state_code: 'wb', state_name_hi: 'पश्चिम बंगाल', state_name_en: 'West Bengal' },
                { state_code: 'mp', state_name_hi: 'मध्य प्रदेश', state_name_en: 'Madhya Pradesh' }
            ];
            this.populateStateDropdown();
        }
    }

    populateStateDropdown() {
        const stateSelect = document.getElementById('stateSelect');
        const currentSelection = stateSelect.value; // Remember current selection
        
        stateSelect.innerHTML = `<option value="">${this.translate('select_state')}</option>`;
        
        this.states.forEach(state => {
            const option = document.createElement('option');
            option.value = state.state_code;
            option.textContent = state[`state_name_${this.currentLanguage}`];
            stateSelect.appendChild(option);
        });
        
        // Restore selection if it exists
        if (currentSelection) {
            stateSelect.value = currentSelection;
        }
    }

    async onStateChange(stateCode) {
        const districtSelect = document.getElementById('districtSelect');
        const fetchButton = document.getElementById('fetchData');
        
        if (stateCode) {
            districtSelect.disabled = false;
            districtSelect.innerHTML = `<option value="">${this.translate('loading_districts')}...</option>`;
            await this.loadDistricts(stateCode);
            fetchButton.disabled = false;
        } else {
            districtSelect.disabled = true;
            fetchButton.disabled = true;
            districtSelect.innerHTML = `<option value="">${this.translate('select_district')}</option>`;
        }
    }

    async loadDistricts(stateCode) {
        try {
            const response = await fetch(`/api/districts/${stateCode}`);
            if (!response.ok) throw new Error('Failed to load districts');
            
            this.districts = await response.json();
            console.log(`Loaded ${this.districts.length} districts for ${stateCode}`); // Debug
            this.populateDistrictDropdown();
        } catch (error) {
            console.error('Error loading districts:', error);
            this.showError(this.translate('error_loading_districts'));
        }
    }

    populateDistrictDropdown() {
        const districtSelect = document.getElementById('districtSelect');
        const currentSelection = districtSelect.value; // Remember current selection
        
        districtSelect.innerHTML = `<option value="">${this.translate('select_district')}</option>`;
        
        this.districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district.district_code;
            option.textContent = district[`district_name_${this.currentLanguage}`];
            option.setAttribute('data-lat', district.latitude);
            option.setAttribute('data-lon', district.longitude);
            districtSelect.appendChild(option);
        });
        
        // Restore selection if it exists
        if (currentSelection) {
            districtSelect.value = currentSelection;
        }
    }

    async fetchDistrictData() {
        const districtSelect = document.getElementById('districtSelect');
        const districtCode = districtSelect.value;
        
        if (!districtCode) {
            this.showError(this.translate('select_district_first'));
            return;
        }

        const dashboard = document.getElementById('dashboard');
        dashboard.style.display = 'block';
        dashboard.innerHTML = `<div class="loading">${this.translate('loading_data')}</div>`;

        try {
            const response = await fetch(`/api/district-data/${districtCode}`);
            if (!response.ok) throw new Error('Failed to fetch district data');
            
            const data = await response.json();
            this.displayDashboard(data);
        } catch (error) {
            console.error('Error fetching data:', error);
            this.showError(this.translate('error_loading_data'));
        }
    }

    displayDashboard(data) {
        const dashboard = document.getElementById('dashboard');
        
        if (!data.district || !data.historicalData || data.historicalData.length === 0) {
            dashboard.innerHTML = `
                <div class="error">
                    <h3>${this.translate('no_data_available')}</h3>
                    <p>${this.translate('try_another_district')}</p>
                    <button onclick="window.location.reload()">${this.translate('refresh')}</button>
                </div>
            `;
            return;
        }

        const districtName = data.district[`district_name_${this.currentLanguage}`];
        const stateName = data.district[`state_name_${this.currentLanguage}`];
        const latestData = data.historicalData[0];

        dashboard.innerHTML = `
            <div class="dashboard-header">
                <h2>${districtName}, ${stateName}</h2>
                <p>${this.translate('latest_data')}: ${latestData.month} ${latestData.financial_year}</p>
                <div class="data-source">
                    <small>${this.translate('data_source')}: data.gov.in</small>
                </div>
            </div>
            
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${(latestData.total_households_worked || 0).toLocaleString()}</div>
                    <div class="metric-label">${this.translate('households_worked')}</div>
                    <div class="metric-trend">${this.calculateTrend(data.historicalData, 'total_households_worked')}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${(latestData.total_person_days_generated || 0).toLocaleString()}</div>
                    <div class="metric-label">${this.translate('person_days')}</div>
                    <div class="metric-trend">${this.calculateTrend(data.historicalData, 'total_person_days_generated')}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">₹${(latestData.total_wages_paid || 0).toLocaleString()}</div>
                    <div class="metric-label">${this.translate('wages_paid')}</div>
                    <div class="metric-trend">${this.calculateTrend(data.historicalData, 'total_wages_paid')}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${latestData.works_completed || 0}</div>
                    <div class="metric-label">${this.translate('works_completed')}</div>
                    <div class="metric-trend">${this.calculateTrend(data.historicalData, 'works_completed')}</div>
                </div>
            </div>

            <div class="performance-section">
                <h3>${this.translate('performance_indicators')}</h3>
                <div class="indicators">
                    <div class="indicator">
                        <span class="indicator-label">${this.translate('avg_days_per_household')}:</span>
                        <span class="indicator-value">${(latestData.avg_days_per_household || 0).toFixed(1)} ${this.translate('days')}</span>
                    </div>
                    <div class="indicator">
                        <span class="indicator-label">${this.translate('completion_rate')}:</span>
                        <span class="indicator-value">${this.calculateCompletionRate(latestData)}%</span>
                    </div>
                </div>
            </div>
            
            <div class="historical-section">
                <h3>${this.translate('historical_data')} (Last 6 Months)</h3>
                <div class="historical-list">
                    ${this.generateHistoricalList(data.historicalData.slice(0, 6))}
                </div>
            </div>

            <div class="actions-section">
                <button onclick="dashboard.refreshData()" class="btn-secondary">${this.translate('refresh_data')}</button>
            </div>
        `;
    }

    calculateTrend(historicalData, field) {
        if (historicalData.length < 2) return '';
        
        const current = historicalData[0][field] || 0;
        const previous = historicalData[1][field] || 0;
        
        if (previous === 0) return '';
        
        const change = ((current - previous) / previous) * 100;
        const trend = change >= 0 ? '↗' : '↘';
        const color = change >= 0 ? '#27ae60' : '#e74c3c';
        
        return `<span style="color: ${color}">${trend} ${Math.abs(change).toFixed(1)}%</span>`;
    }

    calculateCompletionRate(data) {
        if (!data.total_works_taken_up || data.total_works_taken_up === 0) return 0;
        return ((data.works_completed || 0) / data.total_works_taken_up * 100).toFixed(1);
    }

    generateHistoricalList(historicalData) {
        return historicalData.map(item => `
            <div class="historical-item">
                <div class="period">${item.month} ${item.financial_year}</div>
                <div class="details">
                    <span>${this.translate('households')}: ${(item.total_households_worked || 0).toLocaleString()}</span>
                    <span>${this.translate('days')}: ${(item.total_person_days_generated || 0).toLocaleString()}</span>
                    <span>${this.translate('wages')}: ₹${(item.total_wages_paid || 0).toLocaleString()}</span>
                </div>
            </div>
        `).join('');
    }

    async refreshData() {
        const districtSelect = document.getElementById('districtSelect');
        const districtCode = districtSelect.value;
        
        if (districtCode) {
            this.showLoading(this.translate('refreshing_data'));
            
            try {
                // Clear cache for this district
                await fetch(`/api/clear-cache/${districtCode}`, { method: 'POST' });
                // Refetch data
                await this.fetchDistrictData();
                this.showSuccess(this.translate('data_refreshed'));
            } catch (error) {
                this.showError(this.translate('refresh_failed'));
            }
        }
    }

    getUserLocation() {
        if (!navigator.geolocation) {
            this.showError(this.translate('geolocation_not_supported'));
            return;
        }

        this.showLoading(this.translate('detecting_location'));

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                await this.reverseGeocode(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = this.translate('location_error');
                
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = this.translate('location_permission_denied');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = this.translate('location_unavailable');
                        break;
                    case error.TIMEOUT:
                        errorMessage = this.translate('location_timeout');
                        break;
                }
                
                this.showError(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    async reverseGeocode(lat, lon) {
        try {
            const response = await fetch('/api/reverse-geocode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ latitude: lat, longitude: lon })
            });

            if (!response.ok) throw new Error('Reverse geocoding failed');

            const district = await response.json();
            
            // Auto-select the detected district
            document.getElementById('stateSelect').value = district.state_code;
            await this.onStateChange(district.state_code);
            
            // Wait for districts to load then select the detected one
            setTimeout(() => {
                document.getElementById('districtSelect').value = district.district_code;
                this.showSuccess(`${this.translate('location_detected')}: ${district[`district_name_${this.currentLanguage}`]}`);
            }, 1000);

        } catch (error) {
            console.error('Error in reverse geocoding:', error);
            this.showError(this.translate('reverse_geocode_error'));
        }
    }

    changeLanguage(lang) {
        this.currentLanguage = lang;
        this.updateUIText();
        this.populateStateDropdown();
        
        if (this.districts.length > 0) {
            this.populateDistrictDropdown();
        }
        
        // Refresh dashboard if data is already loaded
        const districtSelect = document.getElementById('districtSelect');
        if (districtSelect.value) {
            this.fetchDistrictData();
        }
    }

    updateUIText() {
        const translations = this.getTranslations();
        
        // Update all UI elements directly by ID
        const elements = {
            'appTitle': 'app_title',
            'appSubtitle': 'app_subtitle',
            'selectDistrictTitle': 'select_your_district',
            'stateLabel': 'select_state',
            'districtLabel': 'select_district'
        };

        Object.keys(elements).forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = translations[elements[elementId]];
            }
        });

        // Update button texts
        const fetchButton = document.getElementById('fetchData');
        const locationButton = document.getElementById('useLocation');
        if (fetchButton) fetchButton.textContent = translations.view_data;
        if (locationButton) locationButton.textContent = translations.use_my_location;

        // Update dropdown placeholders
        const stateSelect = document.getElementById('stateSelect');
        if (stateSelect && stateSelect.options.length > 0) {
            stateSelect.options[0].text = translations.select_state;
        }
        
        const districtSelect = document.getElementById('districtSelect');
        if (districtSelect && districtSelect.options.length > 0) {
            districtSelect.options[0].text = translations.select_district;
        }
    }

    translate(key) {
        const translations = this.getTranslations();
        return translations[key] || key;
    }

    getTranslations() {
        const translations = {
            hi: {
                // App texts
                'app_title': 'हमारी आवाज़, हमारे अधिकार',
                'app_subtitle': 'MGNREGA जिला प्रदर्शन डैशबोर्ड',
                'select_your_district': 'अपना जिला चुनें',
                'select_state': 'राज्य चुनें',
                'select_district': 'जिला चुनें',
                'use_my_location': 'मेरा स्थान इस्तेमाल करें',
                'view_data': 'डेटा देखें',
                
                // Existing translations
                'loading_districts': 'जिले लोड हो रहे हैं',
                'loading_data': 'डेटा लोड हो रहा है',
                'error_loading_states': 'राज्य लोड करने में त्रुटि',
                'error_loading_districts': 'जिले लोड करने में त्रुटि',
                'error_loading_data': 'डेटा लोड करने में त्रुटि',
                'select_district_first': 'कृपया पहले जिला चुनें',
                'no_data_available': 'कोई डेटा उपलब्ध नहीं है',
                'try_another_district': 'कृपया कोई अन्य जिला चुनें',
                'latest_data': 'नवीनतम डेटा',
                'households_worked': 'काम करने वाले परिवार',
                'person_days': 'व्यक्ति-दिवस',
                'wages_paid': 'भुगतान की गई मजदूरी',
                'works_completed': 'पूरे किए गए कार्य',
                'historical_data': 'ऐतिहासिक डेटा',
                'no_historical_data': 'कोई ऐतिहासिक डेटा उपलब्ध नहीं',
                'households': 'परिवार',
                'days': 'दिन',
                'geolocation_not_supported': 'आपका ब्राउज़र स्थान सेवाओं का समर्थन नहीं करता है',
                'detecting_location': 'स्थान का पता लगाया जा रहा है...',
                'location_error': 'स्थान प्राप्त करने में त्रुटि',
                'location_permission_denied': 'स्थान की अनुमति अस्वीकार की गई',
                'location_unavailable': 'स्थान जानकारी उपलब्ध नहीं',
                'location_timeout': 'स्थान प्राप्त करने में समय समाप्त',
                'location_detected': 'स्थान पता चला',
                'reverse_geocode_error': 'स्थान पहचानने में त्रुटि',
                'refresh': 'रिफ्रेश',
                'data_source': 'डेटा स्रोत',
                'avg_days_per_household': 'प्रति परिवार औसत दिन',
                'completion_rate': 'पूर्णता दर',
                'performance_indicators': 'प्रदर्शन संकेतक',
                'refresh_data': 'डेटा रिफ्रेश करें',
                'refreshing_data': 'डेटा रिफ्रेश हो रहा है...',
                'data_refreshed': 'डेटा रिफ्रेश हो गया',
                'refresh_failed': 'रिफ्रेश विफल',
                'wages': 'मजदूरी'
            },
            en: {
                // App texts
                'app_title': 'Our Voice, Our Rights',
                'app_subtitle': 'MGNREGA District Performance Dashboard',
                'select_your_district': 'Select Your District',
                'select_state': 'Select State',
                'select_district': 'Select District',
                'use_my_location': 'Use My Location',
                'view_data': 'View Data',
                
                // Existing translations
                'select_state': 'Select State',
                'select_district': 'Select District',
                'loading_districts': 'Loading districts',
                'loading_data': 'Loading data',
                'error_loading_states': 'Error loading states',
                'error_loading_districts': 'Error loading districts',
                'error_loading_data': 'Error loading data',
                'select_district_first': 'Please select a district first',
                'no_data_available': 'No data available',
                'try_another_district': 'Please try another district',
                'latest_data': 'Latest Data',
                'households_worked': 'Households Worked',
                'person_days': 'Person Days',
                'wages_paid': 'Wages Paid',
                'works_completed': 'Works Completed',
                'historical_data': 'Historical Data',
                'no_historical_data': 'No historical data available',
                'households': 'Households',
                'days': 'Days',
                'geolocation_not_supported': 'Your browser does not support geolocation',
                'detecting_location': 'Detecting your location...',
                'location_error': 'Error getting location',
                'location_permission_denied': 'Location permission denied',
                'location_unavailable': 'Location information unavailable',
                'location_timeout': 'Location request timeout',
                'location_detected': 'Location detected',
                'reverse_geocode_error': 'Error identifying location',
                'refresh': 'Refresh',
                'data_source': 'Data Source',
                'avg_days_per_household': 'Avg Days per Household',
                'completion_rate': 'Completion Rate',
                'performance_indicators': 'Performance Indicators',
                'refresh_data': 'Refresh Data',
                'refreshing_data': 'Refreshing data...',
                'data_refreshed': 'Data refreshed',
                'refresh_failed': 'Refresh failed',
                'wages': 'Wages'
            }
        };

        return translations[this.currentLanguage] || translations.en;
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showLoading(message) {
        this.showMessage(message, 'loading');
    }

    showMessage(message, type = 'info') {
        // Remove existing message
        const existingMessage = document.querySelector('.message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.textContent = message;
        
        // Add styles
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            max-width: 300px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            ${type === 'error' ? 'background: #e74c3c;' : ''}
            ${type === 'success' ? 'background: #27ae60;' : ''}
            ${type === 'loading' ? 'background: #3498db;' : ''}
            ${type === 'info' ? 'background: #f39c12;' : ''}
        `;

        document.body.appendChild(messageDiv);

        // Auto remove after 5 seconds (except for loading)
        if (type !== 'loading') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 5000);
        }

        return messageDiv;
    }
}

// Create global instance
const dashboard = new MGNREGADashboard();