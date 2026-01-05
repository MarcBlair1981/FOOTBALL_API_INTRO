# Team Name Normalization Guide

This guide explains how to ensure team names from your uploaded CSV files (e.g., `E0.csv`) match the team names used by the Football API. This process is called "normalization".

## Why is this needed?
Different data sources often use slightly different names for the same team.
*   **CSV File:** Might use "Man United" or "Spurs".
*   **Football API:** Uses "Manchester United" and "Tottenham".

If these names don't match exactly, the app won't be able to find the historical odds for that fixture.

## How to Fix Mismatches

You have full control over these mappings in the `process_odds.js` file.

### Step 1: Identify the Mismatch
If you see "No Odds" or a missing badge for a match in the app, check the console logs (F12 -> Console) or look at the `historical_odds.json` file.
*   Find the team name as it appears in your CSV.
*   Find the team name as it appears in the App/API.

### Step 2: Edit the Mapping Script
1.  Open the file `process_odds.js` in your code editor.
2.  Locate the `teamMapping` object (around line 22).
3.  Add a new line for your team.

**Format:**
```javascript
"Name In CSV": "Name In API",
```

**Example:**
If your CSV has "Nottm Forest" but the API uses "Nottingham Forest", add this line:
```javascript
const teamMapping = {
    "Man United": "Manchester United",
    // ... existing mappings ...
    "Nottm Forest": "Nottingham Forest", // <--- Add this line
};
```

### Step 3: Re-run the Script
After saving your changes to `process_odds.js`, you need to regenerate the `historical_odds.json` file.

If you have Node.js installed, run this in your terminal:
```bash
node process_odds.js
```

If you don't have Node.js, you can ask your AI assistant (me!) to "Regenerate the historical odds file using the updated mapping."

## Common API Team Names
Here are the standard names used by the API for the Premier League (use these as your "Target Names"):
*   Arsenal
*   Aston Villa
*   Bournemouth
*   Brentford
*   Brighton & Hove Albion
*   Chelsea
*   Crystal Palace
*   Everton
*   Fulham
*   Ipswich Town
*   Leicester City
*   Liverpool
*   Manchester City
*   Manchester United
*   Newcastle United
*   Nottingham Forest
*   Southampton
*   Tottenham
*   West Ham United
*   Wolverhampton

## Advanced: Fuzzy Matching
The app also has a built-in "backup" system in `script.js`. If an exact match isn't found, it tries to match based on the first word (e.g., matching "Sheffield" in "Sheffield United"). This happens automatically, but the manual mapping in `process_odds.js` is always more accurate and preferred.
