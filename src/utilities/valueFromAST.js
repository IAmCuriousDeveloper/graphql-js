import type { ObjMap } from '../jsutils/ObjMap';
import { deprecationWarning } from '../jsutils/deprecationWarning';

import type { ValueNode } from '../language/ast';
import type { GraphQLInputType } from '../type/definition';

import { coerceInputLiteral } from './coerceInputLiteral';

/**
 * Produces a JavaScript value given a GraphQL Value AST.
 *
 * A GraphQL type must be provided, which will be used to interpret different
 * GraphQL Value literals.
 *
 * Returns `undefined` when the value could not be validly coerced according to
 * the provided type.
 *
 * | GraphQL Value        | JSON Value    |
 * | -------------------- | ------------- |
 * | Input Object         | Object        |
 * | List                 | Array         |
 * | Boolean              | Boolean       |
 * | String               | String        |
 * | Int / Float          | Number        |
 * | Enum Value           | Mixed         |
 * | NullValue            | null          |
 *
 * @deprecated use coerceInputLiteral
 */
export function valueFromAST(
  valueNode: ?ValueNode,
  type: GraphQLInputType,
  variables?: ?ObjMap<mixed>,
): mixed {
  deprecationWarning('valueFromAST', 'Use "coerceInputLiteral".');
  if (!valueNode) {
    return;
  }
  return coerceInputLiteral(valueNode, type, variables || undefined);
}
