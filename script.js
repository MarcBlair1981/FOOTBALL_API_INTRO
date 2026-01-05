/* ===================================
   FOOTBALL API DEMO - JAVASCRIPT
   This file handles all the API logic
   =================================== */

// ===================================
// STEP 1: SET UP YOUR API KEY
// ===================================
const API_KEY = 'df8b404f81fb689192c28b65c73e8ec1';
const API_BASE_URL = 'https://v3.football.api-sports.io';

// ===================================
// STEP 2: GET REFERENCES TO HTML ELEMENTS
// ===================================
const fetchBtn = document.getElementById('fetch-btn');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const errorText = document.getElementById('error-text');
const resultsContainer = document.getElementById('results');

// Date Range elements
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const fetchDateBtn = document.getElementById('fetch-date-btn');

// API Counter elements
const apiCounter = document.getElementById('api-counter');
const progressBar = document.getElementById('progress-bar');
const counterUsed = document.getElementById('counter-used');
const counterRemaining = document.getElementById('counter-remaining');
const counterWarning = document.getElementById('counter-warning');
const warningText = document.getElementById('warning-text');
const resetTimer = document.getElementById('reset-timer');

// Current season for API requests
const CURRENT_SEASON = 2025;

// API Usage Tracking
const API_LIMIT = 100; // Daily limit

// Load saved league selections from localStorage
window.addEventListener('DOMContentLoaded', () => {
    const savedSelections = localStorage.getItem('selectedLeagues');
    if (savedSelections) {
        const selectedIds = JSON.parse(savedSelections);
        document.querySelectorAll('.league-option input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = selectedIds.includes(checkbox.value);
        });
    }

    console.log('✅ Historical odds loaded:', Object.keys(window.HISTORICAL_ODDS || {}).length, 'matches');

    // Initialize API counter
    updateCounterDisplay();

    // Update timer every minute
    setInterval(updateResetTimer, 60000);
});

// Save league selections when changed
document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox' && e.target.closest('.league-option')) {
        const selectedLeagues = Array.from(
            document.querySelectorAll('.league-option input[type="checkbox"]:checked')
        ).map(cb => cb.value);
        localStorage.setItem('selectedLeagues', JSON.stringify(selectedLeagues));
    }
});

// ===================================
// STEP 3: ADD BUTTON CLICK LISTENER
// ===================================
fetchBtn.addEventListener('click', fetchFootballData);
fetchDateBtn.addEventListener('click', fetchFixturesByDate);

// ===================================
// API USAGE TRACKING FUNCTIONS
// ===================================
function getApiUsage() {
    const stored = localStorage.getItem('apiUsage');
    if (!stored) return { used: 0, limit: API_LIMIT, lastReset: new Date().toDateString() };

    const data = JSON.parse(stored);
    const today = new Date().toDateString();

    // Reset if it's a new day
    if (data.lastReset !== today) {
        return { used: 0, limit: API_LIMIT, lastReset: today };
    }

    return data;
}

function saveApiUsage(used) {
    const data = {
        used,
        limit: API_LIMIT,
        lastReset: new Date().toDateString()
    };
    localStorage.setItem('apiUsage', JSON.stringify(data));
}

function incrementApiUsage(count = 1) {
    const usage = getApiUsage();
    usage.used += count;
    saveApiUsage(usage.used);
    updateCounterDisplay();
    return usage;
}

function updateCounterDisplay() {
    const usage = getApiUsage();
    const remaining = usage.limit - usage.used;
    const percentage = (usage.used / usage.limit) * 100;

    // Update progress bar
    progressBar.style.width = `${Math.min(percentage, 100)}%`;

    // Change color based on usage
    progressBar.classList.remove('medium', 'high');
    if (percentage >= 80) {
        progressBar.classList.add('high');
    } else if (percentage >= 50) {
        progressBar.classList.add('medium');
    }

    // Update text
    counterUsed.textContent = `${usage.used} / ${usage.limit} calls`;
    counterRemaining.textContent = `${remaining} remaining`;

    // Show warnings
    counterWarning.classList.add('hidden');
    if (percentage >= 95) {
        counterWarning.classList.remove('hidden');
        counterWarning.classList.add('error');
        warningText.textContent = 'Daily limit reached! Resets at midnight.';
        fetchBtn.disabled = true;
    } else if (percentage >= 75) {
        counterWarning.classList.remove('hidden', 'error');
        warningText.textContent = 'Less than 25% of daily limit remaining!';
    }

    // Update reset timer
    updateResetTimer();
}

