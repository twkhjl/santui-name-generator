import { loadConfig } from './config.js';
import { buildUniqueNames } from './name-generator.js';
import { exportPdf } from './pdf-export.js';
import { setupApp } from './dom.js';

setupApp({ loadConfig, buildUniqueNames, exportPdf });
