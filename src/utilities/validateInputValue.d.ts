import { GraphQLError } from '../error/GraphQLError';
import { GraphQLInputType } from '../type/definition';

type OnErrorCB = (
  path: ReadonlyArray<string | number>,
  invalidValue: unknown,
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
  inputValue: unknown,
  type: GraphQLInputType,
  onError: OnErrorCB,
): void;
