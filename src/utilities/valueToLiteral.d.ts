import { ConstValueNode } from '../language/ast';
import { GraphQLInputType } from '../type/definition';

/**
 * Produces a GraphQL Value AST given a JavaScript object.
 * Function will match JavaScript values to GraphQL AST schema format
 * by using suggested GraphQLInputType. For example:
 *
 *     valueToLiteral("value", GraphQLString)
 *
 * A GraphQL type may be provided, which will be used to interpret different
 * JavaScript values if it defines a `valueToLiteral` method.
 *
 * | JavaScript Value  | GraphQL Value        |
 * | ----------------- | -------------------- |
 * | Object            | Input Object         |
 * | Array             | List                 |
 * | Boolean           | Boolean              |
 * | String            | String Value         |
 * | Number            | Int / Float          |
 * | null / undefined  | NullValue            |
 *
 * Note: This function does not perform any type validation or coercion.
 */
export function valueToLiteral(
  value: unknown,
  type?: GraphQLInputType,
): ConstValueNode;
