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

import { valueToLiteral } from '../valueToLiteral';

describe('valueToLiteral', () => {
  it('does not convert some value types', () => {
    expect(() => valueToLiteral(Symbol('test'))).to.throw(
      'Cannot convert value to AST: Symbol(test).',
    );
  });

  it('converts null values to ASTs', () => {
    expect(valueToLiteral(null)).to.deep.equal({
      kind: 'NullValue',
    });

    // Note: undefined values are represented as null.
    expect(valueToLiteral(undefined)).to.deep.equal({
      kind: 'NullValue',
    });
  });

  it('converts boolean values to ASTs', () => {
    expect(valueToLiteral(true)).to.deep.equal({
      kind: 'BooleanValue',
      value: true,
    });

    expect(valueToLiteral(false)).to.deep.equal({
      kind: 'BooleanValue',
      value: false,
    });
  });

  it('converts non-finite values to null', () => {
    expect(valueToLiteral(NaN)).to.deep.equal({
      kind: 'NullValue',
    });

    expect(valueToLiteral(Infinity)).to.deep.equal({
      kind: 'NullValue',
    });
  });

  it('converts Int values to Int ASTs', () => {
    expect(valueToLiteral(-1)).to.deep.equal({
      kind: 'IntValue',
      value: '-1',
    });

    expect(valueToLiteral(123.0)).to.deep.equal({
      kind: 'IntValue',
      value: '123',
    });

    expect(valueToLiteral(1e4)).to.deep.equal({
      kind: 'IntValue',
      value: '10000',
    });
  });

  it('converts Float values to Int/Float ASTs', () => {
    expect(valueToLiteral(123.5)).to.deep.equal({
      kind: 'FloatValue',
      value: '123.5',
    });

    expect(valueToLiteral(1e40)).to.deep.equal({
      kind: 'FloatValue',
      value: '1e+40',
    });
  });

  it('converts String values to String ASTs', () => {
    expect(valueToLiteral('hello world')).to.deep.equal({
      kind: 'StringValue',
      value: 'hello world',
    });

    expect(valueToLiteral('NAME')).to.deep.equal({
      kind: 'StringValue',
      value: 'NAME',
    });
  });

  it('converts ID values to Int/String ASTs', () => {
    expect(valueToLiteral('hello world', GraphQLID)).to.deep.equal({
      kind: 'StringValue',
      value: 'hello world',
    });

    expect(valueToLiteral('NAME', GraphQLID)).to.deep.equal({
      kind: 'StringValue',
      value: 'NAME',
    });

    expect(valueToLiteral(123, GraphQLID)).to.deep.equal({
      kind: 'IntValue',
      value: '123',
    });

    expect(valueToLiteral('123', GraphQLID)).to.deep.equal({
      kind: 'IntValue',
      value: '123',
    });

    expect(valueToLiteral('123.5', GraphQLID)).to.deep.equal({
      kind: 'StringValue',
      value: '123.5',
    });

    expect(valueToLiteral('001', GraphQLID)).to.deep.equal({
      kind: 'StringValue',
      value: '001',
    });
  });

  const myEnum = new GraphQLEnumType({
    name: 'MyEnum',
    values: {
      HELLO: {},
      COMPLEX: { value: { someArbitrary: 'complexValue' } },
    },
  });

  it('converts string values to Enum ASTs if possible', () => {
    expect(valueToLiteral('HELLO', myEnum)).to.deep.equal({
      kind: 'EnumValue',
      value: 'HELLO',
    });

    expect(valueToLiteral('COMPLEX', myEnum)).to.deep.equal({
      kind: 'EnumValue',
      value: 'COMPLEX',
    });

    expect(valueToLiteral('GOODBYE', myEnum)).to.deep.equal({
      kind: 'EnumValue',
      value: 'GOODBYE',
    });

    // Non-names are string value
    expect(valueToLiteral('hello friend', myEnum)).to.deep.equal({
      kind: 'StringValue',
      value: 'hello friend',
    });
  });

  it('does not do type checking or coercion', () => {
    expect(valueToLiteral(0, GraphQLBoolean)).to.deep.equal({
      kind: 'IntValue',
      value: '0',
    });

    expect(valueToLiteral(1.23, GraphQLInt)).to.deep.equal({
      kind: 'FloatValue',
      value: '1.23',
    });

    expect(valueToLiteral('123', GraphQLInt)).to.deep.equal({
      kind: 'StringValue',
      value: '123',
    });

    const NonNullBoolean = new GraphQLNonNull(GraphQLBoolean);
    expect(valueToLiteral(null, NonNullBoolean)).to.deep.equal({
      kind: 'NullValue',
    });

    expect(valueToLiteral(123, myEnum)).to.deep.equal({
      kind: 'IntValue',
      value: '123',
    });
  });

  it('converts array values to List ASTs', () => {
    expect(
      valueToLiteral(['FOO', 'BAR'], new GraphQLList(GraphQLString)),
    ).to.deep.equal({
      kind: 'ListValue',
      values: [
        { kind: 'StringValue', value: 'FOO' },
        { kind: 'StringValue', value: 'BAR' },
      ],
    });

    expect(
      valueToLiteral(['HELLO', 'GOODBYE'], new GraphQLList(myEnum)),
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
      valueToLiteral(listGenerator(), new GraphQLList(GraphQLInt)),
    ).to.deep.equal({
      kind: 'ListValue',
      values: [
        { kind: 'IntValue', value: '1' },
        { kind: 'IntValue', value: '2' },
        { kind: 'IntValue', value: '3' },
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
    expect(valueToLiteral({ foo: 3, bar: 'HELLO' }, inputObj)).to.deep.equal({
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

  it('converts input objects with explicit nulls, omitting undefined', () => {
    expect(valueToLiteral({ foo: null, bar: undefined })).to.deep.equal({
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

  it('custom scalar types may define valueToLiteral', () => {
    const customScalar = new GraphQLScalarType({
      name: 'CustomScalar',
      valueToLiteral(value) {
        return { kind: 'StringValue', value: String(value) };
      },
    });

    expect(valueToLiteral(123, customScalar)).to.deep.equal({
      kind: 'StringValue',
      value: '123',
    });
  });
});
