// Bundled sample inputs for "Load sample" (synthetic fixtures; demo journey steps 2 and 8).
// Imported as raw text through Vite's `?raw` suffix, so they are parsed by the same code as a
// dropped file. CSV is synthetic, shaped like pip-licenses output with an optional scope column.

import hostedMitService from '../../fixtures/trees/dev/hosted-mit-service.package-lock.json?raw';
import hostedMitServiceV2 from '../../fixtures/trees/dev/hosted-mit-service.v2.package-lock.json?raw';
import distributedMitBundle from '../../fixtures/trees/dev/distributed-mit-bundle.package-lock.json?raw';
import gpl3Library from '../../fixtures/trees/dev/gpl3-library.package-lock.json?raw';
import inventoryCsv from '../../fixtures/csv/pip-licenses-sample.csv?raw';
import type { InputKind } from '../worker/protocol.ts';

export interface Sample {
  id: string;
  label: string;
  kind: InputKind;
  fileName: string;
  text: string;
}

export const SAMPLES: readonly Sample[] = [
  { id: 'distributed-mit-bundle', label: 'distributed-mit-bundle (npm lockfile)', kind: 'npm-lock', fileName: 'distributed-mit-bundle.package-lock.json', text: distributedMitBundle },
  { id: 'gpl3-library', label: 'gpl3-library (npm lockfile)', kind: 'npm-lock', fileName: 'gpl3-library.package-lock.json', text: gpl3Library },
  { id: 'pip-licenses-sample', label: 'pip-licenses-shaped inventory (synthetic CSV)', kind: 'csv', fileName: 'pip-licenses-sample.csv', text: inventoryCsv },
  {
    id: 'hosted-mit-service',
    label: 'hosted-mit-service (npm lockfile v3)',
    kind: 'npm-lock',
    fileName: 'hosted-mit-service.package-lock.json',
    text: hostedMitService,
  },
  {
    id: 'hosted-mit-service.v2',
    label: 'hosted-mit-service.v2 (one licence changed)',
    kind: 'npm-lock',
    fileName: 'hosted-mit-service.v2.package-lock.json',
    text: hostedMitServiceV2,
  },
];
