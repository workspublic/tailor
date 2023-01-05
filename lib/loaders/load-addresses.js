import {
  createDbIndex,
  dropFeaturesOutsideBoundary,
  dropFeaturesWithInvalidGeom,
  loadDatasetIntoDb,
  withDb,
} from '../common.js';

async function loadAddresses(path, addressColumn, addressType) {
  console.log('Loading addresses. This may take a few minutes... ⏲️');
  await loadDatasetIntoDb('addresses', path);

  await dropFeaturesWithInvalidGeom('addresses');

  await dropFeaturesOutsideBoundary('addresses');

  console.log('Normalizing addresses...');
  // HACK? copy address column to a new column memorializing the address type
  // TODO actually do some normalization 😅
  const tailorAddressColumn = `tailor_address_${addressType}`;

  await withDb(async (db) => {
    await db.query(`
      alter table addresses add column ${tailorAddressColumn} text;
      update addresses set ${tailorAddressColumn} = ${addressColumn};
    `);
  });

  console.log('Indexing addresses...');
  await createDbIndex('addresses', tailorAddressColumn);

  console.log('Finished.');
}

export default loadAddresses;
