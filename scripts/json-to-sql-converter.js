/**
 * Convert NHSCA JSON to SQL INSERT statements
 * Usage: node scripts/json-to-sql-converter.js < input.json > output.sql
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let jsonData = '';

process.stdin.on('data', (chunk) => {
  jsonData += chunk.toString();
});

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(jsonData);
    
    if (!Array.isArray(data)) {
      console.error('Error: JSON must be an array');
      process.exit(1);
    }

    console.log('-- NHSCA 2025 Data Import');
    console.log('INSERT INTO nhsca_placements (');
    console.log('  year,');
    console.log('  athlete_name,');
    console.log('  high_school,');
    console.log('  placement,');
    console.log('  weight_class,');
    console.log('  division,');
    console.log('  record,');
    console.log('  state');
    console.log(') VALUES');

    const values = data.map((entry, index) => {
      const placement = entry.placement !== undefined ? entry.placement : 'NULL';
      const highSchool = entry.high_school ? `'${entry.high_school.replace(/'/g, "''")}'` : 'NULL';
      const record = entry.record ? `'${entry.record.replace(/'/g, "''")}'` : 'NULL';
      
      return `  (${entry.year || 2025}, '${entry.athlete_name.replace(/'/g, "''")}', ${highSchool}, ${placement}, '${entry.weight_class}', '${entry.division}', ${record}, '${entry.state || 'NC'}')`;
    });

    console.log(values.join(',\n') + ';');
    console.log('\n-- Verify import:');
    console.log('SELECT COUNT(*) as total, COUNT(placement) as placers FROM nhsca_placements WHERE year = 2025;');
  } catch (error) {
    console.error('Error parsing JSON:', error.message);
    process.exit(1);
  }
});

