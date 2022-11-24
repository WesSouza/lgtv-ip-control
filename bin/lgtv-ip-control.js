#!/bin/env node

import { makeProgram } from '../dist/cli.js';

makeProgram().parseAsync();
