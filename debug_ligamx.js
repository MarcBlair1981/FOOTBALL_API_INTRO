const https = require('https');

const API_KEY = 'df8b404f81fb689192c28b65c73e8ec1';
const HOST = 'v3.football.api-sports.io';

function testLeague(id, season) {
    const options = {
        hostname: HOST,
        path: `/fixtures?league=${id}&season=${season}&next=5`,
        method: 'GET',
        headers: {
            'x-apisports-key': API_KEY
        }
    };

    const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const json = JSON.parse(data);
            // Log the full response errors if any
            if (json.errors && Object.keys(json.errors).length > 0) {
                console.log(`❌ [ID: ${id}, Season: ${season}] Error:`, JSON.stringify(json.errors));
            } else {
                console.log(`✅ [ID: ${id}, Season: ${season}] Returned ${json.response ? json.response.length : 0} fixtures.`);
                if (json.response && json.response.length > 0) {
                    console.log(`   Sample: ${json.response[0].fixture.date} - ${json.response[0].teams.home.name} vs ${json.response[0].teams.away.name}`);
                }
            }
        });
    });

    req.on('error', error => {
        console.error(`Error: ${error.message}`);
    });

    req.end();
}

console.log('Testing Liga MX configurations...');
testLeague(262, 2025); // Most likely for Jan 2026 matches in Clausura
testLeague(262, 2026); // Possible if calendar year
testLeague(262, 2024); // What I originally put (likely wrong)
