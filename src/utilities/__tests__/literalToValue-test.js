import { expect } from 'chai';
import { describe, it } from 'mocha';

import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLInputObjectType,
} from '../../type/definition';
import {
  GraphQLBoolean,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLID,
} from '../../type/scalars';

import { Kind } from '../../language/kinds';
import { parseValue, parseConstValue } from '../../language/parser';

import { literalToValue, defaultScalarLiteralToValue } from '../literalToValue';

describe('literalToValue', () => {
  function test(value, type, expected) {
    return expect(literalToValue(parseConstValue(value), type)).to.deep.equal(
      expected,
    );
  }

  it('converts null ASTs to values', () => {
    test('null', GraphQLString, null);
    test('null', new GraphQLNonNull(GraphQLString), undefined);
  });

  it('converts boolean ASTs to values', () => {
    test('true', GraphQLBoolean, true);
    test('false', GraphQLBoolean, false);
    test('"false"', GraphQLBoolean, undefined);
  });

  it('converts Int ASTs to Int values', () => {
    test('0', GraphQLInt, 0);
    test('-1', GraphQLInt, -1);
    test('2147483647', GraphQLInt, 2147483647);
    test('2147483648', GraphQLInt, undefined);
    test('0.5', GraphQLInt, undefined);
  });

  it('converts Int/Float ASTs to Float values', () => {
    test('123.5', GraphQLFloat, 123.5);
    test('2e40', GraphQLFloat, 2e40);
    test('1099511627776', GraphQLFloat, 1099511627776);
    test('"0.5"', GraphQLFloat, undefined);
  });

  it('converts String ASTs to String values', () => {
    test('"hello world"', GraphQLString, 'hello world');
    test('"NAME"', GraphQLString, 'NAME');
    test('"""multiline"""', GraphQLString, 'multiline');
    test('123', GraphQLString, undefined);
  });

  it('converts ID Int/String ASTs to string values', () => {
    test('"hello world"', GraphQLID, 'hello world');
    test('123', GraphQLID, '123');
    test('"123"', GraphQLID, '123');
    test(
      '123456789123456789123456789123456789',
      GraphQLID,
      '123456789123456789123456789123456789',
    );
    test('123.0', GraphQLID, undefined);
    test('NAME', GraphQLID, undefined);
  });

  const myEnum = new GraphQLEnumType({
    name: 'MyEnum',
    values: {
      HELLO: {},
      COMPLEX: { value: { someArbitrary: 'complexValue' } },
    },
  });

  it('converts Enum ASTs to string values', () => {
    test('HELLO', myEnum, 'HELLO');
    test('COMPLEX', myEnum, 'COMPLEX');
    // Undefined Enum
    test('GOODBYE', myEnum, undefined);
    // String value is not an Enum
    test('"HELLO"', myEnum, undefined);
  });

  it('converts List ASTs to array values', () => {
    test('["FOO", "BAR"]', new GraphQLList(GraphQLString), ['FOO', 'BAR']);
    test('["123", 123]', new GraphQLList(GraphQLID), ['123', '123']);
    // Invalid items create an invalid result
    test('["FOO", BAR]', new GraphQLList(GraphQLString), undefined);
    // Does not coerce items to list singletons
    test('"FOO"', new GraphQLList(GraphQLString), 'FOO');
  });

  const inputObj = new GraphQLInputObjectType({
    name: 'MyInputObj',
    fields: {
      foo: { type: new GraphQLNonNull(GraphQLFloat) },
      bar: { type: GraphQLID },
    },
  });

  it('converts input objects', () => {
    test('{ foo: 3, bar: 3 }', inputObj, { foo: 3, bar: '3' });
    // Non-object is invalid
    test('123', inputObj, undefined);
    // Invalid fields create an invalid result
    test('{ foo: "3" }', inputObj, undefined);
    // Missing required fields create an invalid result
    test('{ bar: 3 }', inputObj, undefined);
    // Additional fields create an invalid result
    test('{ foo: 3, unknown: 3 }', inputObj, undefined);
  });

  it('custom scalar types may define literalToValue', () => {
    const customScalar = new GraphQLScalarType({
      name: 'CustomScalar',
      literalToValue(value) {
        if (value.kind === Kind.ENUM) {
          return '#' + value.value;
        }
      },
    });

    test('FOO', customScalar, '#FOO');
    test('"FOO"', customScalar, undefined);
  });

  it('custom scalar types may fall back on default literalToValue', () => {
    const customScalar = new GraphQLScalarType({
      name: 'CustomScalar',
    });

    test('{ foo: "bar" }', customScalar, { foo: 'bar' });
  });

  describe('defaultScalarLiteralToValue', () => {
    function testDefault(value, expected) {
      return expect(
        defaultScalarLiteralToValue(parseConstValue(value)),
      ).to.deep.equal(expected);
    }

    it('does not allow variables', () => {
      // $FlowExpectedError[incompatible-call]
      expect(() => defaultScalarLiteralToValue(parseValue('$var'))).to.throw(
        'Unexpected',
      );
    });

    it('converts null ASTs to null values', () => {
      testDefault('null', null);
    });

    it('converts boolean ASTs to boolean values', () => {
      testDefault('true', true);
      testDefault('false', false);
    });

    it('converts Int ASTs to number values', () => {
      testDefault('0', 0);
      testDefault('-1', -1);
      testDefault('1099511627776', 1099511627776);
    });

    it('converts Float ASTs to number values', () => {
      testDefault('123.5', 123.5);
      testDefault('2e40', 2e40);
    });

    it('converts String ASTs to string values', () => {
      testDefault('"hello world"', 'hello world');
    });

    it('converts Enum ASTs to string values', () => {
      testDefault('HELLO_WORLD', 'HELLO_WORLD');
    });

    it('converts List ASTs to array values', () => {
      testDefault('["abc", 123, BAR]', ['abc', 123, 'BAR']);
    });

    it('converts Objects ASTs to object values', () => {
      testDefault('{ foo: "abc", bar: 123 }', { foo: 'abc', bar: 123 });
    });
  });
});
