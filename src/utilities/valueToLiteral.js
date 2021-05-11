import { hasOwnProperty } from '../jsutils/hasOwnProperty';
import { inspect } from '../jsutils/inspect';
import { invariant } from '../jsutils/invariant';
import { isIterableObject } from '../jsutils/isIterableObject';
import { isObjectLike } from '../jsutils/isObjectLike';

import { Kind } from '../language/kinds';
import type { ConstValueNode } from '../language/ast';

import type { GraphQLInputType } from '../type/definition';
import {
  isNonNullType,
  isListType,
  isInputObjectType,
  isLeafType,
  isRequiredInput,
} from '../type/definition';

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
  value: mixed,
  type: GraphQLInputType,
): ?ConstValueNode {
  if (isNonNullType(type)) {
    if (value == null) {
      return; // Invalid: intentionally return no value.
    }
    return valueToLiteral(value, type.ofType);
  }

  // Like JSON, a null literal is produced for null and undefined.
  if (value == null) {
    return { kind: Kind.NULL };
  }

  if (isListType(type)) {
    if (!isIterableObject(value)) {
      return valueToLiteral(value, type.ofType);
    }
    const values = [];
    for (const itemValue of value) {
      const itemNode = valueToLiteral(itemValue, type.ofType);
      if (!itemNode) {
        return; // Invalid: intentionally return no value.
      }
      values.push(itemNode);
    }
    return { kind: Kind.LIST, values };
  }

  if (isInputObjectType(type)) {
    if (!isObjectLike(value)) {
      return; // Invalid: intentionally return no value.
    }
    const fields = [];
    const fieldDefs = type.getFields();
    const hasUndefinedField = Object.keys(value).some(
      (name) => !hasOwnProperty(fieldDefs, name),
    );
    if (hasUndefinedField) {
      return; // Invalid: intentionally return no value.
    }
    for (const field of Object.values(type.getFields())) {
      const fieldValue = value[field.name];
      if (fieldValue === undefined && isRequiredInput(field)) {
        return; // Invalid: intentionally return no value.
      }
      const fieldNode = valueToLiteral(value[field.name], field.type);
      if (!fieldNode) {
        return; // Invalid: intentionally return no value.
      }
      fields.push({
        kind: Kind.OBJECT_FIELD,
        name: { kind: Kind.NAME, value: field.name },
        value: fieldNode,
      });
    }
    return { kind: Kind.OBJECT, fields };
  }

  // istanbul ignore else (See: 'https://github.com/graphql/graphql-js/issues/2618')
  if (isLeafType(type)) {
    return type.valueToLiteral
      ? type.valueToLiteral(value)
      : defaultScalarValueToLiteral(value);
  }

  // istanbul ignore next (Not reachable. All possible input types have been considered)
  invariant(false, 'Unexpected input type: ' + inspect((type: empty)));
}

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
export function defaultScalarValueToLiteral(value: mixed): ConstValueNode {
  // Like JSON, a null literal is produced for null and undefined.
  if (value == null) {
    return { kind: Kind.NULL };
  }

  switch (typeof value) {
    case 'boolean':
      return { kind: Kind.BOOLEAN, value };
    case 'string':
      return { kind: Kind.STRING, value, block: false };
    case 'number': {
      if (!Number.isFinite(value)) {
        // Like JSON, a null literal is produced for non-finite values.
        return { kind: Kind.NULL };
      }
      const stringValue = String(value);
      // Will parse as an IntValue.
      return /^-?(?:0|[1-9][0-9]*)$/.test(stringValue)
        ? { kind: Kind.INT, value: stringValue }
        : { kind: Kind.FLOAT, value: stringValue };
    }
    case 'object': {
      if (isIterableObject(value)) {
        return {
          kind: Kind.LIST,
          values: Array.from(value, defaultScalarValueToLiteral),
        };
      }
      const fields = [];
      for (const fieldName of Object.keys(value)) {
        const fieldValue = value[fieldName];
        // Like JSON, undefined fields are not included in the literal result.
        if (fieldValue !== undefined) {
          fields.push({
            kind: Kind.OBJECT_FIELD,
            name: { kind: Kind.NAME, value: fieldName },
            value: defaultScalarValueToLiteral(value[fieldName]),
          });
        }
      }
      return { kind: Kind.OBJECT, fields };
    }
  }

  throw new TypeError(`Cannot convert value to AST: ${inspect(value)}.`);
}
