import path from 'path';
import inquirer from 'inquirer';
import ogr2ogr from 'ogr2ogr';
import pg from 'pg';

// https://stackoverflow.com/a/36221905/676001
function resolveHome(filepath) {
  if (filepath[0] === '~') {
      return path.join(process.env.HOME, filepath.slice(1));
  }
  return filepath;
}

async function loadDatasetIntoDb(dataset, pathRaw, customOptions = []) {
  // resolve path if it has a tilde
  const path = resolveHome(pathRaw);

  const options = [
    '-lco', 'GEOMETRY_NAME=geom',
    '-nln', dataset,
    '-overwrite',
    ...customOptions,
  ];

  if (dataset !== 'boundary') {
    const boundaryExists = await checkIfTableExists('boundary');

    if (boundaryExists) {
      const boundaryExtent = await getBoundaryExtentForOgr();
      options.push('-spat', ...boundaryExtent.split(' '));
    }
  }

  // handle lack of precision in shapefiles
  const format = path.split('.').pop();
  if (format === 'shp') {
    options.push('-lco', 'PRECISION=NO');
  }

  const connectionString = getPostgresConnectionString();

  await ogr2ogr(path, {
    destination: connectionString,
    options,
  });
}

function getPostgresConnectionString() {
  let dbUri = process.env.TAILOR_DB_URI;

  if (!dbUri) {
    dbUri = 'postgresql://localhost/tailor';
  }
  
  return dbUri;
}

async function withDb(cb) {
  const connectionString = getPostgresConnectionString();

  const db = new pg.Client({ connectionString });
  
  await db.connect();

  const res = await cb(db);
  
  await db.end();

  return res;
}

async function checkIfTableExists(table) {
  const existsSql = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE  table_schema = 'public'
      AND    table_name   = '${table}'
    );
  `;

  return withDb(async (db) => {
    const existsRes = await db.query(existsSql);
    return existsRes.rows[0].exists;
  });
}

async function dropFeaturesOutsideBoundary(layer) {
  const boundaryExists = await checkIfTableExists('boundary');

  if (boundaryExists) {
    console.log('Dropping features outside boundary...');

    return withDb(async (db) => {
      const dropOutsideBoundarySql = `
        delete
        from ${layer} l
        using boundary b
        where st_intersects(l.geom, b.geom) = false
      `;
  
      await db.query(dropOutsideBoundarySql);
    });
  }
}

async function createDbIndex(table, column) {
  await withDb(async (db) => {
    const createIndexSql = `
      create index ${table}_${column}_idx on ${table} (${column})
    `;
    await db.query(createIndexSql);
  });
}

async function dropFeaturesWithInvalidGeom(table) {
  // for more on st_collectionextract
  // https://gis.stackexchange.com/questions/165151/postgis-update-multipolygon-with-st-makevalid-gives-error
  const invalidGeomCountSql = `
    select count(*) from ${table} where st_isvalid(geom) = false
  `;
  const fixInvalidGeomsSql = `
    update ${table}
    set geom = st_collectionextract(st_makevalid(geom))
  `;
  const dropInvalidGeomsSql = `
    delete
    from ${table}
    where st_isvalid(geom) = false
  `;

  await withDb(async (db) => {
    console.log('Checking for invalid geometries...');

    const invalidGeomCountRes = await db.query(invalidGeomCountSql);
    const invalidGeomCount = invalidGeomCountRes.rows[0].count;

    // if there are invalid geoms
    if (invalidGeomCount > 0) {
      console.log(`Attempting to fix ${invalidGeomCount} invalid geometries...`);

      // try to fix them
      await db.query(fixInvalidGeomsSql);
  
      // recount
      const invalidGeomRecountRes = await db.query(invalidGeomCountSql);
      const invalidGeomRecount = parseInt(invalidGeomRecountRes.rows[0].count);

      // if they were all fixed
      if (invalidGeomRecount === 0) {
        console.log('All invalid geometries were fixed.');
        return;
      }

      // otherwise offer to drop them
      else if (invalidGeomRecount > 0) {
        const dropInvalidGeomsAnswer = await inquirer.prompt({
          type: 'list',
          name: 'answer',
          message: `There are ${invalidGeomRecount} invalid geometries that couldn't be fixed. Would you like to...`,
          choices: [
            'Exclude them from analysis and continue',
            'Exit and fix manually',
          ],
        });

        // if they decided to drop them
        if (dropInvalidGeomsAnswer.answer.startsWith('Exclude')) {
          console.log('Dropping features with invalid geometries...');

          await db.query(dropInvalidGeomsSql);
        }
      }
    } 
  });
}

async function getBoundaryExtentForOgr() {
  return withDb(async (db) => {
    const extentRes = await db.query('select st_extent(geom) from boundary');
    const extent = extentRes.rows[0].st_extent;

    return extent
      .replace('BOX(', '')
      .replace(')', '')
      .replace(',', ' ');
  });
}

export {
  createDbIndex,
  checkIfTableExists,
  dropFeaturesOutsideBoundary,
  dropFeaturesWithInvalidGeom,
  getBoundaryExtentForOgr,
  loadDatasetIntoDb,
  withDb,
};
