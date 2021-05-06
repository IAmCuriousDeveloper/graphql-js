import { ConstValueNode } from '../language/ast';
import { GraphQLInputType } from '../type/definition';

/**
 * Produces a JavaScript value given a GraphQL Value AST.
 *
 * A GraphQL type may be provided, which will be used to interpret different
 * JavaScript values if it defines a `literalToValue` method.
 *
 * | GraphQL Value        | JavaScript Value |
 * | -------------------- | ---------------- |
 * | Input Object         | Object           |
 * | List                 | Array            |
 * | Boolean              | Boolean          |
 * | String / Enum        | String           |
 * | Int / Float          | Number           |
 * | Null                 | null             |
 *
 * Note: This function does not perform any type validation or coercion.
 */
export function literalToValue(
  valueNode: ConstValueNode,
  type?: GraphQLInputType,
): unknown;
