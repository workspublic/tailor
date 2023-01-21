import path from 'path';
import inquirer from 'inquirer';
import gdal from 'gdal-async';
import pg from 'pg';

// https://stackoverflow.com/a/36221905/676001
function resolveHome(filepath) {
  if (filepath[0] === '~') {
      return path.join(process.env.HOME, filepath.slice(1));
  }
  return filepath;
}

async function loadDatasetIntoDb(name, pathRaw, customOptions = []) {
  // resolve path if it has a tilde
  const path = resolveHome(pathRaw);

  const inDataset = gdal.open(path, 'r'); 

  const options = [
    '-lco', 'GEOMETRY_NAME=geom',
    '-nln', name,
    '-overwrite',
    ...customOptions,
  ];

  if (name !== 'boundary') {
    const boundaryExists = await checkIfTableExists('boundary');

    if (boundaryExists) {
      const boundaryExtent = await getBoundaryExtentForOgr();
      options.push('-spat', ...boundaryExtent.split(' '));
    }
  }

  const outDataset = gdal.vectorTranslate(
    // TODO handle the out path this better
    'tailor.gpkg',
    inDataset,
    options,
  );

  outDataset.close();
}

async function withDb(cb) {
  const db = new pg.Client({
    database: 'tailor',
  });
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

// TODO temporarily not using this because dotenv was being temperamental
// TODO gdal supports uri connection strings; maybe there's a library to form
// that from env vars and we don't need this? see:
// https://gdal.org/drivers/vector/pg.html#connecting-to-a-database
// function getDbConnectionString() { 
//   const ENV_TO_OGR = {
//     PGHOST: 'host',
//     PGPORT: 'port',
//     PGDATABASE: 'dbname',
//     PGUSER: 'user',
//     PGPASSWORD: 'password',
//   };

//   const { env } = process;
//   const ogrVals = [];

//   for (const [envKey, ogrKey] of Object.entries(ENV_TO_OGR)) {
//     const envVal = env[envKey];
    
//     if (envVal) {
//       const ogrVal = `${ogrKey}='${envVal}'`;
//       ogrVals.push(ogrVal);
//     }
//   }

//   // TODO should the whole string be wrapped in double quotes for safety?
//   // the postgis docs sometimes do this. there's an issue with ogr2ogr that
//   // causes unexpected behavior with double-quoted connection strings:
//   // https://github.com/wavded/ogr2ogr/issues/94
//   let connStr = `PG:${ogrVals.join(' ')}`;
  
//   return connStr;
// }

export {
  createDbIndex,
  checkIfTableExists,
  dropFeaturesOutsideBoundary,
  dropFeaturesWithInvalidGeom,
  getBoundaryExtentForOgr,
  loadDatasetIntoDb,
  withDb,
};
