import { loadDatasetIntoDb } from '../common.js';

async function loadBoundary(path) {
  console.log('Loading boundary...');

  await loadDatasetIntoDb(
    'boundary',
    path,
    [
      '-nlt', 'PROMOTE_TO_MULTI',
      '-t_srs', 'EPSG:4326',
    ],
  );

  console.log('Finished.');
}

export default loadBoundary;
