// Expression evaluator / combinator (PLAN §3.1-§3.2). It knows nothing about rules: every leaf is
// decided by the injected `evaluateLeaf(leaf, ctx)` (rules/engine.ts), so M2 can replace the rule
// table without touching this file. `-or-later` leaves are expanded first; `WITH` pairs are already
// single leaves (normalise.ts), so an exception is evaluated before any class rule could see the base.
//
// OR takes the most favourable alternative and records the chosen side (an all-unknown OR stays
// unknown); AND takes the least favourable and every leaf counts.

import type {
  ExprNode,
  EvalContext,
  ExpressionEvaluation,
  LeafEvaluation,
  LeafEvaluator,
  OptionId,
  OrChoice,
  RuleId,
  RuleResult,
  Verdict,
} from '../types.ts';
import { bestForOr, worstForAnd } from '../verdict.ts';
import { expandOrLater } from './expand.ts';
import { choiceText } from './normalise.ts';

interface InternalLeaf {
  evaluation: LeafEvaluation;
  result: RuleResult;
}

interface NodeEvaluation {
  verdict: Verdict;
  leaves: InternalLeaf[];
  choices: OrChoice[];
}

function evaluateNode(node: ExprNode, ctx: EvalContext, evaluateLeaf: LeafEvaluator): NodeEvaluation {
  if (node.type === 'leaf') {
    const result = evaluateLeaf(node.leaf, ctx);
    const leaf = node.leaf;
    return {
      verdict: result.verdict,
      leaves: [
        {
          result,
          evaluation: {
            leafText: leaf.text,
            licenceId: leaf.licenceId,
            exceptionId: leaf.exceptionId,
            status: leaf.status,
            expandedFrom: leaf.expandedFrom,
            ruleId: result.ruleId,
            verdict: result.verdict,
            counted: true,
            stub: result.stub,
          },
        },
      ],
      choices: [],
    };
  }

  const children = node.children.map((child) => evaluateNode(child, ctx, evaluateLeaf));
  const verdicts = children.map((c) => c.verdict);

  if (node.type === 'or') {
    const best = bestForOr(verdicts);
    const leaves: InternalLeaf[] = [];
    children.forEach((child, k) => {
      for (const l of child.leaves) {
        leaves.push(k === best ? l : { result: l.result, evaluation: { ...l.evaluation, counted: false } });
      }
    });
    const choice: OrChoice = {
      alternatives: node.children.map(choiceText),
      chosen: choiceText(node.children[best]),
      chosenIndex: best,
    };
    return { verdict: verdicts[best], leaves, choices: [choice, ...children[best].choices] };
  }

  const worst = worstForAnd(verdicts);
  return {
    verdict: verdicts[worst],
    leaves: children.flatMap((c) => c.leaves),
    choices: children.flatMap((c) => c.choices),
  };
}

function pushUnique<T>(target: T[], values: readonly T[]): void {
  for (const v of values) if (!target.includes(v)) target.push(v);
}

export function evaluateExpression(expr: ExprNode, ctx: EvalContext, evaluateLeaf: LeafEvaluator): ExpressionEvaluation {
  const root = evaluateNode(expandOrLater(expr), ctx, evaluateLeaf);
  const ruleIds: RuleId[] = [];
  const obligations: string[] = [];
  const assumptions: string[] = [];
  const options: OptionId[] = [];
  for (const l of root.leaves) {
    if (!l.evaluation.counted) continue;
    pushUnique(ruleIds, [l.result.ruleId]);
    pushUnique(obligations, l.result.obligations);
    pushUnique(assumptions, l.result.assumptions);
    pushUnique(options, l.result.options);
  }
  return {
    verdict: root.verdict,
    ruleIds,
    leaves: root.leaves.map((l) => l.evaluation),
    orChoices: root.choices,
    chosenSide: root.choices.length > 0 ? root.choices[0].chosen : null,
    obligations,
    assumptions,
    options,
  };
}
