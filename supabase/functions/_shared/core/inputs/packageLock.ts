// npm package-lock.json reader (PLAN §1.2, C§1.1.2).
//
// v2/v3: `packages[""]` is the root context (not a finding). Every installed location is a distinct
// node, so nested duplicate versions stay separate. Edges are resolved with npm's ancestor lookup
// (`<dir>/node_modules/<name>`, then each parent directory). A breadth-first walk from the root over
// name-sorted edges gives one deterministic shortest path per node (ties broken by name order) and a
// visited set makes cycles and shared nodes terminate. Edges that cannot be resolved, link entries
// whose target is missing, and nodes with no path from the root are coverage gaps, never invented paths.
//
// v1: an "unsupported lockfile version" warning; the bounded `dependencies` tree is listed with every
// entry's licence marked `lockfile_v1` (v1 has no licence fields), so each becomes `unknown`.
//
// Only these entry fields are read: name, version, license, licenses, dev, dependencies,
// optionalDependencies, peerDependencies, peerDependenciesMeta, devDependencies, link, resolved.
// `resolved` is read only on link entries (as the link target location). Descriptions, scripts,
// integrity and everything else are ignored.

import type { CoverageGap, InputResult, InputWarning, InventoryItem, RawLicence, Scope } from '../types.ts';
import {
  MAX_ALTERNATE_PATH_COUNT,
  MAX_FILE_BYTES,
  MAX_LEGACY_LICENCE_ENTRIES,
  MAX_NAME_CHARS,
  MAX_NESTING_DEPTH,
  MAX_PACKAGES,
  MAX_VERSION_CHARS,
  clip,
} from './caps.ts';
import { getBoolean, getRecord, getString, isRecord, parseJsonSafe } from './safeJson.ts';
import type { JsonRecord, JsonValue } from './safeJson.ts';
import { utf8ByteLength } from '../util/utf8.ts';

export const ROOT_LABEL = 'root';
const NODE_MODULES = 'node_modules/';

function fail(code: string, message: string): InputResult {
  return { ok: false, error: { code, message } };
}

/** Package name implied by an install location (`node_modules/@s/x` -> `@s/x`; `packages/foo` -> `foo`). */
export function nameFromLocation(location: string): string {
  const idx = location.lastIndexOf(NODE_MODULES);
  if (idx >= 0) return location.slice(idx + NODE_MODULES.length);
  const parts = location.split('/');
  return parts[parts.length - 1] ?? location;
}

/** Licence metadata of a lockfile entry, without guessing. */
export function rawLicenceFromEntry(entry: JsonRecord): RawLicence {
  const lic = entry['license'];
  if (typeof lic === 'string') return { kind: 'string', value: lic };
  if (lic !== undefined) return legacyLicence(lic);
  const lics = entry['licenses'];
  if (lics !== undefined) return legacyLicence(lics);
  return { kind: 'missing' };
}

function legacyType(value: JsonValue): string | null {
  if (typeof value === 'string') return value;
  if (isRecord(value)) {
    const t = value['type'];
    return typeof t === 'string' ? t : null;
  }
  return null;
}

function legacyLicence(value: JsonValue): RawLicence {
  if (Array.isArray(value)) {
    const values: string[] = [];
    for (const item of value.slice(0, MAX_LEGACY_LICENCE_ENTRIES)) {
      const t = legacyType(item);
      if (t === null) return { kind: 'invalid' };
      values.push(t);
    }
    if (values.length === 0) return { kind: 'missing' };
    return { kind: 'legacy_array', values };
  }
  if (isRecord(value)) {
    const t = legacyType(value);
    return t === null ? { kind: 'invalid' } : { kind: 'legacy_object', value: t };
  }
  return { kind: 'invalid' };
}

export function parsePackageLock(text: string): InputResult {
  const bytes = utf8ByteLength(text);
  if (bytes > MAX_FILE_BYTES) {
    return fail('file_too_large', `File is ${bytes} bytes; the limit is ${MAX_FILE_BYTES} bytes (5 MB).`);
  }
  const parsed = parseJsonSafe(text);
  if (!parsed.ok) return fail(parsed.code, parsed.message);
  const top = parsed.value;
  if (!isRecord(top)) return fail('not_a_package_lock', 'The top-level JSON value is not an object.');

  const rawVersion = top['lockfileVersion'];
  const version = typeof rawVersion === 'number' ? rawVersion : null;
  const packages = getRecord(top, 'packages');

  if ((version === 2 || version === 3) && packages) return parseGraph(top, packages, version, []);
  if (version === 1 || (packages === null && getRecord(top, 'dependencies') !== null)) return parseV1(top, version);
  if (packages) {
    return parseGraph(top, packages, version, [
      {
        code: 'unrecognised_lockfile_version',
        message: `lockfileVersion ${String(version)} is not 2 or 3; the packages map was read as version 3.`,
      },
    ]);
  }
  return fail('not_a_package_lock', 'No lockfileVersion 2/3 `packages` map or v1 `dependencies` map was found.');
}

