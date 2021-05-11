import { Maybe } from '../jsutils/Maybe';

import { ConstValueNode } from '../language/ast';
import { GraphQLInputType } from '../type/definition';

/**
 * Produces a GraphQL Value AST given a JavaScript value and a GraphQL type.
 *
 * Scalar types are converted by calling the `valueToLiteral` method on that
 * type, otherwise the default scalar `valueToLiteral` method is used, defined
 * below.
 *
 * Note: This function does not perform any coercion.
 */
export function valueToLiteral(
  value: unknown,
  type: GraphQLInputType,
): Maybe<ConstValueNode>;

/**
 * The default implementation to convert scalar values to literals.
 *
 * | JavaScript Value  | GraphQL Value        |
 * | ----------------- | -------------------- |
 * | Object            | Input Object         |
 * | Array             | List                 |
 * | Boolean           | Boolean              |
 * | String            | String               |
 * | Number            | Int / Float          |
 * | null / undefined  | Null                 |
 *
 * @internal
 */
export function defaultScalarValueToLiteral(value: unknown): ConstValueNode;
