#!/usr/bin/env node

// We use CommonJS for now as "pkg" doesn't yet support ESM.
let cli = require('../dist/cli.cjs');

cli.makeProgram().parseAsync();
