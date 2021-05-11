import { hasOwnProperty } from '../jsutils/hasOwnProperty';
import { inspect } from '../jsutils/inspect';
import { invariant } from '../jsutils/invariant';
import { keyMap } from '../jsutils/keyMap';
import { keyValMap } from '../jsutils/keyValMap';

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
): mixed {
  if (isNonNullType(type)) {
    if (valueNode.kind === Kind.NULL) {
      return; // Invalid: intentionally return no value.
    }
    return literalToValue(valueNode, type.ofType);
  }

  if (valueNode.kind === Kind.NULL) {
    return null;
  }

  if (isListType(type)) {
    if (valueNode.kind !== Kind.LIST) {
      return literalToValue(valueNode, type.ofType);
    }
    const value = [];
    for (const itemNode of valueNode.values) {
      const itemValue = literalToValue(itemNode, type.ofType);
      if (itemValue === undefined) {
        return; // Invalid: intentionally return no value.
      }
      value.push(itemValue);
    }
    return value;
  }

  if (isInputObjectType(type)) {
    if (valueNode.kind !== Kind.OBJECT) {
      return; // Invalid: intentionally return no value.
    }
    const value = {};
    const fieldDefs = type.getFields();
    const hasUndefinedField = valueNode.fields.some(
      (field) => !hasOwnProperty(fieldDefs, field.name.value),
    );
    if (hasUndefinedField) {
      return; // Invalid: intentionally return no value.
    }
    const fieldNodes = keyMap(valueNode.fields, (field) => field.name.value);
    for (const field of Object.values(type.getFields())) {
      const fieldNode = fieldNodes[field.name];
      if (!fieldNode && isRequiredInput(field)) {
        return; // Invalid: intentionally return no value.
      }
      const fieldValue = literalToValue(fieldNode.value, field.type);
      if (fieldValue === undefined) {
        return; // Invalid: intentionally return no value.
      }
      value[field.name] = fieldValue;
    }
    return value;
  }

  // istanbul ignore else (See: 'https://github.com/graphql/graphql-js/issues/2618')
  if (isLeafType(type)) {
    return type.literalToValue
      ? type.literalToValue(valueNode)
      : defaultScalarLiteralToValue(valueNode);
  }

  // istanbul ignore next (Not reachable. All possible input types have been considered)
  invariant(false, 'Unexpected input type: ' + inspect((type: empty)));
}

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
export function defaultScalarLiteralToValue(valueNode: ConstValueNode): mixed {
  switch (valueNode.kind) {
    case Kind.NULL:
      return null;
    case Kind.BOOLEAN:
    case Kind.STRING:
    case Kind.ENUM:
      return valueNode.value;
    case Kind.INT:
      return parseInt(valueNode.value, 10);
    case Kind.FLOAT:
      return parseFloat(valueNode.value);
    case Kind.LIST:
      return valueNode.values.map((node) => defaultScalarLiteralToValue(node));
    case Kind.OBJECT: {
      return keyValMap(
        valueNode.fields,
        (field) => field.name.value,
        (field) => defaultScalarLiteralToValue(field.value),
      );
    }
  }

  // istanbul ignore next (Not reachable. All possible const value nodes have been considered)
  invariant(false, 'Unexpected: ' + inspect((valueNode: empty)));
}
