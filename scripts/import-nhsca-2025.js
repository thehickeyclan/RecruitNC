/**
 * Import NHSCA 2025 Data
 * Filters to only import placers (entries with placement field)
 */

const fs = require('fs');
const path = require('path');

// Read the JSON file
const jsonData = JSON.parse(fs.readFileSync(path.join(__dirname, 'nhsca-2025-data.json'), 'utf8'));

// Filter to only placers (entries with placement field)
const placersOnly = jsonData.filter(entry => entry.placement !== undefined && entry.placement !== null);

console.log(`Total entries: ${jsonData.length}`);
console.log(`Placers (with placement): ${placersOnly.length}`);
console.log(`Non-placers (without placement): ${jsonData.length - placersOnly.length}`);

// Show breakdown by placement
const placementBreakdown = {};
placersOnly.forEach(entry => {
  const placement = entry.placement;
  placementBreakdown[placement] = (placementBreakdown[placement] || 0) + 1;
});

console.log('\nPlacement Breakdown:');
Object.keys(placementBreakdown).sort((a, b) => a - b).forEach(placement => {
  console.log(`  ${placement}: ${placementBreakdown[placement]} wrestlers`);
});

// Save filtered data
const outputPath = path.join(__dirname, 'nhsca-2025-placers-only.json');
fs.writeFileSync(outputPath, JSON.stringify(placersOnly, null, 2));
console.log(`\n✅ Saved ${placersOnly.length} placers to: ${outputPath}`);

// Also create version with all participants (for reference)
const allParticipantsPath = path.join(__dirname, 'nhsca-2025-all-participants.json');
fs.writeFileSync(allParticipantsPath, JSON.stringify(jsonData, null, 2));
console.log(`✅ Saved ${jsonData.length} total participants to: ${allParticipantsPath}`);

