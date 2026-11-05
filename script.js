/**
 * ============================================================================
 * SMART TEMPERATURE ANALYZER & CONVERTER WITH INTELLIGENT ALERTS
 * Student: Akshaya (Register No: URK26AI1052)
 * Department: Artificial Intelligence & Data Science
 * Standard: C99 Micro Project Web Demonstration
 * ============================================================================
 */

(function () {
    'use strict';

    /* --- Physical Constants (Absolute Zero Thresholds) --- */
    const ABS_ZERO_CELSIUS = -273.15;
    const ABS_ZERO_FAHRENHEIT = -459.67;
    const ABS_ZERO_KELVIN = 0.0;

    /* --- State Management --- */
    const STATE = {
        currentUnit: 'C',
        history: [],
        showAllHistory: false,
        soundEnabled: true,
        categoryChart: null,
        trendChart: null,
        lastAnalyzedRecord: null
    };

    /* --- Category Definitions & Configuration --- */
    const CATEGORIES = {
        FREEZING: {
            id: 'freezing',
            name: 'Freezing',
            rangeText: '0°C or below',
            color: '#38bdf8',
            alert: 'Very cold temperature detected.',
            subtext: 'Severe freeze hazard detected. Risk of frost and icing conditions. Protective heating active.',
            theme: 'low',
            icon: 'fa-snowflake'
        },
        COLD: {
            id: 'cold',
            name: 'Cold',
            rangeText: 'Above 0°C to 15°C',
            color: '#06b6d4',
            alert: 'Low temperature detected.',
            subtext: 'Chilly environmental temperature detected. Ambient room heating recommended for comfort.',
            theme: 'low',
            icon: 'fa-temperature-low'
        },
        NORMAL: {
            id: 'normal',
            name: 'Normal',
            rangeText: 'Above 15°C to 25°C',
            color: '#10b981',
            alert: 'Temperature is in the normal project-defined range.',
            subtext: 'Comfortable thermodynamic equilibrium. Ideal environmental condition without HVAC intervention.',
            theme: 'medium',
            icon: 'fa-shield-halved'
        },
        WARM: {
            id: 'warm',
            name: 'Warm',
            rangeText: 'Above 25°C to 35°C',
            color: '#f59e0b',
            alert: 'Warm temperature detected.',
            subtext: 'Elevated temperature detected. Consider passive air circulation and adequate hydration.',
            theme: 'high',
            icon: 'fa-sun'
        },
        HOT: {
            id: 'hot',
            name: 'Hot',
            rangeText: 'Above 35°C',
            color: '#ef4444',
            alert: 'High temperature detected.',
            subtext: 'Excessive thermal intensity alert! Heat caution advisory in effect. Active cooling required.',
            theme: 'high',
            icon: 'fa-fire'
        }
    };

    /* --- Audio Synthesizer (Zero-asset Web Audio API) --- */
    class SoundSynth {
        constructor() {
            this.ctx = null;
        }

        init() {
            if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioContextClass();
            }
        }

        playTone(freq, type = 'sine', duration = 0.12, gainVal = 0.08) {
            if (!STATE.soundEnabled) return;
            try {
                this.init();
                if (!this.ctx) return;
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }

                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

                gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start();
                osc.stop(this.ctx.currentTime + duration);
            } catch (e) {
                // Audio autoplay restriction silent fallback
            }
        }

        beepSuccess() {
            this.playTone(660, 'sine', 0.1, 0.06);
            setTimeout(() => this.playTone(880, 'sine', 0.15, 0.08), 80);
        }

        beepAlert(theme) {
            if (theme === 'high') {
                this.playTone(440, 'triangle', 0.12, 0.1);
                setTimeout(() => this.playTone(880, 'triangle', 0.2, 0.12), 120);
            } else if (theme === 'low') {
                this.playTone(520, 'sine', 0.2, 0.08);
            } else {
                this.playTone(600, 'sine', 0.12, 0.06);
            }
        }

        beepError() {
            this.playTone(220, 'sawtooth', 0.25, 0.1);
        }
    }

    const sound = new SoundSynth();

    /* ========================================================================
       CORE CONVERSION & VALIDATION ENGINE
       ======================================================================== */

    /**
     * Requirement 4: Smart Input Validation
     * Returns an object { valid: boolean, errorTitle: string, errorDesc: string }
     */
    function validateInput(rawInput, unit) {
        if (rawInput === '' || rawInput === null || rawInput === undefined) {
            return {
                valid: false,
                errorTitle: 'EMPTY INPUT DETECTED!',
                errorDesc: 'Please enter a numeric temperature value before analyzing.'
            };
        }

        const temp = parseFloat(rawInput);
        if (isNaN(temp)) {
            return {
                valid: false,
                errorTitle: 'NON-NUMERIC INPUT!',
                errorDesc: 'Invalid characters entered. Please provide a standard numerical value.'
            };
        }

        // Absolute zero boundary checks
        if (unit === 'C' && temp < ABS_ZERO_CELSIUS) {
            return {
                valid: false,
                errorTitle: 'INVALID TEMPERATURE!',
                errorDesc: `Temperature cannot be below absolute zero. Minimum for Celsius is ${ABS_ZERO_CELSIUS}°C.`
            };
        }

        if (unit === 'F' && temp < ABS_ZERO_FAHRENHEIT) {
            return {
                valid: false,
                errorTitle: 'INVALID TEMPERATURE!',
                errorDesc: `Temperature cannot be below absolute zero. Minimum for Fahrenheit is ${ABS_ZERO_FAHRENHEIT}°F.`
            };
        }

        if (unit === 'K' && temp < ABS_ZERO_KELVIN) {
            return {
                valid: false,
                errorTitle: 'INVALID TEMPERATURE!',
                errorDesc: `Temperature cannot be below absolute zero. Minimum for Kelvin is ${ABS_ZERO_KELVIN} K.`
            };
        }

        return { valid: true, value: temp };
    }

    /**
     * Requirement 3: Temperature Conversion Module
     * Accurate mathematical conversion formulas across all 3 scales.
     */
    function convertTemperatures(inputVal, unit) {
        let c, f, k;

        if (unit === 'C') {
            c = inputVal;
            f = (inputVal * 9 / 5) + 32;
            k = inputVal + 273.15;
        } else if (unit === 'F') {
            c = (inputVal - 32) * 5 / 9;
            f = inputVal;
            k = c + 273.15;
        } else if (unit === 'K') {
            c = inputVal - 273.15;
            f = (c * 9 / 5) + 32;
            k = inputVal;
        }

        // Clamp floating precision irregularities near absolute zero
        if (k < 0 && Math.abs(k) < 0.0001) k = 0;

        return {
            celsius: roundTo2(c),
            fahrenheit: roundTo2(f),
            kelvin: roundTo2(k)
        };
    }

    /**
     * Requirement 5: Temperature Analysis
     * Classifies temperature into Freezing, Cold, Normal, Warm, or Hot based on Celsius value.
     */
    function classifyTemperature(celsius) {
        if (celsius <= 0.0) {
            return CATEGORIES.FREEZING;
        } else if (celsius > 0.0 && celsius <= 15.0) {
            return CATEGORIES.COLD;
        } else if (celsius > 15.0 && celsius <= 25.0) {
            return CATEGORIES.NORMAL;
        } else if (celsius > 25.0 && celsius <= 35.0) {
            return CATEGORIES.WARM;
        } else {
            return CATEGORIES.HOT;
        }
    }

    function roundTo2(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    function formatTimestamp(date = new Date()) {
        const pad = (n) => String(n).padStart(2, '0');
        const yyyy = date.getFullYear();
        const mm = pad(date.getMonth() + 1);
        const dd = pad(date.getDate());
        const hh = pad(date.getHours());
        const min = pad(date.getMinutes());
        const ss = pad(date.getSeconds());
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    }

    /* ========================================================================
       REQUIREMENT 16: DYNAMIC DISPLAY AMBIENT THEME SYSTEM
       "if temprature is high the whole display should change into red"
       "if temprature is medium whole display should be in any mild colour"
       "if temprature is low whole display should be in blue colour"
       ======================================================================== */

    function applyDynamicDisplayTheme(category, notifyUser = true) {
        const body = document.body;
        const themeStatusText = document.getElementById('theme-status-text');
        const themeAnnouncerText = document.getElementById('theme-announcer-text');
        const ambientModeText = document.getElementById('ambient-mode-text');

        // Remove previous dynamic display theme classes
        body.classList.remove('theme-display-low', 'theme-display-medium', 'theme-display-high');

        let message = '';

        if (category.theme === 'low') {
            // LOW TEMPERATURE (<= 15°C): WHOLE DISPLAY TURNS BLUE
            body.classList.add('theme-display-low');
            if (themeStatusText) themeStatusText.textContent = 'Display: Low (Blue)';
            message = `Low Temperature (${category.name}) detected: Whole display transformed into Frost Blue ambiance.`;
            if (ambientModeText) ambientModeText.textContent = 'Display Mode: Low Chilled (Blue Ambiance)';
        } else if (category.theme === 'medium') {
            // MEDIUM TEMPERATURE (15°C - 25°C): WHOLE DISPLAY TURNS MILD (Comfortable Mild Emerald/Teal)
            body.classList.add('theme-display-medium');
            if (themeStatusText) themeStatusText.textContent = 'Display: Medium (Mild)';
            message = `Medium Temperature (${category.name}) detected: Whole display transformed into Mild Comfortable ambiance.`;
            if (ambientModeText) ambientModeText.textContent = 'Display Mode: Medium Mild (Balanced Emerald)';
        } else if (category.theme === 'high') {
            // HIGH TEMPERATURE (> 25°C): WHOLE DISPLAY TURNS RED
            body.classList.add('theme-display-high');
            if (themeStatusText) themeStatusText.textContent = 'Display: High (Red)';
            message = `High Temperature (${category.name}) detected: Whole display transformed into Glowing Crimson Red alert ambiance.`;
            if (ambientModeText) ambientModeText.textContent = 'Display Mode: High Heat (Red Glow Alert)';
        }

        if (themeAnnouncerText) {
            themeAnnouncerText.textContent = message;
        }

        // Update animated hero dial border/glow
        const heroDial = document.querySelector('.hero-dial');
        if (heroDial) {
            heroDial.style.borderColor = category.color;
            heroDial.style.boxShadow = `0 0 35px ${category.color}88`;
        }
    }

    /* ========================================================================
       UI UPDATE & DASHBOARD RENDERING
       ======================================================================== */

    function renderAnalysis(record, isNew = true) {
        STATE.lastAnalyzedRecord = record;

        // 1. Converted scale cards
        const cValElem = document.getElementById('res-val-c');
        const fValElem = document.getElementById('res-val-f');
        const kValElem = document.getElementById('res-val-k');

        if (cValElem) cValElem.textContent = `${record.celsius.toFixed(2)} °C`;
        if (fValElem) fValElem.textContent = `${record.fahrenheit.toFixed(2)} °F`;
        if (kValElem) kValElem.textContent = `${record.kelvin.toFixed(2)} K`;

        // 2. Animated Thermometer Readout
        const readoutHero = document.getElementById('readout-hero-val');
        const readoutEquiv = document.getElementById('readout-equiv-str');
        if (readoutHero) {
            readoutHero.innerHTML = `${record.celsius.toFixed(2)} <span class="readout-unit">°C</span>`;
        }
        if (readoutEquiv) {
            readoutEquiv.textContent = `${record.fahrenheit.toFixed(2)} °F • ${record.kelvin.toFixed(2)} K`;
        }

        // Hero gauge sync
        const heroDialTemp = document.getElementById('hero-dial-temp');
        const heroDialStatus = document.getElementById('hero-dial-status');
        if (heroDialTemp) heroDialTemp.textContent = `${record.celsius.toFixed(1)}°C`;
        if (heroDialStatus) {
            heroDialStatus.textContent = record.category.name.toUpperCase();
            heroDialStatus.style.color = record.category.color;
        }

        // 3. Category Badge & Pill
        const liveCatPill = document.getElementById('live-cat-pill');
        const liveCatName = document.getElementById('live-cat-name');
        const liveCatDetail = document.getElementById('live-cat-detail');

        if (liveCatPill && liveCatName && liveCatDetail) {
            liveCatPill.className = `cat-pill cat-${record.category.id}`;
            liveCatName.textContent = record.category.name;
            liveCatDetail.textContent = `Range: ${record.category.rangeText}`;
        }

        // 4. Intelligent Alert Banner (Requirement 6)
        const alertCard = document.getElementById('intelligent-alert-card');
        const alertHeadline = document.getElementById('alert-headline-text');
        const alertSubtext = document.getElementById('alert-subtext-detail');
        const alertBadge = document.getElementById('alert-severity-badge');
        const alertIcon = document.getElementById('alert-main-icon');
        const alertTimestamp = document.getElementById('alert-timestamp-display');

        if (alertCard && alertHeadline) {
            alertCard.className = `glass-card intelligent-alert-card alert-state-${record.category.id}`;
            alertHeadline.textContent = record.category.alert;
            if (alertSubtext) alertSubtext.textContent = record.category.subtext;
            if (alertBadge) alertBadge.textContent = `${record.category.name.toUpperCase()} ALERT`;
            if (alertIcon) alertIcon.className = `fa-solid ${record.category.icon}`;
            if (alertTimestamp) alertTimestamp.innerHTML = `<i class="fa-regular fa-clock"></i> ${record.timestamp}`;
        }

        // 5. Animated Thermometer Column Height & Color
        updateThermometer(record.celsius, record.category);

        // 6. Dynamic Display Theme Shift (Requirement 16)
        applyDynamicDisplayTheme(record.category);

        // Play audio chime
        if (isNew) {
            sound.beepAlert(record.category.theme);
        }
    }

    /**
     * Requirement 13: Animated Thermometer
     * Calculates realistic mercury column height based on temperature scale (-50°C to 110°C)
     */
    function updateThermometer(celsius, category) {
        const mercury = document.getElementById('mercury-column');
        const bulb = document.getElementById('thermo-bulb');
        if (!mercury || !bulb) return;

        // Map scale: -50°C = 5%, 0°C = 25%, 21°C = 46%, 100°C = 95%
        let percent;
        if (celsius <= -50) {
            percent = 4;
        } else if (celsius <= 0) {
            percent = 5 + ((celsius + 50) / 50) * 20; // 5% to 25%
        } else if (celsius <= 100) {
            percent = 25 + (celsius / 100) * 70; // 25% to 95%
        } else {
            percent = 98;
        }

        mercury.style.height = `${Math.min(99, Math.max(3, percent))}%`;

        // Update liquid mercury gradient & glow
        if (category.theme === 'low') {
            mercury.style.background = 'linear-gradient(to top, #1e3a8a, #38bdf8)';
            bulb.style.background = 'radial-gradient(circle at 35% 35%, #ffffff 0%, #38bdf8 50%, #1e3a8a 100%)';
            bulb.style.boxShadow = '0 0 25px rgba(56, 189, 248, 0.6)';
        } else if (category.theme === 'medium') {
            mercury.style.background = 'linear-gradient(to top, #065f46, #10b981)';
            bulb.style.background = 'radial-gradient(circle at 35% 35%, #ffffff 0%, #10b981 50%, #065f46 100%)';
            bulb.style.boxShadow = '0 0 25px rgba(16, 185, 129, 0.6)';
        } else {
            mercury.style.background = 'linear-gradient(to top, #991b1b, #ef4444)';
            bulb.style.background = 'radial-gradient(circle at 35% 35%, #ffffff 0%, #ef4444 50%, #991b1b 100%)';
            bulb.style.boxShadow = '0 0 25px rgba(239, 68, 68, 0.6)';
        }
    }

    /* ========================================================================
       REQUIREMENT 7: TEMPERATURE HISTORY & LOCALSTORAGE
       ======================================================================== */

    const STORAGE_KEY = 'smart_temp_analyzer_records_v1';

    function loadHistoryFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    STATE.history = parsed;
                    return;
                }
            }
        } catch (e) {
            console.warn('Unable to load history from localStorage:', e);
        }

        // Initial default benchmark samples if empty (provides a gorgeous initial dashboard)
        STATE.history = [
            createRecord(25.0, 'C', '2026-11-03 14:00:15'),
            createRecord(40.5, 'C', '2026-11-03 14:15:30'),
            createRecord(10.0, 'C', '2026-11-03 14:22:45'),
            createRecord(-15.0, 'C', '2026-11-03 14:35:10'),
            createRecord(30.0, 'C', '2026-11-03 14:45:00')
        ];
        saveHistoryToStorage();
    }

    function saveHistoryToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE.history));
        } catch (e) {
            console.warn('Unable to save history to localStorage:', e);
        }
    }

    function createRecord(inputVal, unit, customTime = null) {
        const conversions = convertTemperatures(inputVal, unit);
        const category = classifyTemperature(conversions.celsius);

        return {
            id: STATE.history.length + 1,
            timestamp: customTime || formatTimestamp(),
            inputVal: roundTo2(inputVal),
            inputUnit: unit,
            celsius: conversions.celsius,
            fahrenheit: conversions.fahrenheit,
            kelvin: conversions.kelvin,
            category: category,
            alertMsg: category.alert
        };
    }

    function addRecordToHistory(record) {
        STATE.history.unshift(record);
        // Normalize IDs
        for (let i = 0; i < STATE.history.length; i++) {
            STATE.history[i].id = STATE.history.length - i;
        }
        saveHistoryToStorage();
        renderHistoryTable();
        renderStatistics();
    }

    function renderHistoryTable() {
        const tbody = document.getElementById('history-table-body');
        const emptyState = document.getElementById('history-empty-state');
        const countLabel = document.getElementById('history-count-label');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (STATE.history.length === 0) {
            if (emptyState) emptyState.classList.remove('hidden');
            if (countLabel) countLabel.textContent = 'No records in database';
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        // Requirement 7: Display the latest five readings (or all if toggle is on)
        const recordsToDisplay = STATE.showAllHistory 
            ? STATE.history 
            : STATE.history.slice(0, 5);

        if (countLabel) {
            countLabel.innerHTML = `<i class="fa-solid fa-database"></i> Showing ${recordsToDisplay.length} of ${STATE.history.length} total logged readings`;
        }

        recordsToDisplay.forEach((rec) => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
                <td class="table-cell-id">#${rec.id}</td>
                <td class="table-cell-time">${rec.timestamp}</td>
                <td class="table-cell-val"><strong>${rec.inputVal.toFixed(2)}</strong> &deg;${rec.inputUnit}</td>
                <td class="table-cell-val">${rec.celsius.toFixed(2)} &deg;C</td>
                <td class="table-cell-val">${rec.fahrenheit.toFixed(2)} &deg;F</td>
                <td class="table-cell-val">${rec.kelvin.toFixed(2)} K</td>
                <td>
                    <span class="cat-pill cat-${rec.category.id}" style="padding: 0.2rem 0.6rem; font-size: 0.75rem;">
                        <i class="fa-solid ${rec.category.icon}"></i> ${rec.category.name}
                    </span>
                </td>
                <td style="font-size: 0.82rem; color: var(--text-secondary); max-width: 220px;">
                    ${rec.alertMsg}
                </td>
                <td>
                    <button class="table-row-btn btn-reload-rec" data-rec-id="${rec.id}" title="Re-load into analyzer">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Load
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Attach event listeners to Load buttons
        tbody.querySelectorAll('.btn-reload-rec').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.getAttribute('data-rec-id'), 10);
                const found = STATE.history.find((r) => r.id === id);
                if (found) {
                    loadRecordIntoAnalyzer(found);
                    showToast(`Loaded reading #${id} (${found.inputVal}°${found.inputUnit})`, 'info');
                }
            });
        });
    }

    function loadRecordIntoAnalyzer(record) {
        // Set unit
        setUnit(record.inputUnit);
        const tempInput = document.getElementById('temp-input');
        if (tempInput) {
            tempInput.value = record.inputVal;
        }
        hideValidationError();
        renderAnalysis(record, false);
        // Scroll to converter smoothly
        const convSection = document.getElementById('converter');
        if (convSection) {
            convSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    function clearHistory() {
        if (STATE.history.length === 0) {
            showToast('History log is already empty.', 'info');
            return;
        }

        if (confirm('Are you sure you want to clear all recorded temperature readings?')) {
            STATE.history = [];
            saveHistoryToStorage();
            renderHistoryTable();
            renderStatistics();
            showToast('All temperature history successfully cleared.', 'success');
            sound.beepSuccess();
        }
    }

    /* ========================================================================
       REQUIREMENT 8: TEMPERATURE STATISTICS & CHARTS
       ======================================================================== */

    function renderStatistics() {
        const totalElem = document.getElementById('stat-total-count');
        const highestElem = document.getElementById('stat-highest-temp');
        const highestSub = document.getElementById('stat-highest-sub');
        const lowestElem = document.getElementById('stat-lowest-temp');
        const lowestSub = document.getElementById('stat-lowest-sub');
        const avgElem = document.getElementById('stat-avg-temp');
        const avgSub = document.getElementById('stat-avg-sub');

        if (!totalElem) return;

        const count = STATE.history.length;
        totalElem.textContent = count;

        if (count === 0) {
            if (highestElem) highestElem.textContent = '--';
            if (highestSub) highestSub.textContent = 'No data yet';
            if (lowestElem) lowestElem.textContent = '--';
            if (lowestSub) lowestSub.textContent = 'No data yet';
            if (avgElem) avgElem.textContent = '--';
            if (avgSub) avgSub.textContent = 'Arithmetic Mean (°C)';
            updateCharts([], {});
            return;
        }

        let maxC = -Infinity;
        let minC = Infinity;
        let sumC = 0;
        const catDistribution = {
            Freezing: 0,
            Cold: 0,
            Normal: 0,
            Warm: 0,
            Hot: 0
        };

        STATE.history.forEach((rec) => {
            const c = rec.celsius;
            if (c > maxC) maxC = c;
            if (c < minC) minC = c;
            sumC += c;

            if (rec.category && rec.category.name) {
                catDistribution[rec.category.name] = (catDistribution[rec.category.name] || 0) + 1;
            }
        });

        const avgC = sumC / count;

        if (highestElem) highestElem.textContent = `${maxC.toFixed(2)} °C`;
        if (highestSub) highestSub.textContent = `${((maxC * 9 / 5) + 32).toFixed(1)}°F • ${(maxC + 273.15).toFixed(1)} K`;

        if (lowestElem) lowestElem.textContent = `${minC.toFixed(2)} °C`;
        if (lowestSub) lowestSub.textContent = `${((minC * 9 / 5) + 32).toFixed(1)}°F • ${(minC + 273.15).toFixed(1)} K`;

        if (avgElem) avgElem.textContent = `${avgC.toFixed(2)} °C`;
        if (avgSub) avgSub.textContent = `Calculated across ${count} entries`;

        // Update Charts
        updateCharts(STATE.history, catDistribution);
    }

    /**
     * Requirement 8: Chart.js Visualizations
     */
    function updateCharts(historyRecords, distribution) {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js CDN not yet available. Retrying shortly...');
            return;
        }

        // 1. Doughnut Chart: Category Distribution
        const catCtx = document.getElementById('categoryChart');
        if (catCtx) {
            const dataCounts = [
                distribution.Freezing || 0,
                distribution.Cold || 0,
                distribution.Normal || 0,
                distribution.Warm || 0,
                distribution.Hot || 0
            ];

            const colors = [
                CATEGORIES.FREEZING.color,
                CATEGORIES.COLD.color,
                CATEGORIES.NORMAL.color,
                CATEGORIES.WARM.color,
                CATEGORIES.HOT.color
            ];

            if (STATE.categoryChart) {
                STATE.categoryChart.data.datasets[0].data = dataCounts;
                STATE.categoryChart.update();
            } else {
                STATE.categoryChart = new Chart(catCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Freezing (<=0°C)', 'Cold (0-15°C)', 'Normal (15-25°C)', 'Warm (25-35°C)', 'Hot (>35°C)'],
                        datasets: [{
                            data: dataCounts,
                            backgroundColor: colors,
                            borderColor: '#060c18',
                            borderWidth: 2,
                            hoverOffset: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                backgroundColor: 'rgba(6, 12, 24, 0.95)',
                                titleFont: { family: 'Outfit', size: 13 },
                                bodyFont: { family: 'Inter', size: 12 },
                                padding: 10,
                                cornerRadius: 8
                            }
                        },
                        cutout: '70%'
                    }
                });
            }

            // Custom HTML legend
            const legendContainer = document.getElementById('custom-chart-legend');
            if (legendContainer) {
                const labels = ['Freezing', 'Cold', 'Normal', 'Warm', 'Hot'];
                legendContainer.innerHTML = labels.map((lbl, idx) => `
                    <span class="legend-badge">
                        <span class="legend-dot" style="background:${colors[idx]};"></span>
                        ${lbl}: <strong>${dataCounts[idx]}</strong>
                    </span>
                `).join('');
            }
        }

        // 2. Line Chart: Temperature Chronological Trend
        const trendCtx = document.getElementById('trendChart');
        if (trendCtx) {
            // Chronological order (oldest to newest, max 10 points for elegance)
            const chronological = [...historyRecords].reverse().slice(-10);
            const labels = chronological.map((r, i) => `#${r.id} (${r.inputUnit})`);
            const celsiusData = chronological.map(r => r.celsius);

            if (STATE.trendChart) {
                STATE.trendChart.data.labels = labels;
                STATE.trendChart.data.datasets[0].data = celsiusData;
                STATE.trendChart.update();
            } else {
                STATE.trendChart = new Chart(trendCtx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Celsius Equivalent (°C)',
                            data: celsiusData,
                            borderColor: '#00f0ff',
                            backgroundColor: 'rgba(0, 240, 255, 0.1)',
                            borderWidth: 3,
                            tension: 0.35,
                            fill: true,
                            pointBackgroundColor: '#00f0ff',
                            pointBorderColor: '#ffffff',
                            pointHoverRadius: 6,
                            pointRadius: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: (ctx) => ` Temp: ${ctx.parsed.y} °C`
                                }
                            }
                        },
                        scales: {
                            y: {
                                grid: {
                                    color: 'rgba(255, 255, 255, 0.05)'
                                },
                                ticks: {
                                    color: '#94a3b8',
                                    font: { family: 'JetBrains Mono', size: 11 },
                                    callback: (val) => `${val}°C`
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    color: '#94a3b8',
                                    font: { family: 'JetBrains Mono', size: 10 }
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    /* ========================================================================
       REQUIREMENT 9: DOWNLOAD REPORT & EXPORT SUITE
       ======================================================================== */

    function openPrintableReportModal() {
        const modal = document.getElementById('report-modal');
        const reportTableBody = document.getElementById('report-table-body');
        const rTotal = document.getElementById('r-stat-total');
        const rMax = document.getElementById('r-stat-max');
        const rMin = document.getElementById('r-stat-min');
        const rAvg = document.getElementById('r-stat-avg');
        const rTimestamp = document.getElementById('report-timestamp-val');

        if (!modal || !reportTableBody) return;

        if (rTimestamp) rTimestamp.textContent = formatTimestamp();

        // Calculate stats
        let maxC = -Infinity, minC = Infinity, sumC = 0;
        STATE.history.forEach((rec) => {
            if (rec.celsius > maxC) maxC = rec.celsius;
            if (rec.celsius < minC) minC = rec.celsius;
            sumC += rec.celsius;
        });

        const count = STATE.history.length;
        if (rTotal) rTotal.textContent = count;
        if (rMax) rMax.textContent = count > 0 ? `${maxC.toFixed(2)} °C` : '--';
        if (rMin) rMin.textContent = count > 0 ? `${minC.toFixed(2)} °C` : '--';
        if (rAvg) rAvg.textContent = count > 0 ? `${(sumC / count).toFixed(2)} °C` : '--';

        // Render table
        reportTableBody.innerHTML = '';
        if (count === 0) {
            reportTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:#64748b;">No temperature records available.</td></tr>`;
        } else {
            STATE.history.forEach((r) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#${r.id}</td>
                    <td>${r.timestamp}</td>
                    <td><strong>${r.inputVal.toFixed(2)} &deg;${r.inputUnit}</strong></td>
                    <td>${r.celsius.toFixed(2)} &deg;C</td>
                    <td>${r.fahrenheit.toFixed(2)} &deg;F</td>
                    <td>${r.kelvin.toFixed(2)} K</td>
                    <td>${r.category.name}</td>
                    <td>${r.alertMsg}</td>
                `;
                reportTableBody.appendChild(tr);
            });
        }

        modal.classList.remove('hidden');
    }

    function closePrintableReportModal() {
        const modal = document.getElementById('report-modal');
        if (modal) modal.classList.add('hidden');
    }

    function exportCsvReport() {
        if (STATE.history.length === 0) {
            showToast('No records available to export!', 'error');
            return;
        }

        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'Record_ID,Timestamp,Input_Value,Input_Unit,Celsius_C,Fahrenheit_F,Kelvin_K,Category,Alert_Message\r\n';

        STATE.history.forEach((r) => {
            const row = [
                r.id,
                `"${r.timestamp}"`,
                r.inputVal,
                r.inputUnit,
                r.celsius,
                r.fahrenheit,
                r.kelvin,
                `"${r.category.name}"`,
                `"${r.alertMsg.replace(/"/g, '""')}"`
            ];
            csvContent += row.join(',') + '\r\n';
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `temperature_audit_report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('CSV Report successfully downloaded!', 'success');
        sound.beepSuccess();
    }

    function exportCTxtReport() {
        if (STATE.history.length === 0) {
            showToast('No records available to export!', 'error');
            return;
        }

        let maxC = -Infinity, minC = Infinity, sumC = 0;
        const catDistribution = { Freezing: 0, Cold: 0, Normal: 0, Warm: 0, Hot: 0 };

        STATE.history.forEach((rec) => {
            if (rec.celsius > maxC) maxC = rec.celsius;
            if (rec.celsius < minC) minC = rec.celsius;
            sumC += rec.celsius;
            catDistribution[rec.category.name] = (catDistribution[rec.category.name] || 0) + 1;
        });

        const count = STATE.history.length;
        const avgC = sumC / count;

        let content = '===============================================================================\n';
        content += '           SMART TEMPERATURE ANALYZER & CONVERTER - AUDIT REPORT              \n';
        content += '===============================================================================\n';
        content += `Generated On : ${formatTimestamp()}\n`;
        content += 'Student Name : Akshaya | Register Number: URK26AI1052\n';
        content += 'Project Type : College C Programming Micro Project\n';
        content += `Total Logs   : ${count} Records\n`;
        content += '===============================================================================\n\n';
        content += 'ID   | Timestamp            | Input Value  | Celsius    | Fahrenheit | Kelvin     | Category  \n';
        content += '-------------------------------------------------------------------------------\n';

        STATE.history.forEach((r) => {
            const idStr = `#${r.id}`.padEnd(4);
            const timeStr = r.timestamp.padEnd(20);
            const inStr = `${r.inputVal.toFixed(2)} ${r.inputUnit}`.padStart(12);
            const cStr = `${r.celsius.toFixed(2)} C`.padStart(10);
            const fStr = `${r.fahrenheit.toFixed(2)} F`.padStart(10);
            const kStr = `${r.kelvin.toFixed(2)} K`.padStart(10);
            const catStr = r.category.name.padEnd(10);
            content += `${idStr} | ${timeStr} | ${inStr} | ${cStr} | ${fStr} | ${kStr} | ${catStr}\n`;
        });

        content += '-------------------------------------------------------------------------------\n\n';
        content += 'SUMMARY ANALYTICAL STATISTICS:\n';
        content += `- Average Temperature: ${avgC.toFixed(2)} C\n`;
        content += `- Maximum Temperature: ${maxC.toFixed(2)} C\n`;
        content += `- Minimum Temperature: ${minC.toFixed(2)} C\n`;
        content += `- Distribution: Freezing=${catDistribution.Freezing}, Cold=${catDistribution.Cold}, Normal=${catDistribution.Normal}, Warm=${catDistribution.Warm}, Hot=${catDistribution.Hot}\n`;
        content += '\n================================ END OF REPORT ================================\n';

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'temperature_report.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Exported C-compatible report to temperature_report.txt', 'success');
        sound.beepSuccess();
    }

    /* ========================================================================
       TOAST NOTIFICATIONS
       ======================================================================== */

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        let icon = 'fa-circle-info';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s forwards';
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3200);
    }

    /* ========================================================================
       INPUT VALIDATION FEEDBACK DISPLAY
       ======================================================================== */

    function showValidationError(title, desc) {
        const box = document.getElementById('validation-msg-box');
        const titleEl = document.getElementById('val-error-title');
        const descEl = document.getElementById('val-error-desc');
        const input = document.getElementById('temp-input');

        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = desc;

        if (box) box.classList.remove('hidden');
        if (input) {
            input.classList.add('input-invalid');
            input.focus();
        }

        sound.beepError();
    }

    function hideValidationError() {
        const box = document.getElementById('validation-msg-box');
        const input = document.getElementById('temp-input');
        if (box) box.classList.add('hidden');
        if (input) input.classList.remove('input-invalid');
    }

    /* ========================================================================
       EVENT LISTENERS & BINDINGS
       ======================================================================== */

    function setUnit(unit) {
        STATE.currentUnit = unit;

        // Update radio selectors
        document.querySelectorAll('input[name="temp-unit"]').forEach((radio) => {
            radio.checked = (radio.value === unit);
            const parent = radio.closest('.unit-pill');
            if (parent) {
                if (radio.value === unit) {
                    parent.classList.add('active');
                } else {
                    parent.classList.remove('active');
                }
            }
        });

        // Update suffix & limit hints
        const unitSuffix = document.getElementById('current-unit-display');
        const limitVal = document.getElementById('limit-val');

        if (unit === 'C') {
            if (unitSuffix) unitSuffix.textContent = '°C';
            if (limitVal) limitVal.textContent = `${ABS_ZERO_CELSIUS} °C`;
        } else if (unit === 'F') {
            if (unitSuffix) unitSuffix.textContent = '°F';
            if (limitVal) limitVal.textContent = `${ABS_ZERO_FAHRENHEIT} °F`;
        } else if (unit === 'K') {
            if (unitSuffix) unitSuffix.textContent = 'K';
            if (limitVal) limitVal.textContent = `${ABS_ZERO_KELVIN} K`;
        }

        hideValidationError();
    }

    function handleConvertAction(autoSave = true) {
        const input = document.getElementById('temp-input');
        if (!input) return;

        const rawValue = input.value.trim();
        const validation = validateInput(rawValue, STATE.currentUnit);

        if (!validation.valid) {
            showValidationError(validation.errorTitle, validation.errorDesc);
            return;
        }

        hideValidationError();

        const record = createRecord(validation.value, STATE.currentUnit);
        renderAnalysis(record, true);

        if (autoSave) {
            addRecordToHistory(record);
            showToast(`Analyzed ${record.inputVal}°${record.inputUnit} -> ${record.celsius}°C (${record.category.name})`, 'success');
        }
    }

    function initEventListeners() {
        // Unit radio clicks
        document.querySelectorAll('input[name="temp-unit"]').forEach((radio) => {
            radio.addEventListener('change', (e) => {
                setUnit(e.target.value);
                sound.playTone(550, 'sine', 0.08, 0.04);
            });
        });

        // Convert Button Click
        const convertBtn = document.getElementById('btn-convert');
        if (convertBtn) {
            convertBtn.addEventListener('click', () => handleConvertAction(true));
        }

        // Enter key on input triggers conversion
        const tempInput = document.getElementById('temp-input');
        if (tempInput) {
            tempInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConvertAction(true);
                }
            });

            // Auto-hide validation error as user types
            tempInput.addEventListener('input', () => {
                hideValidationError();
            });
        }

        // Clear input button
        const clearInputBtn = document.getElementById('btn-clear-input');
        if (clearInputBtn && tempInput) {
            clearInputBtn.addEventListener('click', () => {
                tempInput.value = '';
                tempInput.focus();
                hideValidationError();
            });
        }

        // Reset Button
        const resetBtn = document.getElementById('btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                setUnit('C');
                if (tempInput) tempInput.value = '25';
                hideValidationError();
                handleConvertAction(false);
                showToast('Input reset to default (25°C).', 'info');
                sound.playTone(400, 'sine', 0.1, 0.05);
            });
        }

        // Random Test Sample Button
        const randomBtn = document.getElementById('btn-random-test');
        if (randomBtn && tempInput) {
            randomBtn.addEventListener('click', () => {
                const sampleValues = [-20, -5, 0, 8, 14, 21, 28, 33, 42, 60, 100];
                const randVal = sampleValues[Math.floor(Math.random() * sampleValues.length)];
                setUnit('C');
                tempInput.value = randVal;
                handleConvertAction(true);
            });
        }

        // Quick Presets
        document.querySelectorAll('.preset-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const presetVal = btn.getAttribute('data-preset');
                const presetUnit = btn.getAttribute('data-unit') || 'C';
                setUnit(presetUnit);
                if (tempInput) tempInput.value = presetVal;
                handleConvertAction(true);
            });
        });

        // Requirement 16: Quick Ambient Theme Testers from Hero
        document.querySelectorAll('[data-test-temp]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const testTemp = btn.getAttribute('data-test-temp');
                const testUnit = btn.getAttribute('data-test-unit') || 'C';
                setUnit(testUnit);
                if (tempInput) tempInput.value = testTemp;
                handleConvertAction(true);

                // Scroll to converter
                const conv = document.getElementById('converter');
                if (conv) conv.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // History controls
        const clearHistoryBtn = document.getElementById('btn-clear-history');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', clearHistory);
        }

        const showAllToggle = document.getElementById('show-all-history-toggle');
        if (showAllToggle) {
            showAllToggle.addEventListener('change', (e) => {
                STATE.showAllHistory = e.target.checked;
                renderHistoryTable();
            });
        }

        // Save current reading to log button
        const saveReadingBtn = document.getElementById('btn-save-reading');
        if (saveReadingBtn) {
            saveReadingBtn.addEventListener('click', () => {
                if (STATE.lastAnalyzedRecord) {
                    addRecordToHistory(STATE.lastAnalyzedRecord);
                    showToast('Reading logged to history.', 'success');
                } else {
                    handleConvertAction(true);
                }
            });
        }

        // Report actions
        const downloadReportBtn = document.getElementById('btn-download-report');
        if (downloadReportBtn) {
            downloadReportBtn.addEventListener('click', openPrintableReportModal);
        }

        const heroReportBtn = document.getElementById('hero-report-btn');
        if (heroReportBtn) {
            heroReportBtn.addEventListener('click', openPrintableReportModal);
        }

        const openReportModalBtn = document.getElementById('btn-open-report-modal');
        if (openReportModalBtn) {
            openReportModalBtn.addEventListener('click', openPrintableReportModal);
        }

        const closeModalBtn = document.getElementById('btn-close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', closePrintableReportModal);
        }

        const modalCancelBtn = document.getElementById('btn-modal-cancel');
        if (modalCancelBtn) {
            modalCancelBtn.addEventListener('click', closePrintableReportModal);
        }

        const printActionBtn = document.getElementById('btn-print-action');
        if (printActionBtn) {
            printActionBtn.addEventListener('click', () => {
                window.print();
            });
        }

        // CSV & TXT Export
        const exportCsvBtn = document.getElementById('btn-export-csv');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', exportCsvReport);
        }

        const exportCTxtBtn = document.getElementById('btn-export-c-txt');
        if (exportCTxtBtn) {
            exportCTxtBtn.addEventListener('click', exportCTxtReport);
        }

        // Footer links
        const footerReport = document.getElementById('footer-link-report');
        if (footerReport) footerReport.addEventListener('click', openPrintableReportModal);

        const footerReset = document.getElementById('footer-link-reset');
        if (footerReset) footerReset.addEventListener('click', clearHistory);

        const footerSample = document.getElementById('footer-link-sample');
        if (footerSample) {
            footerSample.addEventListener('click', () => {
                loadHistoryFromStorage();
                renderHistoryTable();
                renderStatistics();
                showToast('Sample benchmark data reloaded.', 'success');
            });
        }

        // Light / Dark Mode Toggle
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme') || 'dark';
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);

                const icon = themeToggleBtn.querySelector('i');
                if (icon) {
                    icon.className = next === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
                }

                showToast(`Switched to ${next.toUpperCase()} mode.`, 'info');
                sound.playTone(700, 'sine', 0.08, 0.04);
            });
        }

        // Sound Toggle Button
        const soundToggleBtn = document.getElementById('sound-toggle-btn');
        if (soundToggleBtn) {
            soundToggleBtn.addEventListener('click', () => {
                STATE.soundEnabled = !STATE.soundEnabled;
                const icon = soundToggleBtn.querySelector('i');
                if (icon) {
                    icon.className = STATE.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
                }
                showToast(STATE.soundEnabled ? 'Audio feedback enabled' : 'Audio feedback muted', 'info');
                if (STATE.soundEnabled) sound.playTone(800, 'sine', 0.1, 0.06);
            });
        }

        // Mobile Menu Toggle
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const navMenu = document.getElementById('nav-menu');
        if (mobileBtn && navMenu) {
            mobileBtn.addEventListener('click', () => {
                navMenu.classList.toggle('mobile-open');
            });

            // Close mobile menu when clicking a link
            navMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => navMenu.classList.remove('mobile-open'));
            });
        }
    }

    /* ========================================================================
       APPLICATION INITIALIZATION
       ======================================================================== */

    function init() {
        loadHistoryFromStorage();
        initEventListeners();

        // Perform initial baseline analysis (25°C - Comfortable Normal)
        const initialRecord = createRecord(25.0, 'C');
        renderAnalysis(initialRecord, false);
        renderHistoryTable();
        renderStatistics();

        console.log('Smart Temperature Analyzer initialized successfully. (Akshaya - URK26AI1052)');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

