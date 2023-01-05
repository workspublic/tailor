import {
  dropFeaturesOutsideBoundary,
  dropFeaturesWithInvalidGeom,
  loadDatasetIntoDb,
} from '../common.js';

async function loadBuildings(path) {
  console.log('Loading buildings. This may take a few minutes... ⏲️');

  await loadDatasetIntoDb(
    'buildings',
    path,
    [
      '-nlt', 'PROMOTE_TO_MULTI',
      '-t_srs', 'EPSG:4326',
    ],
  );

  await dropFeaturesOutsideBoundary('buildings');

  await dropFeaturesWithInvalidGeom('buildings');

  console.log('Finished.');
}

export default loadBuildings;
