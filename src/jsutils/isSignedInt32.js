const MAX_INT32 = 2147483647;
const MIN_INT32 = -2147483648;

/**
 * As per the GraphQL Spec, Integers are only treated as valid when a valid
 * 32-bit signed integer, providing the broadest support across platforms.
 *
 * n.b. JavaScript's integers are safe between -(2^53 - 1) and 2^53 - 1 because
 * they are internally represented as IEEE 754 doubles.
 */
export function isSignedInt32(value: mixed): boolean %checks {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value <= MAX_INT32 &&
    value >= MIN_INT32
  );
}
