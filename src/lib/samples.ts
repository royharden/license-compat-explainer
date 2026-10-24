// Bundled sample inputs for "Load sample" (synthetic fixtures; demo journey steps 2 and 8).
// Imported as raw text through Vite's `?raw` suffix, so they are parsed by the same code as a
// dropped file. More samples (other dev trees, CSV) arrive in M3.

import hostedMitService from '../../fixtures/trees/dev/hosted-mit-service.package-lock.json?raw';
import hostedMitServiceV2 from '../../fixtures/trees/dev/hosted-mit-service.v2.package-lock.json?raw';
import type { InputKind } from '../worker/protocol.ts';

export interface Sample {
  id: string;
  label: string;
  kind: InputKind;
  fileName: string;
  text: string;
}

export const SAMPLES: readonly Sample[] = [
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
