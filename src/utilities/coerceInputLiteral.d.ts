import { Maybe } from '../jsutils/Maybe';
import { ObjMap } from '../jsutils/ObjMap';
import { ValueNode } from '../language/ast';
import { GraphQLInputType } from '../type/definition';

/**
 * Produces a coerced "internal" JavaScript value given a GraphQL Value AST.
 *
 * Returns `undefined` when the value could not be validly coerced according to
 * the provided type.
 */
export function coerceInputLiteral(
  valueNode: ValueNode,
  type: GraphQLInputType,
  variables?: Maybe<ObjMap<unknown>>,
): unknown | undefined;
