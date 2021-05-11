import { ConstValueNode } from '../language/ast';
import { GraphQLInputType } from '../type/definition';

/**
 * Produces a JavaScript value given a GraphQL Value AST and a GraphQL type.
 *
 * Scalar types are converted by calling the `literalToValue` method on that
 * type, otherwise the default scalar `literalToValue` method is used, defined
 * below.
 *
 * Note: This function does not perform any coercion.
 */
export function literalToValue(
  valueNode: ConstValueNode,
  type: GraphQLInputType,
): unknown;

/**
 * The default implementation to convert scalar literals to values.
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
 * @internal
 */
export function defaultScalarLiteralToValue(valueNode: ConstValueNode): unknown;
