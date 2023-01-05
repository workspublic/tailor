import inquirer from 'inquirer';
import {
  checkIfTableExists,
  withDb
} from '../common.js';
import sqlQueries from './sql.js';

async function getTailorAddressColumn() {
  const addressColumnSql = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'addresses'
  `;

  // TODO add more error handling here
  return withDb(async (db) => {
    const addressColumnRes = await db.query(addressColumnSql);
    return addressColumnRes
      .rows
      .filter(r => r.column_name.startsWith('tailor_address_'))[0].column_name;
  });
}

async function analyze(options) {
  const { buildingParcelOverlap } = options;
  
  // check for existing analysis
  const parcelsAnalyzedExists = await checkIfTableExists('parcels_analyzed');
  const bslsAnalyzedExists = await checkIfTableExists('bsls_analyzed');

  if (parcelsAnalyzedExists || bslsAnalyzedExists) {
    const overwriteAnswer = await inquirer.prompt({
      type: 'confirm',
      name: 'shouldOverwrite',
      message: 'We found an existing analysis. Are you sure you want to overwrite it?',
      default: false,
    });
    
    if (overwriteAnswer.shouldOverwrite) {
      console.log('Cleaning up existing analysis...');

      await withDb(async (db) => {
        await db.query(`
          drop table if exists parcels_analyzed;
          drop table if exists bsls_analyzed;
          drop table if exists bsls_address_match_lines;
        `);
      });
    }
    else {
      console.log('Finished.');
      return;
    }
  }

  const addressesExists = await checkIfTableExists('addresses');
  
  await withDb(async (db) => {
    console.log('Comparing BSLs, parcels, and buildings. This may take a few minutes... ⏲️');

    const analyzeParcelsSql = sqlQueries.parcels(buildingParcelOverlap);
    await db.query(analyzeParcelsSql);

    if (addressesExists) {
      console.log('Comparing BSLs and addresses...');

      const tailorAddressColumn = await getTailorAddressColumn();

      const analyzeBslsSql = sqlQueries.bsls(tailorAddressColumn);
      await db.query(analyzeBslsSql);

      console.log('Creating address match lines...');

      const addressMatchLinesSql = sqlQueries.addressMatchLines(tailorAddressColumn);
      await db.query(addressMatchLinesSql);
    } else {
      console.log('Address layer not found; skipping BSL analysis.');
    }
  });

  console.log('Finished.');
}

export default analyze;
