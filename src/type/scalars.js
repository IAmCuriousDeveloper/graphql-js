import { inspect } from '../jsutils/inspect';
import { isObjectLike } from '../jsutils/isObjectLike';
import { isSignedInt32 } from '../jsutils/isSignedInt32';

import type { ConstValueNode } from '../language/ast';
import { Kind } from '../language/kinds';
import { print } from '../language/printer';

import { GraphQLError } from '../error/GraphQLError';

import { defaultScalarLiteralToValue } from '../utilities/literalToValue';
import { defaultScalarValueToLiteral } from '../utilities/valueToLiteral';

import type { GraphQLNamedType } from './definition';
import { GraphQLScalarType } from './definition';

function serializeInt(outputValue: mixed): number {
  const coercedValue = serializeObject(outputValue);

  if (typeof coercedValue === 'boolean') {
    return coercedValue ? 1 : 0;
  }

  let num = coercedValue;
  if (typeof coercedValue === 'string' && coercedValue !== '') {
    num = Number(coercedValue);
  }

  if (typeof num !== 'number' || !Number.isInteger(num)) {
    throw new GraphQLError(
      `Int cannot represent non-integer value: ${inspect(coercedValue)}`,
    );
  }
  if (!isSignedInt32(num)) {
    throw new GraphQLError(
      'Int cannot represent non 32-bit signed integer value: ' +
        inspect(coercedValue),
    );
  }
  return num;
}

function coerceInt(inputValue: mixed): number {
  if (typeof inputValue !== 'number' || !Number.isInteger(inputValue)) {
    throw new GraphQLError(
      `Int cannot represent non-integer value: ${inspect(inputValue)}`,
    );
  }
  if (!isSignedInt32(inputValue)) {
    throw new GraphQLError(
      `Int cannot represent non 32-bit signed integer value: ${inputValue}`,
    );
  }
  return inputValue;
}

export const GraphQLInt: GraphQLScalarType = new GraphQLScalarType({
  name: 'Int',
  description:
    'The `Int` scalar type represents non-fractional signed whole numeric values. Int can represent values between -(2^31) and 2^31 - 1.',
  serialize: serializeInt,
  parseValue: coerceInt,
  parseLiteral(valueNode) {
    if (valueNode.kind !== Kind.INT) {
      throw new GraphQLError(
        `Int cannot represent non-integer value: ${print(valueNode)}`,
        valueNode,
      );
    }
    const num = parseInt(valueNode.value, 10);
    if (!isSignedInt32(num)) {
      throw new GraphQLError(
        `Int cannot represent non 32-bit signed integer value: ${valueNode.value}`,
        valueNode,
      );
    }
    return num;
  },
  valueToLiteral(value) {
    if (isSignedInt32(value)) {
      return defaultScalarValueToLiteral(value);
    }
  },
  literalToValue(valueNode) {
    if (valueNode.kind === Kind.INT) {
      const value = defaultScalarLiteralToValue(valueNode);
      if (isSignedInt32(value)) {
        return value;
      }
    }
  },
});

function serializeFloat(outputValue: mixed): number {
  const coercedValue = serializeObject(outputValue);

  if (typeof coercedValue === 'boolean') {
    return coercedValue ? 1 : 0;
  }

  let num = coercedValue;
  if (typeof coercedValue === 'string' && coercedValue !== '') {
    num = Number(coercedValue);
  }

  if (typeof num !== 'number' || !Number.isFinite(num)) {
    throw new GraphQLError(
      `Float cannot represent non numeric value: ${inspect(coercedValue)}`,
    );
  }
  return num;
}

function coerceFloat(inputValue: mixed): number {
  if (typeof inputValue !== 'number' || !Number.isFinite(inputValue)) {
    throw new GraphQLError(
      `Float cannot represent non numeric value: ${inspect(inputValue)}`,
    );
  }
  return inputValue;
}

export const GraphQLFloat: GraphQLScalarType = new GraphQLScalarType({
  name: 'Float',
  description:
    'The `Float` scalar type represents signed double-precision fractional values as specified by [IEEE 754](https://en.wikipedia.org/wiki/IEEE_floating_point).',
  serialize: serializeFloat,
  parseValue: coerceFloat,
  parseLiteral(valueNode) {
    if (valueNode.kind !== Kind.FLOAT && valueNode.kind !== Kind.INT) {
      throw new GraphQLError(
        `Float cannot represent non numeric value: ${print(valueNode)}`,
        valueNode,
      );
    }
    return parseFloat(valueNode.value);
  },
  valueToLiteral(value) {
    const literal = defaultScalarValueToLiteral(value);
    if (literal.kind === Kind.FLOAT || literal.kind === Kind.INT) {
      return literal;
    }
  },
  literalToValue(valueNode) {
    if (valueNode.kind === Kind.FLOAT || valueNode.kind === Kind.INT) {
      return defaultScalarLiteralToValue(valueNode);
    }
  },
});

// Support serializing objects with custom valueOf() or toJSON() functions -
// a common way to represent a complex value which can be represented as
// a string (ex: MongoDB id objects).
function serializeObject(outputValue: mixed): mixed {
  if (isObjectLike(outputValue)) {
    if (typeof outputValue.valueOf === 'function') {
      const valueOfResult = outputValue.valueOf();
      if (!isObjectLike(valueOfResult)) {
        return valueOfResult;
      }
    }
    if (typeof outputValue.toJSON === 'function') {
      // $FlowFixMe[incompatible-use]
      return outputValue.toJSON();
    }
  }
  return outputValue;
}

