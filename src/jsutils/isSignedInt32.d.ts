/**
 * As per the GraphQL Spec, Integers are only treated as valid when a valid
 * 32-bit signed integer, providing the broadest support across platforms.
 *
 * n.b. JavaScript's integers are safe between -(2^53 - 1) and 2^53 - 1 because
 * they are internally represented as IEEE 754 doubles.
 */
export function isSignedInt32(value: unknown): value is number;
