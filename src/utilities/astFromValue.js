import { inspect } from '../jsutils/inspect';
import { isObjectLike } from '../jsutils/isObjectLike';
import { isIterableObject } from '../jsutils/isIterableObject';

import type { ValueNode } from '../language/ast';
import { Kind } from '../language/kinds';

import type { GraphQLInputType } from '../type/definition';
import { GraphQLID } from '../type/scalars';
import {
  getNamedType,
  isEnumType,
  isInputObjectType,
} from '../type/definition';

/**
 * Produces a GraphQL Value AST given a JavaScript object.
 * Function will match JavaScript values to GraphQL AST schema format
 * by using suggested GraphQLInputType. For example:
 *
 *     astFromValue("value", GraphQLString)
 *
 * A GraphQL type may be provided, which will be used to interpret different
 * JavaScript values.
 *
 * | JavaScript Value  | GraphQL Value        |
 * | ----------------- | -------------------- |
 * | Object            | Input Object         |
 * | Array             | List                 |
 * | Boolean           | Boolean              |
 * | String            | String / Enum Value  |
 * | Number            | Int / Float          |
 * | null / undefined  | NullValue            |
 *
 * Note: This function does not perform any type validation or coercion.
 */
export function astFromValue(value: mixed, type?: GraphQLInputType): ValueNode {
  // Like JSON, a null literal is produced for null and undefined.
  if (value == null) {
    return { kind: Kind.NULL };
  }

  const namedType = type && getNamedType(type);

  // Convert JavaScript array to GraphQL list.
  if (isIterableObject(value)) {
    return {
      kind: Kind.LIST,
      values: Array.from(value, (item) => astFromValue(item, namedType)),
    };
  }

  // Populate the fields of the input object by creating ASTs from each value
  // in the JavaScript object according to the fields in the input type.
  if (isObjectLike(value)) {
    const fieldDefs =
      namedType && isInputObjectType(namedType) && namedType.getFields();
    return {
      kind: Kind.OBJECT,
      fields: Object.keys(value).map((fieldName) => ({
        kind: Kind.OBJECT_FIELD,
        name: { kind: Kind.NAME, value: fieldName },
        value: astFromValue(value[fieldName], fieldDefs?.[fieldName]?.type),
      })),
    };
  }

  // Others serialize based on their corresponding JavaScript scalar types.
  if (typeof value === 'boolean') {
    return { kind: Kind.BOOLEAN, value };
  }

  // JavaScript numbers can be Int or Float values.
  if (typeof value === 'number') {
    // Like JSON, a null literal is produced for non-finite values.
    if (!Number.isFinite(value)) {
      return { kind: Kind.NULL };
    }
    const stringNum = String(value);
    return integerStringRegExp.test(stringNum)
      ? { kind: Kind.INT, value: stringNum }
      : { kind: Kind.FLOAT, value: stringNum };
  }

  if (typeof value === 'string') {
    // Enum types use Enum literals.
    if (isEnumType(namedType) && nameRegExp.test(value)) {
      return { kind: Kind.ENUM, value };
    }

    // ID types can use Int literals.
    if (namedType === GraphQLID && integerStringRegExp.test(value)) {
      return { kind: Kind.INT, value };
    }

    return {
      kind: Kind.STRING,
      value,
    };
  }

  throw new TypeError(`Cannot convert value to AST: ${inspect(value)}.`);
}

/**
 * IntValue:
 *   - NegativeSign? 0
 *   - NegativeSign? NonZeroDigit ( Digit+ )?
 */
const integerStringRegExp = /^-?(?:0|[1-9][0-9]*)$/;

// https://spec.graphql.org/draft/#Name
const nameRegExp = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
