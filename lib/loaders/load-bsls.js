import {
  createDbIndex,
  dropFeaturesOutsideBoundary,
  loadDatasetIntoDb,
  withDb,
} from '../common.js';

async function loadBsls(path) {
  console.log('Loading BSLs...');

  await loadDatasetIntoDb(
    'bsls',
    path,
    [
      '-a_srs', 'EPSG:4326',
      '-oo', 'KEEP_GEOM_COLUMNS=NO',
      '-oo', 'X_POSSIBLE_NAMES=Longitude',
      '-oo', 'Y_POSSIBLE_NAMES=Latitude',
    ],
  );

  await dropFeaturesOutsideBoundary('bsls');

  console.log('Normalizing addresses...');

  await withDb(async (db) => {
    const createAddressBaseColsSql = `
      alter table bsls add column address_primary_norm text;
      alter table bsls add column address_full text;
      alter table bsls add column address_full_norm text;
      update bsls set address_primary_norm = regexp_replace(address_primary, ' BLDG \\w+', '');
      update bsls set address_full = (address_primary || ', ' || city || ', ' || state || ' ' || zip);
      update bsls set address_full_norm = (address_primary_norm || ', ' || city || ', ' || state || ' ' || zip);
    `;

    await db.query(createAddressBaseColsSql);
  });

  console.log('Indexing addresses...');

  await createDbIndex('bsls', 'address_primary_norm');
  await createDbIndex('bsls', 'address_full_norm');

  console.log('Finished.');
}

export default loadBsls;
