import { inspect } from '../jsutils/inspect';
import { invariant } from '../jsutils/invariant';
import { keyValMap } from '../jsutils/keyValMap';

import { Kind } from '../language/kinds';
import type { ConstValueNode } from '../language/ast';
import type { GraphQLInputType } from '../type/definition';
import {
  getNamedType,
  isScalarType,
  isInputObjectType,
} from '../type/definition';

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
): mixed {
  if (valueNode.kind === Kind.NULL) {
    return null;
  }

  const namedType = type && getNamedType(type);

  if (valueNode.kind === Kind.LIST) {
    return valueNode.values.map((node) => literalToValue(node, namedType));
  }

  // Does this type (if provided) define `literalToValue` which returns a value?
  if (isScalarType(namedType) && namedType.literalToValue != null) {
    const literal = namedType.literalToValue(valueNode);
    if (literal !== undefined) {
      return literal;
    }
  }

  switch (valueNode.kind) {
    case Kind.BOOLEAN:
    case Kind.STRING:
    case Kind.ENUM:
      return valueNode.value;
    case Kind.INT:
      return parseInt(valueNode.value, 10);
    case Kind.FLOAT:
      return parseFloat(valueNode.value);
    case Kind.OBJECT: {
      const fieldDefs = isInputObjectType(namedType)
        ? namedType.getFields()
        : undefined;
      return keyValMap(
        valueNode.fields,
        (field) => field.name.value,
        (field) => {
          const fieldDef = fieldDefs && fieldDefs[field.name.value];
          return literalToValue(field.value, fieldDef && fieldDef.type);
        },
      );
    }
  }

  // istanbul ignore next (Not reachable. All possible const value nodes have been considered)
  invariant(false, 'Unexpected: ' + inspect((valueNode: empty)));
}