function updateResetTimer() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    resetTimer.textContent = `Resets in ${hours}h ${minutes}m`;
}

// ===================================
// STEP 4: MAIN FUNCTION TO FETCH DATA
// ===================================
async function fetchFootballData() {
    // Get selected leagues
    const selectedCheckboxes = document.querySelectorAll('.league-option input[type="checkbox"]:checked');

    if (selectedCheckboxes.length === 0) {
        showError('Please select at least one league');
        return;
    }

    // Build array of selected leagues
    const selectedLeagues = Array.from(selectedCheckboxes).map(checkbox => ({
        id: parseInt(checkbox.value),
        name: checkbox.dataset.name,
        season: checkbox.dataset.season ? parseInt(checkbox.dataset.season) : null
    }));

    // Show loading spinner, hide any previous errors or results
    showLoading();
    hideError();
    clearResults();

    // Disable the button while we're fetching data
    fetchBtn.disabled = true;

    try {
        console.log(`📡 Fetching upcoming fixtures from ${selectedLeagues.length} selected league(s)...`);

        // We'll collect all fixtures from selected leagues
        let allFixtures = [];

        // Loop through each selected league (EFFICIENT: only fetch what user wants)
        for (const league of selectedLeagues) {
            console.log(`📡 Fetching from ${league.name}...`);

            // Build the URL for upcoming fixtures (next=10 means next 10 matches)
            const season = league.season || CURRENT_SEASON;
            const url = `${API_BASE_URL}/fixtures?league=${league.id}&season=${season}&next=10`;

            // Make the API request
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-apisports-key': API_KEY
                }
            });

            // Track API call
            incrementApiUsage(1);

            // Try to get rate limit from headers
            const rateLimit = response.headers.get('X-RateLimit-Remaining');
            if (rateLimit) {
                console.log(`📊 API calls remaining (from server): ${rateLimit}`);
            }

            // Check if request was successful
            if (!response.ok) {
                console.warn(`⚠️ Failed to fetch ${league.name}: ${response.status}`);
                continue; // Skip this league and move to the next
            }

            // Parse the JSON response
            const data = await response.json();

            // Add the fixtures to our collection
            if (data.response && data.response.length > 0) {
                // Add league info to each fixture for display
                data.response.forEach(fixture => {
                    fixture.leagueInfo = league;
                });
                allFixtures = allFixtures.concat(data.response);
            }

            console.log(`✅ Got ${data.response.length} fixtures from ${league.name}`);
        }

        // Sort all fixtures by date (earliest first)
        allFixtures.sort((a, b) => {
            return new Date(a.fixture.date) - new Date(b.fixture.date);
        });

        // Take only the first 10 upcoming fixtures
        const next10Fixtures = allFixtures.slice(0, 10);

        console.log(`📦 Showing next ${next10Fixtures.length} upcoming fixtures`);

        // Check if we got any results
        if (next10Fixtures.length === 0) {
            showError('No upcoming fixtures found. The leagues might be in off-season.');
            return;
        }

        // Display the results
        displayMatches(next10Fixtures);

    } catch (error) {
        // If anything goes wrong, show an error message
        console.error('❌ Error:', error);
        showError(`Failed to fetch data: ${error.message}`);
    } finally {
        // This runs whether we succeeded or failed
        // Hide loading spinner and re-enable the button
        hideLoading();
        fetchBtn.disabled = false;
    }
}

