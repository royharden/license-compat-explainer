// `-or-later` expansion (PLAN §3.4): an or-later leaf becomes an OR over the recognised `-only`
// versions in the catalogue, e.g. GPL-2.0-or-later -> GPL-2.0-only OR GPL-3.0-only. An exception on
// the leaf is carried to every alternative (and re-checked: a pair modelled only for one version
// becomes `unsupported_exception` on the others). Unmodelled future versions are not invented.

import type { ExprNode } from '../types.ts';
import { getLicence } from '../rules/licences.ts';
import { catalogueLeaf } from './leaf.ts';

export function expandOrLater(node: ExprNode): ExprNode {
  if (node.type === 'leaf') {
    const leaf = node.leaf;
    if (leaf.licenceId === null) return node;
    if (leaf.status !== 'supported' && leaf.status !== 'unsupported_exception') return node;
    if (leaf.reason === 'multiple_exceptions') return node;
    const licence = getLicence(leaf.licenceId);
    if (!licence || licence.expandsTo === null) return node;
    const alternatives: ExprNode[] = licence.expandsTo.map((id): ExprNode => ({
      type: 'leaf',
      leaf: catalogueLeaf(id, leaf.exceptionId, leaf.text),
    }));
    if (alternatives.length === 1) return alternatives[0];
    return { type: 'or', children: alternatives, expandedFrom: leaf.text };
  }
  if (node.type === 'and') return { type: 'and', children: node.children.map(expandOrLater) };
  return node.expandedFrom === undefined
    ? { type: 'or', children: node.children.map(expandOrLater) }
    : { type: 'or', children: node.children.map(expandOrLater), expandedFrom: node.expandedFrom };
}