// ---------------------------------------------------------------- v2 / v3 graph

interface LockNode {
  location: string;
  name: string;
  version: string;
  entry: JsonRecord;
  isLink: boolean;
  linkTarget: string | null;
}

interface EdgeSpec {
  name: string;
  optional: boolean;
}

function isWorkspaceLocation(location: string): boolean {
  return location === '' || !location.includes(NODE_MODULES.slice(0, -1));
}

/** Dependency names declared by an entry; `required` wins when a name appears in several maps. */
export function edgeSpecs(entry: JsonRecord, location: string): EdgeSpec[] {
  const specs = new Map<string, boolean>(); // name -> optional
  const add = (key: string, optional: (name: string) => boolean): void => {
    const rec = getRecord(entry, key);
    if (!rec) return;
    for (const name of Object.keys(rec)) {
      const opt = optional(name);
      const prev = specs.get(name);
      specs.set(name, prev === undefined ? opt : prev && opt);
    }
  };
  const peerMeta = getRecord(entry, 'peerDependenciesMeta');
  add('dependencies', () => false);
  add('optionalDependencies', () => true);
  add('peerDependencies', (name) => getBoolean(getRecord(peerMeta, name), 'optional'));
  // devDependencies are installed only for the root and workspace packages.
  if (isWorkspaceLocation(location)) add('devDependencies', () => false);
  return [...specs.entries()]
    .map(([name, optional]) => ({ name, optional }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** npm ancestor lookup: `<dir>/node_modules/<name>`, then each parent directory, ending at the root. */
export function resolveDependency(fromLocation: string, name: string, exists: (location: string) => boolean): string | null {
  const segments = fromLocation === '' ? [] : fromLocation.split('/');
  for (;;) {
    const last = segments[segments.length - 1];
    if (last !== 'node_modules') {
      const dir = segments.join('/');
      const candidate = (dir === '' ? '' : dir + '/') + NODE_MODULES + name;
      if (exists(candidate)) return candidate;
    }
    if (segments.length === 0) return null;
    segments.pop();
  }
}

function parseGraph(top: JsonRecord, packages: JsonRecord, version: number | null, warnings: InputWarning[]): InputResult {
  const locations = Object.keys(packages).filter((k) => k !== '');
  if (locations.length > MAX_PACKAGES) {
    return fail('too_many_packages', `The lockfile lists ${locations.length} packages; the limit is ${MAX_PACKAGES}.`);
  }

  let rootEntry = getRecord(packages, '');
  if (!rootEntry) {
    warnings.push({ code: 'missing_root_entry', message: 'packages[""] is missing; no dependency paths can be traced from the root.' });
    rootEntry = Object.create(null) as JsonRecord;
  }
  const rootName = getString(rootEntry, 'name') ?? getString(top, 'name');
  const rootVersion = getString(rootEntry, 'version') ?? getString(top, 'version');

  const nodes = new Map<string, LockNode>();
  for (const location of locations) {
    const entry = packages[location];
    if (!isRecord(entry)) {
      warnings.push({ code: 'invalid_entry', message: `Entry ${clip(location, 300)} is not an object and was skipped.` });
      continue;
    }
    const isLink = entry['link'] === true;
    nodes.set(location, {
      location,
      name: clip(getString(entry, 'name') ?? nameFromLocation(location), MAX_NAME_CHARS),
      version: clip(getString(entry, 'version') ?? '', MAX_VERSION_CHARS),
      entry,
      isLink,
      linkTarget: isLink ? getString(entry, 'resolved') : null,
    });
  }

  const gaps: CoverageGap[] = [];
  const gapKeys = new Set<string>();
  const addGap = (gap: CoverageGap): void => {
    const key = `${gap.kind}|${gap.from ?? ''}|${gap.dependency ?? ''}`;
    if (gapKeys.has(key)) return;
    gapKeys.add(key);
    gaps.push(gap);
  };

  // Breadth-first walk from the root context ('').
  const parent = new Map<string, string>();
  const depth = new Map<string, number>([['', 0]]);
  const dependents = new Map<string, Set<string>>();
  const queue: string[] = [''];
  const exists = (loc: string): boolean => nodes.has(loc);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    const entry = current === '' ? rootEntry : nodes.get(current)?.entry;
    if (!entry) continue;
    for (const spec of edgeSpecs(entry, current)) {
      let target = resolveDependency(current, spec.name, exists);
      if (target === null) {
        addGap({
          kind: spec.optional ? 'unresolved_optional_edge' : 'unresolved_edge',
          from: current,
          dependency: spec.name,
          detail: spec.optional
            ? `Optional dependency ${spec.name} is not installed in this lockfile.`
            : `Dependency ${spec.name} could not be resolved from ${current === '' ? 'the root' : current}.`,
        });
        continue;
      }
      const node = nodes.get(target);
      if (node && node.isLink) {
        const linkTarget = node.linkTarget;
        if (linkTarget === null || !nodes.has(linkTarget)) {
          addGap({
            kind: 'link_target_missing',
            from: target,
            dependency: spec.name,
            detail: `Link ${target} points to ${linkTarget ?? '(no resolved path)'}, which has no lockfile entry.`,
          });
          continue;
        }
        target = linkTarget;
      }
      let set = dependents.get(target);
      if (!set) {
        set = new Set<string>();
        dependents.set(target, set);
      }
      set.add(current);
      if (!depth.has(target)) {
        depth.set(target, (depth.get(current) ?? 0) + 1);
        parent.set(target, current);
        queue.push(target);
      }
    }
  }

  const items: InventoryItem[] = [];
  const sortedLocations = [...nodes.keys()].sort();
  for (const location of sortedLocations) {
    const node = nodes.get(location);
    if (!node || node.isLink) continue; // link entries carry no metadata; their targets are the findings
    const reachable = depth.has(location);
    let path: string[] | null = null;
    let pathNote: string | null = null;
    if (reachable) {
      const names: string[] = [];
      let cursor: string | undefined = location;
      while (cursor !== undefined && cursor !== '') {
        names.push(nodes.get(cursor)?.name ?? nameFromLocation(cursor));
        cursor = parent.get(cursor);
      }
      names.push(ROOT_LABEL);
      path = names.reverse();
    } else {
      pathNote = 'no path from the root (extraneous entry or unresolved edge)';
      addGap({
        kind: 'no_path_from_root',
        from: location,
        dependency: null,
        detail: `${location} is listed in the lockfile but cannot be reached from the root.`,
      });
    }
    const dependentCount = dependents.get(location)?.size ?? 0;
    const scope: Scope = node.entry['dev'] === true ? 'dev' : 'runtime';
    items.push({
      source: 'npm',
      name: node.name,
      version: node.version,
      location,
      sourceRow: null,
      ordinal: null,
      occurrence: `npm:${node.name}@${node.version}|${location}`,
      scope,
      licence: rawLicenceFromEntry(node.entry),
      path,
      pathNote,
      alternatePathCount: Math.min(Math.max(dependentCount - 1, 0), MAX_ALTERNATE_PATH_COUNT),
    });
  }

  return {
    ok: true,
    inventory: {
      kind: 'npm-lock',
      lockfileVersion: version,
      rootName,
      rootVersion,
      items,
      coverageGaps: gaps,
      warnings,
      csv: null,
    },
  };
}

// ---------------------------------------------------------------- v1 listing

function parseV1(top: JsonRecord, version: number | null): InputResult {
  const warnings: InputWarning[] = [
    {
      code: 'unsupported_lockfile_version',
      message:
        'Lockfile version 1 has no licence fields; every entry is listed as unknown. Regenerate the lockfile with npm 7 or later for a real analysis.',
    },
  ];
  const items: InventoryItem[] = [];
  let truncated = false;
  let tooMany = false;

  const walk = (deps: JsonRecord, parentLocation: string, level: number): void => {
    for (const name of Object.keys(deps).sort()) {
      if (tooMany) return;
      const entry = deps[name];
      if (!isRecord(entry)) continue;
      const location = (parentLocation === '' ? '' : parentLocation + '/') + NODE_MODULES + name;
      if (items.length >= MAX_PACKAGES) {
        tooMany = true;
        return;
      }
      const safeName = clip(name, MAX_NAME_CHARS);
      const ver = clip(getString(entry, 'version') ?? '', MAX_VERSION_CHARS);
      items.push({
        source: 'npm',
        name: safeName,
        version: ver,
        location,
        sourceRow: null,
        ordinal: null,
        occurrence: `npm:${safeName}@${ver}|${location}`,
        scope: entry['dev'] === true ? 'dev' : 'runtime',
        licence: { kind: 'lockfile_v1' },
        path: null,
        pathNote: 'lockfile v1: dependency paths and licences are not recorded',
        alternatePathCount: 0,
      });
      const nested = getRecord(entry, 'dependencies');
      if (nested) {
        if (level + 1 >= MAX_NESTING_DEPTH) truncated = true;
        else walk(nested, location, level + 1);
      }
    }
  };

  const deps = getRecord(top, 'dependencies');
  if (deps) walk(deps, '', 0);
  if (tooMany) {
    return fail('too_many_packages', `The v1 lockfile lists more than ${MAX_PACKAGES} packages.`);
  }
  if (truncated) {
    warnings.push({
      code: 'nesting_truncated',
      message: `Entries nested deeper than ${MAX_NESTING_DEPTH} levels were not listed.`,
    });
  }
  return {
    ok: true,
    inventory: {
      kind: 'npm-lock',
      lockfileVersion: version ?? 1,
      rootName: getString(top, 'name'),
      rootVersion: getString(top, 'version'),
      items,
      coverageGaps: [],
      warnings,
      csv: null,
    },
  };
}
