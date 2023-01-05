#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { Command } from 'commander';
import figlet from 'figlet';
import analyze from './analysis/analyze.js';
import loadBoundary from './loaders/load-boundary.js';
import loadParcels from './loaders/load-parcels.js';
import loadBuildings from './loaders/load-buildings.js';
import loadBsls from './loaders/load-bsls.js';
import loadAddresses from './loaders/load-addresses.js';

// helper to load package.json
// TODO clean up ways of getting the project root dir; compare how dotenv is 
// configured in common.js
function loadManifest() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const manifestPath = path.resolve(
    // HACK this should look for the project root
    path.join(__dirname, '..', 'package.json')
  );

  return JSON.parse(fs.readFileSync(manifestPath));
}

const manifest = loadManifest();

// helper to check for shp or geojson
function validateFileFormat(program, path, validFormats = []) {
  const format = path.split('.').pop();

  if (!validFormats.includes(format)) {
    program.error(`File format must be one of: ${validFormats.join(', ')}`);
  }
}

const program = new Command();

program
  // HACK
  .name(Object.keys(manifest.bin)[0])
  .description(manifest.description)
  .version(manifest.version);

program.addHelpText(
  'beforeAll',
  chalk.cyan(figlet.textSync('Tailor', { font: 'Santa Clara' }))
);

program.command('load-bsls')
  .description('Load BSLs (aka the fabric)')
  .argument('<path>', 'Path to CSV')
  .action((path) => {
    validateFileFormat(program, path, ['csv']);
    loadBsls(path);
  });

program.command('load-boundary')
  .description('Load polygon for area of interest')
  .argument('<path>', 'Path to GeoJSON or Shapefile')
  .action((path) => {
    validateFileFormat(program, path, ['geojson', 'shp']);
    loadBoundary(path);
  });

program.command('load-parcels')
  .description('Load parcels')
  .argument('<path>', 'Path to GeoJSON or Shapefile')
  .action((path) => {
    validateFileFormat(program, path, ['geojson', 'shp']);
    loadParcels(path);
  });

program.command('load-buildings')
  .description('Load buildings')
  .argument('<path>', 'Path to GeoJSON or Shapefile')
  .action((path) => {
    validateFileFormat(program, path, ['geojson', 'shp']);
    loadBuildings(path);
  });

program.command('load-addresses')
  .description('Load address points')
  .argument('<path>', 'Path to GeoJSON or Shapefile')
  .argument('<address-column>', 'Column with addresses')
  .argument('<address-type>', 'Address type (must be `street` or `full`)')
  .action((path, addressColumn, addressType) => {
    if (!(addressType === 'street' || addressType === 'full')) {
      program.error('Address type must be either `street` or `full`. Hint: if you have ZIP codes, use `full`.');
    }
    validateFileFormat(program, path, ['geojson', 'shp']);
    loadAddresses(path, addressColumn, addressType);
  });

program.command('analyze')
  .description('Analyze fabric for errors')
  .option(
    '-bpo, --building-parcel-overlap',
    'Minimum overlap in square feet for associating a building with a parcel. Default: 500',
    500,
  )
  .action((options) => {
    analyze(options);
  });

program.parse();
