import type { Path } from '../jsutils/Path';
import { inspect } from '../jsutils/inspect';
import { invariant } from '../jsutils/invariant';
import { isObjectLike } from '../jsutils/isObjectLike';
import { printPathArray } from '../jsutils/printPathArray';
import { addPath } from '../jsutils/Path';
import { isIterableObject } from '../jsutils/isIterableObject';

import { GraphQLError } from '../error/GraphQLError';

import type { GraphQLInputType } from '../type/definition';
import {
  isLeafType,
  isInputObjectType,
  isListType,
  isNonNullType,
} from '../type/definition';

import { validateInputValue } from './validateInputValue';

type OnErrorCB = (
  path: $ReadOnlyArray<string | number>,
  invalidValue: mixed,
  error: GraphQLError,
) => void;

/**
 * Coerces a JavaScript value given a GraphQL Input Type.
 */
export function coerceInputValue(
  inputValue: mixed,
  type: GraphQLInputType,
  onError: OnErrorCB = defaultOnError,
): mixed {
  const coercedValue = coerceInputValueImpl(inputValue, type);
  if (coercedValue === undefined) {
    validateInputValue(inputValue, type, onError);
  }
  return coercedValue;
}

function defaultOnError(
  path: $ReadOnlyArray<string | number>,
  invalidValue: mixed,
  error: GraphQLError,
): void {
  let errorPrefix = 'Invalid value ' + inspect(invalidValue);
  if (path.length > 0) {
    errorPrefix += ` at "value${printPathArray(path)}"`;
  }
  error.message = errorPrefix + ': ' + error.message;
  throw error;
}

export function coerceDefaultValue(withDefaultValue: {
  +type: GraphQLInputType,
  +defaultValue: mixed,
  ...
}): mixed {
  // Memoize the result of coercing the default value in a field hidden to the
  // type system.
  let coercedDefaultValue = (withDefaultValue: any)._coercedDefaultValue;
  if (coercedDefaultValue === undefined) {
    coercedDefaultValue = coerceInputValueImpl(
      withDefaultValue.defaultValue,
      withDefaultValue.type,
    );
    (withDefaultValue: any)._coercedDefaultValue = coercedDefaultValue;
  }
  return coercedDefaultValue;
}

function coerceInputValueImpl(
  inputValue: mixed,
  type: GraphQLInputType,
  path: Path | void,
): mixed {
  if (isNonNullType(type)) {
    if (inputValue == null) {
      return; // Invalid value
    }
    return coerceInputValueImpl(inputValue, type.ofType, path);
  }

  if (inputValue == null) {
    // Explicitly return the value null.
    return null;
  }

  if (isListType(type)) {
    const itemType = type.ofType;
    if (isIterableObject(inputValue)) {
      const coercedValue = [];
      let index = 0;
      for (const itemValue of inputValue) {
        const coercedItem = coerceInputValueImpl(
          itemValue,
          itemType,
          addPath(path, index++, undefined),
        );
        if (coercedItem === undefined) {
          return; // Invalid value
        }
        coercedValue.push(coercedItem);
      }
      return coercedValue;
    }
    // Lists accept a non-list value as a list of one.
    const coercedItem = coerceInputValueImpl(inputValue, itemType, path);
    return coercedItem === undefined ? undefined : [coercedItem];
  }

  if (isInputObjectType(type)) {
    if (!isObjectLike(inputValue)) {
      return; // Invalid value
    }

    const coercedValue = {};
    const fieldDefs = type.getFields();

    for (const field of Object.values(fieldDefs)) {
      const fieldValue = inputValue[field.name];
      if (fieldValue !== undefined) {
        const coercedFieldValue = coerceInputValueImpl(
          fieldValue,
          field.type,
          addPath(path, field.name, type.name),
        );
        if (coercedFieldValue === undefined) {
          return; // Invalid value
        }
        coercedValue[field.name] = coercedFieldValue;
      } else if (field.defaultValue !== undefined) {
        coercedValue[field.name] = coerceDefaultValue(field);
      } else if (isNonNullType(field.type)) {
        return; // Invalid value
      }
    }

    // Ensure every provided field is defined.
    for (const fieldName of Object.keys(inputValue)) {
      if (!fieldDefs[fieldName]) {
        return; // Invalid value
      }
    }
    return coercedValue;
  }

  // istanbul ignore else (See: 'https://github.com/graphql/graphql-js/issues/2618')
  if (isLeafType(type)) {
    // Coercion can throw to indicate failure.
    try {
      return type.parseValue(inputValue);
    } catch (_error) {
      return; // Invalid valid
    }
  }

  // istanbul ignore next (Not reachable. All possible input types have been considered)
  invariant(false, 'Unexpected input type: ' + inspect((type: empty)));
}