function serializeString(outputValue: mixed): string {
  const coercedValue = serializeObject(outputValue);

  // Serialize string, boolean and number values to a string, but do not
  // attempt to coerce object, function, symbol, or other types as strings.
  if (typeof coercedValue === 'string') {
    return coercedValue;
  }
  if (typeof coercedValue === 'boolean') {
    return coercedValue ? 'true' : 'false';
  }
  if (typeof coercedValue === 'number' && Number.isFinite(coercedValue)) {
    return coercedValue.toString();
  }
  throw new GraphQLError(
    `String cannot represent value: ${inspect(outputValue)}`,
  );
}

function coerceString(inputValue: mixed): string {
  if (typeof inputValue !== 'string') {
    throw new GraphQLError(
      `String cannot represent a non string value: ${inspect(inputValue)}`,
    );
  }
  return inputValue;
}

export const GraphQLString: GraphQLScalarType = new GraphQLScalarType({
  name: 'String',
  description:
    'The `String` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text.',
  serialize: serializeString,
  parseValue: coerceString,
  parseLiteral(valueNode) {
    if (valueNode.kind !== Kind.STRING) {
      throw new GraphQLError(
        `String cannot represent a non string value: ${print(valueNode)}`,
        valueNode,
      );
    }
    return valueNode.value;
  },
  valueToLiteral(value) {
    const literal = defaultScalarValueToLiteral(value);
    if (literal.kind === Kind.STRING) {
      return literal;
    }
  },
  literalToValue(valueNode) {
    if (valueNode.kind === Kind.STRING) {
      return defaultScalarLiteralToValue(valueNode);
    }
  },
});

function serializeBoolean(outputValue: mixed): boolean {
  const coercedValue = serializeObject(outputValue);

  if (typeof coercedValue === 'boolean') {
    return coercedValue;
  }
  if (Number.isFinite(coercedValue)) {
    return coercedValue !== 0;
  }
  throw new GraphQLError(
    `Boolean cannot represent a non boolean value: ${inspect(coercedValue)}`,
  );
}

function coerceBoolean(inputValue: mixed): boolean {
  if (typeof inputValue !== 'boolean') {
    throw new GraphQLError(
      `Boolean cannot represent a non boolean value: ${inspect(inputValue)}`,
    );
  }
  return inputValue;
}

export const GraphQLBoolean: GraphQLScalarType = new GraphQLScalarType({
  name: 'Boolean',
  description: 'The `Boolean` scalar type represents `true` or `false`.',
  serialize: serializeBoolean,
  parseValue: coerceBoolean,
  parseLiteral(valueNode) {
    if (valueNode.kind !== Kind.BOOLEAN) {
      throw new GraphQLError(
        `Boolean cannot represent a non boolean value: ${print(valueNode)}`,
        valueNode,
      );
    }
    return valueNode.value;
  },
  valueToLiteral(value) {
    const literal = defaultScalarValueToLiteral(value);
    if (literal.kind === Kind.BOOLEAN) {
      return literal;
    }
  },
  literalToValue(valueNode) {
    if (valueNode.kind === Kind.BOOLEAN) {
      return defaultScalarLiteralToValue(valueNode);
    }
  },
});

function serializeID(outputValue: mixed): string {
  const coercedValue = serializeObject(outputValue);

  if (typeof coercedValue === 'string') {
    return coercedValue;
  }
  if (Number.isInteger(coercedValue)) {
    return String(coercedValue);
  }
  throw new GraphQLError(`ID cannot represent value: ${inspect(outputValue)}`);
}

function coerceID(inputValue: mixed): string {
  if (typeof inputValue === 'string') {
    return inputValue;
  }
  if (typeof inputValue === 'number' && Number.isInteger(inputValue)) {
    return inputValue.toString();
  }
  throw new GraphQLError(`ID cannot represent value: ${inspect(inputValue)}`);
}

export const GraphQLID: GraphQLScalarType = new GraphQLScalarType({
  name: 'ID',
  description:
    'The `ID` scalar type represents a unique identifier, often used to refetch an object or as key for a cache. The ID type appears in a JSON response as a String; however, it is not intended to be human-readable. When expected as an input type, any string (such as `"4"`) or integer (such as `4`) input value will be accepted as an ID.',
  serialize: serializeID,
  parseValue: coerceID,
  parseLiteral(valueNode) {
    if (valueNode.kind !== Kind.STRING && valueNode.kind !== Kind.INT) {
      throw new GraphQLError(
        'ID cannot represent a non-string and non-integer value: ' +
          print(valueNode),
        valueNode,
      );
    }
    return valueNode.value;
  },
  valueToLiteral(value: mixed): ?ConstValueNode {
    // ID types can use number values and Int literals.
    const stringValue = Number.isInteger(value) ? String(value) : value;
    if (typeof stringValue === 'string') {
      // Will parse as an IntValue.
      return /^-?(?:0|[1-9][0-9]*)$/.test(stringValue)
        ? { kind: Kind.INT, value: stringValue }
        : { kind: Kind.STRING, value: stringValue, block: false };
    }
  },
  literalToValue(valueNode: ConstValueNode): mixed {
    // ID Int literals are represented as string values.
    if (valueNode.kind === Kind.STRING || valueNode.kind === Kind.INT) {
      return valueNode.value;
    }
  },
});

export const specifiedScalarTypes: $ReadOnlyArray<GraphQLScalarType> = Object.freeze(
  [GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLID],
);

export function isSpecifiedScalarType(type: GraphQLNamedType): boolean {
  return specifiedScalarTypes.some(({ name }) => type.name === name);
}
