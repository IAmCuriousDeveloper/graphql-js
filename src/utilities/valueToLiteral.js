import { inspect } from '../jsutils/inspect';
import { isIterableObject } from '../jsutils/isIterableObject';

import type { ConstValueNode } from '../language/ast';
import { Kind } from '../language/kinds';

import type { GraphQLInputType } from '../type/definition';
import {
  getNamedType,
  isLeafType,
  isInputObjectType,
} from '../type/definition';

/**
 * Produces a GraphQL Value AST given a JavaScript value.
 *
 * A GraphQL type may be provided, which will be used to interpret different
 * JavaScript values if it defines a `valueToLiteral` method.
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
 * Note: This function does not perform any type validation or coercion.
 */
export function valueToLiteral(
  value: mixed,
  type?: GraphQLInputType,
): ConstValueNode {
  // Like JSON, a null literal is produced for null and undefined.
  if (value == null) {
    return { kind: Kind.NULL };
  }

  const namedType = type && getNamedType(type);

  // Convert JavaScript array to GraphQL list.
  if (isIterableObject(value)) {
    return {
      kind: Kind.LIST,
      values: Array.from(value, (item) => valueToLiteral(item, namedType)),
    };
  }

  // Does this type (if provided) define `valueToLiteral` which returns a value?
  if (isLeafType(namedType) && namedType.valueToLiteral != null) {
    const literal = namedType.valueToLiteral(value);
    if (literal) {
      return literal;
    }
  }

  // Otherwise, perform a JS-to-Literal default equivalency.
  switch (typeof value) {
    case 'boolean':
      return { kind: Kind.BOOLEAN, value };
    case 'string':
      return { kind: Kind.STRING, value };
    case 'number': {
      if (!Number.isFinite(value)) {
        // Like JSON, a null literal is produced for non-finite values.
        return { kind: Kind.NULL };
      }
      const stringNum = String(value);
      // Use Int literals for integer numbers.
      return /^-?(?:0|[1-9][0-9]*)$/.test(stringNum)
        ? { kind: Kind.INT, value: stringNum }
        : { kind: Kind.FLOAT, value: stringNum };
    }
    case 'object': {
      const fields = [];
      const fieldDefs = isInputObjectType(namedType)
        ? namedType.getFields()
        : undefined;
      for (const fieldName of Object.keys(value)) {
        const fieldValue = value[fieldName];
        // Like JSON, undefined fields are not included in the literal result.
        if (fieldValue !== undefined) {
          const fieldDef = fieldDefs && fieldDefs[fieldName];
          fields.push({
            kind: Kind.OBJECT_FIELD,
            name: { kind: Kind.NAME, value: fieldName },
            value: valueToLiteral(value[fieldName], fieldDef && fieldDef.type),
          });
        }
      }
      return { kind: Kind.OBJECT, fields };
    }
  }

  throw new TypeError(`Cannot convert value to AST: ${inspect(value)}.`);
}
