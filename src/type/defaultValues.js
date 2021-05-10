import { invariant } from '../jsutils/invariant';
import type { ConstValueNode } from '../language/ast';

import { astFromValue } from '../utilities/astFromValue';
import { valueFromAST } from '../utilities/valueFromAST';

import type { GraphQLInputType, GraphQLDefaultValueUsage } from './definition';

/**
 * @internal
 */
export function getLiteralDefaultValue(
  usage: GraphQLDefaultValueUsage,
  type: GraphQLInputType,
): ConstValueNode {
  if (usage.literal) {
    return usage.literal;
  }
  // Memoize the result of converting value to literal in a hidden field.
  let literal = (usage: any)._memoizedLiteral;
  // istanbul ignore else (memoized case)
  if (!literal) {
    literal = astFromValue(usage.value, type);
    invariant(literal, 'Value cannot be converted to literal for this type');
    (usage: any)._memoizedLiteral = literal;
  }
  return literal;
}

/**
 * @internal
 */
export function getCoercedDefaultValue(
  usage: GraphQLDefaultValueUsage,
  type: GraphQLInputType,
): mixed {
  if (usage.value !== undefined) {
    return usage.value;
  }
  // Memoize the result of coercing the default value in a hidden field.
  let coercedValue = (usage: any)._memoizedCoercedValue;
  // istanbul ignore else (memoized case)
  if (coercedValue === undefined) {
    coercedValue = valueFromAST(usage.literal, type);
    invariant(
      coercedValue !== undefined,
      'Literal cannot be converted to value for this type',
    );
    (usage: any)._memoizedCoercedValue = coercedValue;
  }
  return coercedValue;
}
