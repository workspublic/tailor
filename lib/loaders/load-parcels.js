import {
  dropFeaturesOutsideBoundary,
  dropFeaturesWithInvalidGeom,
  loadDatasetIntoDb,
 } from '../common.js';

async function loadParcels(path) {
  console.log('Loading parcels. This may take a few minutes... ⏲️');
  
  await loadDatasetIntoDb(
    'parcels',
    path,
    [
      '-nlt', 'PROMOTE_TO_MULTI',
      '-t_srs', 'EPSG:4326',
    ],
  );

  await dropFeaturesOutsideBoundary('parcels');
  
  await dropFeaturesWithInvalidGeom('parcels');

  console.log('Finished.');
}

export default loadParcels;
