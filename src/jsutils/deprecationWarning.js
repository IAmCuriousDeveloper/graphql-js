/* eslint-disable no-console */
const canWarn = console && console.warn;
const hasIssuedWarning = {};

export function deprecationWarning(
  deprecatedFunction: string,
  resolution: string,
): void {
  if (canWarn && !hasIssuedWarning[deprecatedFunction]) {
    hasIssuedWarning[deprecatedFunction] = true;
    console.warn(
      `DEPRECATION WARNING: The function "${deprecatedFunction}" is deprecated and may be removed in a future version. ${resolution}`,
    );
  }
}