// ===================================
// STEP 4b: FETCH FIXTURES BY DATE
// ===================================
async function fetchFixturesByDate() {
    // Get dates
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    // Validate dates
    if (!startDate || !endDate) {
        showError('Please select both a start and end date');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        showError('Start date must be before end date');
        return;
    }

    // Get selected leagues
    const selectedCheckboxes = document.querySelectorAll('.league-option input[type="checkbox"]:checked');

    if (selectedCheckboxes.length === 0) {
        showError('Please select at least one league');
        return;
    }

    // Build array of selected leagues
    const selectedLeagues = Array.from(selectedCheckboxes).map(checkbox => ({
        id: parseInt(checkbox.value),
        name: checkbox.dataset.name,
        season: checkbox.dataset.season ? parseInt(checkbox.dataset.season) : null
    }));

    // Show loading spinner, hide any previous errors or results
    showLoading();
    hideError();
    clearResults();

    fetchDateBtn.disabled = true;

    try {
        console.log(`📡 Fetching fixtures from ${startDate} to ${endDate}...`);

        let allFixtures = [];

        for (const league of selectedLeagues) {
            console.log(`📡 Fetching from ${league.name}...`);

            // Build URL for date range
            const season = league.season || CURRENT_SEASON;
            const url = `${API_BASE_URL}/fixtures?league=${league.id}&season=${season}&from=${startDate}&to=${endDate}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-apisports-key': API_KEY
                }
            });

            incrementApiUsage(1);

            if (!response.ok) {
                console.warn(`⚠️ Failed to fetch ${league.name}: ${response.status}`);
                continue;
            }

            const data = await response.json();

            if (data.response && data.response.length > 0) {
                data.response.forEach(fixture => {
                    fixture.leagueInfo = league;
                });
                allFixtures = allFixtures.concat(data.response);
            }
        }

        // Sort by date
        allFixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

        console.log(`📦 Found ${allFixtures.length} fixtures in date range`);

        if (allFixtures.length === 0) {
            showError(`No fixtures found between ${startDate} and ${endDate}.`);
            return;
        }

        displayMatches(allFixtures);

    } catch (error) {
        console.error('❌ Error:', error);
        showError(`Failed to fetch data: ${error.message}`);
    } finally {
        hideLoading();
        fetchDateBtn.disabled = false;
    }
}

// ===================================
// STEP 5: DISPLAY MATCHES FUNCTION
// ===================================
function displayMatches(matches) {
    // Clear any previous results
    resultsContainer.innerHTML = '';

    // Create table structure
    const table = document.createElement('table');
    table.className = 'fixtures-table';

    // Create table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th>League</th>
            <th>Date & Time</th>
            <th>Home Team</th>
            <th class="center">Score</th>
            <th>Away Team</th>
            <th class="center">Historical Odds</th>
            <th>Venue</th>
            <th class="center">Status</th>
        </tr>
    `;
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');

    // Loop through each match in the data
    matches.forEach(match => {
        // Extract the data we need from each match object
        const fixture = match.fixture;
        const teams = match.teams;
        const goals = match.goals;
        const league = match.league;

        // Format the date in UK time (Europe/London timezone)
        const matchDate = new Date(fixture.date);
        const formattedDate = matchDate.toLocaleDateString('en-GB', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'Europe/London'
        });
        const formattedTime = matchDate.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/London'
        });

        // Determine match status
        let statusClass = 'status-scheduled';
        let statusText = fixture.status.long;

        if (fixture.status.short === 'FT' || fixture.status.short === 'AET' || fixture.status.short === 'PEN') {
            statusClass = 'status-finished';
            statusText = 'Finished';
        } else if (fixture.status.short === 'LIVE' || fixture.status.short === '1H' || fixture.status.short === '2H') {
            statusClass = 'status-live';
            statusText = 'Live';
        }

        // Get league info (NO FLAGS)
        const leagueInfo = match.leagueInfo || { name: league.name };

        // Format score display
        const scoreDisplay = goals.home !== null && goals.away !== null
            ? `${goals.home} - ${goals.away}`
            : 'vs';
        const scoreClass = goals.home !== null ? 'score-cell' : 'score-cell no-score';

        // Get Historical Odds
        const odds = getHistoricalOdds(teams.home.name, teams.away.name);
        let oddsHtml = '<span class="no-odds">-</span>';

        if (odds) {
            oddsHtml = `
                <div class="odds-badge">
                    <div class="odds-row">
                        <div class="odds-group">
                            <span class="odds-label">1</span>
                            <span class="odds-value">${odds.home}</span>
                        </div>
                        <div class="odds-group">
                            <span class="odds-label">X</span>
                            <span class="odds-value">${odds.draw}</span>
                        </div>
                        <div class="odds-group">
                            <span class="odds-label">2</span>
                            <span class="odds-value">${odds.away}</span>
                        </div>
                    </div>
                </div>
            `;
        }

        // Create table row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="league-cell">${leagueInfo.name}</td>
            <td class="datetime-cell">
                <span class="date-line">${formattedDate}</span>
                <span class="time-line">${formattedTime}</span>
            </td>
            <td>
                <div class="team-cell">
                    <img src="${teams.home.logo}" alt="${teams.home.name}" class="team-logo">
                    <span class="team-name">${teams.home.name}</span>
                </div>
            </td>
            <td class="${scoreClass}">${scoreDisplay}</td>
            <td>
                <div class="team-cell">
                    <img src="${teams.away.logo}" alt="${teams.away.name}" class="team-logo">
                    <span class="team-name">${teams.away.name}</span>
                </div>
            </td>
            <td class="odds-cell">${oddsHtml}</td>
            <td class="venue-cell">${fixture.venue.name ? `${fixture.venue.name}, ${fixture.venue.city}` : 'TBD'}</td>
            <td class="center">
                <span class="match-status ${statusClass}">${statusText}</span>
            </td>
        `;

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    resultsContainer.appendChild(table);
}

// ===================================
// HELPER: GET ODDS
// ===================================
function getHistoricalOdds(homeTeam, awayTeam) {
    const historicalOddsData = window.HISTORICAL_ODDS || {};

    // Normalize team name (remove common prefixes/suffixes)
    function normalizeTeamName(name) {
        return name
            .replace(/^FC\s+/i, '')
            .replace(/^1\.\s+/i, '')
            .replace(/\s+FC$/i, '')
            .replace(/\s+United$/i, '')
            .replace(/\s+City$/i, '')
            .replace(/\s+Town$/i, '')
            .trim();
    }

    // Try exact match first
    let key = `${homeTeam} vs ${awayTeam}`;
    console.log(`🔍 Looking up odds for: "${key}"`);

    if (historicalOddsData[key]) {
        console.log(`   ✅ Found exact match!`);
        return historicalOddsData[key];
    }

    // Try with normalized names
    const homeNorm = normalizeTeamName(homeTeam);
    const awayNorm = normalizeTeamName(awayTeam);
    const normKey = `${homeNorm} vs ${awayNorm}`;

    if (historicalOddsData[normKey]) {
        console.log(`   ✅ Found normalized match: "${normKey}"`);
        return historicalOddsData[normKey];
    }

    // Fuzzy matching - find best match based on word overlap
    let bestMatch = null;
    let bestScore = 0;

    const homeWords = homeTeam.toLowerCase().split(' ').filter(w => w.length > 2);
    const awayWords = awayTeam.toLowerCase().split(' ').filter(w => w.length > 2);

    for (const matchKey of Object.keys(historicalOddsData)) {
        const [histHome, histAway] = matchKey.split(' vs ');
        if (!histHome || !histAway) continue;

        const histHomeWords = histHome.toLowerCase().split(' ').filter(w => w.length > 2);
        const histAwayWords = histAway.toLowerCase().split(' ').filter(w => w.length > 2);

        // Calculate overlap score
        const homeOverlap = homeWords.filter(w => histHomeWords.some(hw => hw.includes(w) || w.includes(hw))).length;
        const awayOverlap = awayWords.filter(w => histAwayWords.some(aw => aw.includes(w) || w.includes(aw))).length;

        const score = homeOverlap + awayOverlap;

        // Need at least one word match for each team
        if (homeOverlap > 0 && awayOverlap > 0 && score > bestScore) {
            bestScore = score;
            bestMatch = matchKey;
        }
    }

    if (bestMatch && bestScore >= 2) {
        console.log(`   ✅ Found fuzzy match (score ${bestScore}): "${bestMatch}"`);
        return historicalOddsData[bestMatch];
    }

    console.log(`   ❌ No match found.`);
    return null;
}

// ===================================
// HELPER FUNCTIONS
// ===================================
function showLoading() {
    loadingDiv.classList.remove('hidden');
}

function hideLoading() {
    loadingDiv.classList.add('hidden');
}

function showError(message) {
    errorText.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    errorDiv.classList.add('hidden');
}

function clearResults() {
    resultsContainer.innerHTML = '';
}


// ===================================
// STEP 6: TAB SWITCHING LOGIC
// ===================================
const tabs = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => {
            c.classList.add('hidden');
            c.classList.remove('active');
        });

        // Add active class to clicked tab and target content
        tab.classList.add('active');
        const targetId = tab.dataset.tab;
        const targetContent = document.getElementById(targetId);
        targetContent.classList.remove('hidden');
        targetContent.classList.add('active');
    });
});

// ===================================
// STEP 7: LEAGUE DISCOVERY LOGIC
// ===================================
const fetchLeaguesBtn = document.getElementById('fetch-leagues-btn');
const leagueSearchInput = document.getElementById('league-search');
const leaguesContainer = document.getElementById('leagues-container');
const leagueStatus = document.getElementById('league-status');

// Priority Sorting:
// 1. Specific Major Leagues (Popular global competitions)
// 2. Major Football Nations (Top teams from these countries come next)
const MAJOR_LEAGUES_IDS = [
    39,   // Premier League (England)
    140,  // La Liga (Spain)
    135,  // Serie A (Italy)
    78,   // Bundesliga (Germany)
    61,   // Ligue 1 (France)
    2,    // UEFA Champions League
    3,    // UEFA Europa League
    848,  // UEFA Conference League
    1,    // World Cup
    45,   // FA Cup
    143,  // Copa America
    9,    // Copa Libertadores
    15,   // FIFA Club World Cup
    262,  // Liga MX
    71,   // Brazil Serie A
    144,  // Copa Sudamericana
    4,    // Euro Championship
];

const MAJOR_NATIONS = [
    "England", "Spain", "Italy", "Germany", "France", "Brazil", "Argentina", "Portugal", "Netherlands", "Belgium"
];

let displayedCount = 0;
const BATCH_SIZE = 50;
let currentFilteredList = [];

fetchLeaguesBtn.addEventListener('click', fetchAndDisplayLeagues);

leagueSearchInput.addEventListener('input', (e) => {
    filterLeagues(e.target.value);
});

async function fetchAndDisplayLeagues() {
    // 1. Check Local Storage first
    const cachedLeagues = localStorage.getItem('availableLeagues');

    if (cachedLeagues) {
        console.log('📂 Using cached league data');
        const leagues = JSON.parse(cachedLeagues);
        processAndDisplayLeagues(leagues);
        leagueStatus.textContent = `Loaded ${leagues.length} leagues from cache (0 credits used)`;
        enableSearch();
        return;
    }

    // 2. If not cached, confirm with user
    const confirmFetch = confirm("Fetching the full list of leagues will use 1 API Credit. The list will be saved to your browser so you won't need to fetch it again.\n\nType OK to proceed.");

    if (!confirmFetch) return;

    fetchLeaguesBtn.disabled = true;
    fetchLeaguesBtn.innerHTML = '<span class="spinner simple-spinner"></span> Loading...';
    leagueStatus.textContent = 'Fetching leagues from API...';

    try {
        const response = await fetch(`${API_BASE_URL}/leagues`, {
            method: 'GET',
            headers: {
                'x-apisports-key': API_KEY
            }
        });

        // Track API call
        incrementApiUsage(1);

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.response) {
            // Save to local storage
            localStorage.setItem('availableLeagues', JSON.stringify(data.response));

            console.log(`✅ Fetched ${data.response.length} leagues`);
            processAndDisplayLeagues(data.response);

            leagueStatus.textContent = `Successfully fetched ${data.response.length} leagues (1 credit used). Saved to cache.`;
            enableSearch();
        }

    } catch (error) {
        console.error('❌ Error fetching leagues:', error);
        leagueStatus.textContent = `Error: ${error.message}`;
        leaguesContainer.innerHTML = `<div class="error-message">Failed to load leagues. Please try again.</div>`;
    } finally {
        fetchLeaguesBtn.disabled = false;
        fetchLeaguesBtn.innerHTML = '<span class="btn-text">Reload Leagues</span><span class="btn-icon">🔄</span>';
    }
}

function processAndDisplayLeagues(leaguesData) {
    // Sort the Data
    leaguesData.sort((a, b) => {
        const isMajorA = MAJOR_LEAGUES_IDS.includes(a.league.id);
        const isMajorB = MAJOR_LEAGUES_IDS.includes(b.league.id);

        // 1. Specific Major Leagues first
        if (isMajorA && !isMajorB) return -1;
        if (!isMajorA && isMajorB) return 1;

        // 2. Major Nations second
        const isNationA = MAJOR_NATIONS.includes(a.country.name);
        const isNationB = MAJOR_NATIONS.includes(b.country.name);

        if (isNationA && !isNationB) return -1;
        if (!isNationA && isNationB) return 1;

        // 3. If both match nation priority (but distinct), sort by country name then league name
        if (isNationA && isNationB) {
            if (a.country.name !== b.country.name) return a.country.name.localeCompare(b.country.name);
            return a.league.name.localeCompare(b.league.name);
        }

        // 4. Default Alphabetical by Country
        return a.country.name.localeCompare(b.country.name);
    });

    // Store globally
    window.allLeaguesData = leaguesData;
    filterLeagues(''); // Initial display
}

function filterLeagues(query) {
    if (!window.allLeaguesData) return;

    const searchTerm = query.toLowerCase();

    // Filter
    currentFilteredList = window.allLeaguesData.filter(item => {
        return (
            item.league.name.toLowerCase().includes(searchTerm) ||
            item.country.name.toLowerCase().includes(searchTerm) ||
            item.league.id.toString().includes(searchTerm)
        );
    });

    // Reset display count
    displayedCount = 0;
    leaguesContainer.innerHTML = '';

    if (currentFilteredList.length === 0) {
        leaguesContainer.innerHTML = '<div class="placeholder-message">No leagues found matching your search.</div>';
        return;
    }

    renderNextBatch();
}

function renderNextBatch() {
    const nextBatch = currentFilteredList.slice(displayedCount, displayedCount + BATCH_SIZE);

    if (nextBatch.length === 0) {
        // Hide button if no more data
        const btn = document.getElementById('load-more-btn-container');
        if (btn) btn.remove();
        return;
    }

    nextBatch.forEach(item => {
        const { league, country, seasons } = item;
        const isMajor = MAJOR_LEAGUES_IDS.includes(league.id);

        // Get current season year
        const lastSeason = seasons[seasons.length - 1];
        const currentSeasonYear = lastSeason ? lastSeason.year : 'N/A';

        const card = document.createElement('div');
        // Changed to 'league-card' to keep CSS working (we will restyle it)
        card.className = `league-card ${isMajor ? 'major-league' : ''}`;

        // Simple HTML without the image
        card.innerHTML = `
            <div class="league-info">
                <h4>${league.name}</h4>
                <p>
                    <span>${country.name === 'World' ? '🌍' : ''} ${country.name}</span>
                </p>
                <div class="meta-tags">
                    ${isMajor ? '<span class="league-tag tag-popular">Popular</span>' : ''}
                    <span class="league-tag tag-type">${league.type}</span>
                    <span class="league-tag tag-type">Season: ${currentSeasonYear}</span>
                    <span class="league-tag tag-type">ID: ${league.id}</span>
                </div>
            </div>
        `;

        leaguesContainer.appendChild(card);
    });

    displayedCount += nextBatch.length;

    // Manage "Load More" button
    const existingBtn = document.getElementById('load-more-btn-container');
    if (existingBtn) existingBtn.remove();

    if (displayedCount < currentFilteredList.length) {
        const btnContainer = document.createElement('div');
        btnContainer.id = 'load-more-btn-container';
        btnContainer.className = 'load-more-container';

        const btn = document.createElement('button');
        btn.className = 'load-more-btn';
        btn.textContent = `Show More (${currentFilteredList.length - displayedCount} remaining)`;
        btn.onclick = renderNextBatch;

        btnContainer.appendChild(btn);
        leaguesContainer.appendChild(btnContainer);
    }
}

function enableSearch() {
    leagueSearchInput.disabled = false;
    leagueSearchInput.focus();
}
