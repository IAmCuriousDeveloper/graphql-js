import type { ObjMap } from '../jsutils/ObjMap';

import type { ValueNode, ConstValueNode } from '../language/ast';
import { Kind } from '../language/kinds';
import { visit } from '../language/visitor';

import { valueToLiteral } from './valueToLiteral';

/**
 * Replaces any Variables found within an AST Value literal with literals
 * supplied from a map of variable values, returning a constant value.
 *
 * Used primarily to ensure only complete constant values are used during input
 * coercion of custom scalars which accept complex literals.
 */
export function replaceASTVariables(
  valueNode: ValueNode,
  variables: ?ObjMap<mixed>,
): ConstValueNode {
  return visit(valueNode, {
    Variable(node) {
      return valueToLiteral(variables?.[node.name.value]);
    },
    ObjectValue(node) {
      return {
        ...node,
        // Filter out any fields with a missing variable.
        fields: node.fields.filter(
          (field) =>
            field.value.kind !== Kind.VARIABLE ||
            variables?.[field.value.name.value] !== undefined,
        ),
      };
    },
  });
}
