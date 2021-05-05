import type { ObjMap } from '../jsutils/ObjMap';
import { keyMap } from '../jsutils/keyMap';
import { inspect } from '../jsutils/inspect';
import { invariant } from '../jsutils/invariant';

import type { ValueNode } from '../language/ast';
import { Kind } from '../language/kinds';

import type { GraphQLInputType } from '../type/definition';
import {
  isLeafType,
  isInputObjectType,
  isListType,
  isNonNullType,
} from '../type/definition';

import { coerceDefaultValue } from './coerceInputValue';
import { literalToValue } from './literalToValue';
import { replaceASTVariables } from './replaceASTVariables';

/**
 * Produces a coerced "internal" JavaScript value given a GraphQL Value AST.
 *
 * Returns `undefined` when the value could not be validly coerced according to
 * the provided type.
 */
export function coerceInputLiteral(
  valueNode: ValueNode,
  type: GraphQLInputType,
  variables?: ?ObjMap<mixed>,
): mixed | void {
  if (valueNode.kind === Kind.VARIABLE) {
    if (!variables || isMissingVariable(valueNode, variables)) {
      return; // Invalid: intentionally return no value.
    }
    const variableValue = variables[valueNode.name.value];
    if (variableValue === null && isNonNullType(type)) {
      return; // Invalid: intentionally return no value.
    }
    // Note: This does no further checking that this variable is correct.
    // This assumes that this query has been validated, this variable usage
    // is of the correct type, and that this variable value is a coerced
    // "internal" value.
    return variableValue;
  }

  if (isNonNullType(type)) {
    if (valueNode.kind === Kind.NULL) {
      return; // Invalid: intentionally return no value.
    }
    return coerceInputLiteral(valueNode, type.ofType, variables);
  }

  if (valueNode.kind === Kind.NULL) {
    // This is explicitly returning the value null.
    return null;
  }

  if (isListType(type)) {
    const itemType = type.ofType;
    if (valueNode.kind === Kind.LIST) {
      const coercedValue = [];
      for (const itemNode of valueNode.values) {
        let itemValue = coerceInputLiteral(itemNode, itemType, variables);
        if (itemValue === undefined) {
          // If an array contains a missing variable, it is either coerced to
          // null or if the item type is non-null, or it considered invalid.
          if (
            isMissingVariable(itemNode, variables) &&
            !isNonNullType(itemType)
          ) {
            itemValue = null;
          } else {
            return; // Invalid: intentionally return no value.
          }
        }
        coercedValue.push(itemValue);
      }
      return coercedValue;
    }
    // Lists accept a non-list value as a list of one.
    const itemValue = coerceInputLiteral(valueNode, itemType, variables);
    if (itemValue === undefined) {
      return; // Invalid: intentionally return no value.
    }
    return [itemValue];
  }

  if (isInputObjectType(type)) {
    if (valueNode.kind !== Kind.OBJECT) {
      return; // Invalid: intentionally return no value.
    }
    const coercedValue = {};
    const fieldNodes = keyMap(valueNode.fields, (field) => field.name.value);
    for (const field of Object.values(type.getFields())) {
      const fieldNode = fieldNodes[field.name];
      if (fieldNode && !isMissingVariable(fieldNode.value, variables)) {
        const fieldValue = coerceInputLiteral(
          fieldNode.value,
          field.type,
          variables,
        );
        if (fieldValue === undefined) {
          return; // Invalid: intentionally return no value.
        }
        coercedValue[field.name] = fieldValue;
      } else if (field.defaultValue !== undefined) {
        coercedValue[field.name] = coerceDefaultValue(field);
      } else if (isNonNullType(field.type)) {
        return; // Invalid: intentionally return no value.
      }
    }
    return coercedValue;
  }

  // istanbul ignore else (See: 'https://github.com/graphql/graphql-js/issues/2618')
  if (isLeafType(type)) {
    const constValueNode = replaceASTVariables(valueNode, variables);

    // Scalars and Enums fulfill parsing a literal value via parseLiteral().
    // Invalid values represent a failure to parse correctly, in which case
    // no value is returned.
    try {
      return type.parseLiteral
        ? type.parseLiteral(constValueNode)
        : type.parseValue(literalToValue(constValueNode, type));
    } catch (_error) {
      return; // Invalid: ignore error and intentionally return no value.
    }
  }

  // istanbul ignore next (Not reachable. All possible input types have been considered)
  invariant(false, 'Unexpected input type: ' + inspect((type: empty)));
}

// Returns true if the provided valueNode is a variable which is not defined
// in the set of variables.
function isMissingVariable(
  valueNode: ValueNode,
  variables: ?ObjMap<mixed>,
): boolean {
  return (
    valueNode.kind === Kind.VARIABLE &&
    (variables == null || variables[valueNode.name.value] === undefined)
  );
}
