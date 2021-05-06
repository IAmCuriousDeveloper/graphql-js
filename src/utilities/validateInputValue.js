import type { Path } from '../jsutils/Path';
import { addPath, pathToArray } from '../jsutils/Path';
import { didYouMean } from '../jsutils/didYouMean';
import { inspect } from '../jsutils/inspect';
import { invariant } from '../jsutils/invariant';
import { isIterableObject } from '../jsutils/isIterableObject';
import { isObjectLike } from '../jsutils/isObjectLike';
import { suggestionList } from '../jsutils/suggestionList';

import { GraphQLError } from '../error/GraphQLError';

import type { GraphQLInputType } from '../type/definition';
import {
  isInputObjectType,
  isListType,
  isNonNullType,
  isLeafType,
  isRequiredInputField,
} from '../type/definition';

type OnErrorCB = (
  path: $ReadOnlyArray<string | number>,
  invalidValue: mixed,
  error: GraphQLError,
) => void;

/**
 * Validate a JavaScript value with a GraphQL type, collecting all errors via a
 * callback function.
 *
 * Similar to coerceInputValue(), however instead of returning a coerced value,
 * validates that the provided input value is allowed for this type.
 */
export function validateInputValue(
  inputValue: mixed,
  type: GraphQLInputType,
  onError: OnErrorCB,
): void {
  validateInputValueImpl(inputValue, type, onError, undefined);
}

function validateInputValueImpl(
  inputValue: mixed,
  type: GraphQLInputType,
  onError: OnErrorCB,
  path: Path | void,
): void {
  if (isNonNullType(type)) {
    if (inputValue == null) {
      reportInvalidValue(
        onError,
        `Expected non-nullable type "${inspect(type)}" not to be null.`,
        inputValue,
        path,
      );
      return;
    }
    return validateInputValueImpl(inputValue, type.ofType, onError, path);
  }

  if (inputValue == null) {
    return;
  }

  if (isListType(type)) {
    const itemType = type.ofType;
    if (isIterableObject(inputValue)) {
      let index = 0;
      for (const itemValue of inputValue) {
        validateInputValueImpl(
          itemValue,
          itemType,
          onError,
          addPath(path, index++, undefined),
        );
      }
    } else {
      // Lists accept a non-list value as a list of one.
      validateInputValueImpl(inputValue, itemType, onError, path);
    }
  } else if (isInputObjectType(type)) {
    if (!isObjectLike(inputValue)) {
      reportInvalidValue(
        onError,
        `Expected type "${type.name}" to be an object.`,
        inputValue,
        path,
      );
      return;
    }

    const fieldDefs = type.getFields();

    for (const field of Object.values(fieldDefs)) {
      const fieldValue = inputValue[field.name];
      if (fieldValue !== undefined) {
        const fieldPath = addPath(path, field.name, type.name);
        validateInputValueImpl(fieldValue, field.type, onError, fieldPath);
      } else if (isRequiredInputField(field)) {
        reportInvalidValue(
          onError,
          `Field "${field.name}" of required type "${inspect(
            field.type,
          )}" was not provided.`,
          inputValue,
          path,
        );
      }
    }

    // Ensure every provided field is defined.
    for (const fieldName of Object.keys(inputValue)) {
      if (!fieldDefs[fieldName]) {
        const suggestions = suggestionList(
          fieldName,
          Object.keys(type.getFields()),
        );
        reportInvalidValue(
          onError,
          `Field "${fieldName}" is not defined by type "${type.name}".` +
            didYouMean(suggestions),
          inputValue,
          path,
        );
      }
    }
  } else if (isLeafType(type)) {
    let result;
    let caughtError;

    try {
      result = type.parseValue(inputValue);
    } catch (error) {
      if (error instanceof GraphQLError) {
        onError(pathToArray(path), inputValue, error);
        return;
      }
      caughtError = error;
    }

    if (result === undefined) {
      reportInvalidValue(
        onError,
        `Expected type "${type.name}".` +
          (caughtError ? ` ${caughtError.message}` : ''),
        inputValue,
        path,
        caughtError,
      );
    }
  } else {
    // istanbul ignore next (Not reachable. All possible input types have been considered)
    invariant(false, 'Unexpected input type: ' + inspect((type: empty)));
  }
}

function reportInvalidValue(
  onError: OnErrorCB,
  message: string,
  value: mixed,
  path: Path | void,
  originalError?: ?GraphQLError,
): void {
  onError(
    pathToArray(path),
    value,
    new GraphQLError(message, null, null, null, null, originalError),
  );
}
