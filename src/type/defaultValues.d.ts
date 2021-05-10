import { ConstValueNode } from '../language/ast';

import { GraphQLInputType, GraphQLDefaultValueUsage } from './definition';

/**
 * @internal
 */
export function getLiteralDefaultValue(
  usage: GraphQLDefaultValueUsage,
  type: GraphQLInputType,
): ConstValueNode;

/**
 * @internal
 */
export function getCoercedDefaultValue(
  usage: GraphQLDefaultValueUsage,
  type: GraphQLInputType,
): unknown;
