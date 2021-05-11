/**
 * Determines if a provided object has a given property name.
 */
export function hasOwnProperty(obj: mixed, prop: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
