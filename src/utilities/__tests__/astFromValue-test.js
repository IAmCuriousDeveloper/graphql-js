import { expect } from 'chai';
import { describe, it } from 'mocha';

import {
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLBoolean,
} from '../../type/scalars';
import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLInputObjectType,
} from '../../type/definition';

import { astFromValue } from '../astFromValue';

describe('astFromValue', () => {
  it('converts null values to ASTs', () => {
    expect(astFromValue(null, GraphQLBoolean)).to.deep.equal({
      kind: 'NullValue',
    });

    // Note: undefined values are represented as null.
    expect(astFromValue(undefined, GraphQLBoolean)).to.deep.equal({
      kind: 'NullValue',
    });
  });

  it('converts boolean values to ASTs', () => {
    expect(astFromValue(true)).to.deep.equal({
      kind: 'BooleanValue',
      value: true,
    });

    expect(astFromValue(true, GraphQLBoolean)).to.deep.equal({
      kind: 'BooleanValue',
      value: true,
    });

    expect(astFromValue(false, GraphQLBoolean)).to.deep.equal({
      kind: 'BooleanValue',
      value: false,
    });

    // Note: no type checking or coercion.
    expect(astFromValue(0, GraphQLBoolean)).to.deep.equal({
      kind: 'IntValue',
      value: '0',
    });
  });

  it('converts Int values to Int ASTs', () => {
    expect(astFromValue(-1)).to.deep.equal({
      kind: 'IntValue',
      value: '-1',
    });

    expect(astFromValue(-1, GraphQLInt)).to.deep.equal({
      kind: 'IntValue',
      value: '-1',
    });

    expect(astFromValue(123.0, GraphQLInt)).to.deep.equal({
      kind: 'IntValue',
      value: '123',
    });

    expect(astFromValue(1e4, GraphQLInt)).to.deep.equal({
      kind: 'IntValue',
      value: '10000',
    });

    // GraphQL spec does not allow coercing non-integer values to Int to avoid
    // accidental data loss.
    expect(astFromValue(123.5, GraphQLInt)).to.deep.equal({
      kind: 'FloatValue',
      value: '123.5',
    });

    // Note: no type checking or coercion.
    expect(astFromValue(1e40, GraphQLInt)).to.deep.equal({
      kind: 'FloatValue',
      value: '1e+40',
    });

    expect(astFromValue(NaN, GraphQLInt)).to.deep.equal({
      kind: 'NullValue',
    });

    expect(astFromValue(Infinity, GraphQLInt)).to.deep.equal({
      kind: 'NullValue',
    });
  });

  it('converts Float values to Int/Float ASTs', () => {
    expect(astFromValue(-1, GraphQLFloat)).to.deep.equal({
      kind: 'IntValue',
      value: '-1',
    });

    expect(astFromValue(123.0, GraphQLFloat)).to.deep.equal({
      kind: 'IntValue',
      value: '123',
    });

    expect(astFromValue(123.5, GraphQLFloat)).to.deep.equal({
      kind: 'FloatValue',
      value: '123.5',
    });

    expect(astFromValue(1e4, GraphQLFloat)).to.deep.equal({
      kind: 'IntValue',
      value: '10000',
    });

    expect(astFromValue(1e40, GraphQLFloat)).to.deep.equal({
      kind: 'FloatValue',
      value: '1e+40',
    });
  });

  it('converts String values to String ASTs', () => {
    expect(astFromValue('hello', GraphQLString)).to.deep.equal({
      kind: 'StringValue',
      value: 'hello',
    });

    expect(astFromValue('VALUE', GraphQLString)).to.deep.equal({
      kind: 'StringValue',
      value: 'VALUE',
    });

    expect(astFromValue('VA\nLUE', GraphQLString)).to.deep.equal({
      kind: 'StringValue',
      value: 'VA\nLUE',
    });

    // Note: no type checking or coercion.
    expect(astFromValue(123, GraphQLString)).to.deep.equal({
      kind: 'IntValue',
      value: '123',
    });

    // Note: no type checking or coercion.
    expect(astFromValue(false, GraphQLString)).to.deep.equal({
      kind: 'BooleanValue',
      value: false,
    });
  });

  it('converts ID values to Int/String ASTs', () => {
    expect(astFromValue('hello', GraphQLID)).to.deep.equal({
      kind: 'StringValue',
      value: 'hello',
    });

    expect(astFromValue('VALUE', GraphQLID)).to.deep.equal({
      kind: 'StringValue',
      value: 'VALUE',
    });

    // Note: EnumValues cannot contain non-identifier characters
    expect(astFromValue('VA\nLUE', GraphQLID)).to.deep.equal({
      kind: 'StringValue',
      value: 'VA\nLUE',
    });

    // Note: IntValues are used when possible.
    expect(astFromValue(-1, GraphQLID)).to.deep.equal({
      kind: 'IntValue',
      value: '-1',
    });

    expect(astFromValue(123, GraphQLID)).to.deep.equal({
      kind: 'IntValue',
      value: '123',
    });

    expect(astFromValue('123', GraphQLID)).to.deep.equal({
      kind: 'IntValue',
      value: '123',
    });

    expect(astFromValue('01', GraphQLID)).to.deep.equal({
      kind: 'StringValue',
      value: '01',
    });
  });

  it('ignores custom scalar types, passing through values directly', () => {
    const customScalar = new GraphQLScalarType({
      name: 'CustomScale',
      serialize(value) {
        return value;
      },
    });

    expect(astFromValue('value', customScalar)).to.deep.equal({
      kind: 'StringValue',
      value: 'value',
    });

    expect(astFromValue({ field: 'value' }, customScalar)).to.deep.equal({
      kind: 'ObjectValue',
      fields: [
        {
          kind: 'ObjectField',
          name: { kind: 'Name', value: 'field' },
          value: { kind: 'StringValue', value: 'value' },
        },
      ],
    });
  });

  it('ignores NonNull types when producing NullValue', () => {
    const NonNullBoolean = new GraphQLNonNull(GraphQLBoolean);
    expect(astFromValue(null, NonNullBoolean)).to.deep.equal({
      kind: 'NullValue',
    });
  });

  const complexValue = { someArbitrary: 'complexValue' };

  const myEnum = new GraphQLEnumType({
    name: 'MyEnum',
    values: {
      HELLO: {},
      GOODBYE: {},
      COMPLEX: { value: complexValue },
    },
  });

  it('converts string values to Enum ASTs if possible', () => {
    expect(astFromValue('HELLO', myEnum)).to.deep.equal({
      kind: 'EnumValue',
      value: 'HELLO',
    });

    expect(astFromValue('COMPLEX', myEnum)).to.deep.equal({
      kind: 'EnumValue',
      value: 'COMPLEX',
    });

    // Note: no validation or coercion
    expect(astFromValue('hello', myEnum)).to.deep.equal({
      kind: 'EnumValue',
      value: 'hello',
    });

    // Non-names are string value
    expect(astFromValue('hello friend', myEnum)).to.deep.equal({
      kind: 'StringValue',
      value: 'hello friend',
    });
  });

  it('converts array values to List ASTs', () => {
    expect(
      astFromValue(['FOO', 'BAR'], new GraphQLList(GraphQLString)),
    ).to.deep.equal({
      kind: 'ListValue',
      values: [
        { kind: 'StringValue', value: 'FOO' },
        { kind: 'StringValue', value: 'BAR' },
      ],
    });

    expect(
      astFromValue(['HELLO', 'GOODBYE'], new GraphQLList(myEnum)),
    ).to.deep.equal({
      kind: 'ListValue',
      values: [
        { kind: 'EnumValue', value: 'HELLO' },
        { kind: 'EnumValue', value: 'GOODBYE' },
      ],
    });

    function* listGenerator() {
      yield 1;
      yield 2;
      yield 3;
    }

    expect(
      astFromValue(listGenerator(), new GraphQLList(GraphQLInt)),
    ).to.deep.equal({
      kind: 'ListValue',
      values: [
        { kind: 'IntValue', value: '1' },
        { kind: 'IntValue', value: '2' },
        { kind: 'IntValue', value: '3' },
      ],
    });
  });

  it('converts list singletons', () => {
    expect(astFromValue('FOO', new GraphQLList(GraphQLString))).to.deep.equal({
      kind: 'StringValue',
      value: 'FOO',
    });
  });

  it('retains indicies in arrays, not performing type validation', () => {
    const ast = astFromValue(
      ['FOO', null, 'BAR'],
      new GraphQLList(new GraphQLNonNull(GraphQLString)),
    );

    expect(ast).to.deep.equal({
      kind: 'ListValue',
      values: [
        { kind: 'StringValue', value: 'FOO' },
        { kind: 'NullValue' },
        { kind: 'StringValue', value: 'BAR' },
      ],
    });
  });

  const inputObj = new GraphQLInputObjectType({
    name: 'MyInputObj',
    fields: {
      foo: { type: GraphQLFloat },
      bar: { type: myEnum },
    },
  });

  it('converts input objects', () => {
    expect(astFromValue({ foo: 3, bar: 'HELLO' }, inputObj)).to.deep.equal({
      kind: 'ObjectValue',
      fields: [
        {
          kind: 'ObjectField',
          name: { kind: 'Name', value: 'foo' },
          value: { kind: 'IntValue', value: '3' },
        },
        {
          kind: 'ObjectField',
          name: { kind: 'Name', value: 'bar' },
          value: { kind: 'EnumValue', value: 'HELLO' },
        },
      ],
    });
  });

  it('converts input objects with explicit nulls', () => {
    expect(astFromValue({ foo: null }, inputObj)).to.deep.equal({
      kind: 'ObjectValue',
      fields: [
        {
          kind: 'ObjectField',
          name: { kind: 'Name', value: 'foo' },
          value: { kind: 'NullValue' },
        },
      ],
    });
  });

  it('does not perform type validation for mis-matched types', () => {
    expect(astFromValue(5, inputObj)).to.deep.equal({
      kind: 'IntValue',
      value: '5',
    });
  });
});
