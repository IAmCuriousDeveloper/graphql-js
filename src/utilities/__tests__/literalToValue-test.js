import { expect } from 'chai';
import { describe, it } from 'mocha';

import {
  GraphQLID,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
} from '../../type/scalars';
import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLInputObjectType,
} from '../../type/definition';

import { parseValue, parseConstValue } from '../../language/parser';
import { literalToValue } from '../literalToValue';
import { Kind } from '../../language/kinds';

describe('literalToValue', () => {
  it('does not allow variables', () => {
    // $FlowExpectedError[incompatible-call]
    expect(() => literalToValue(parseValue('$var'))).to.throw('Unexpected');
  });

  it('converts null ASTs to values', () => {
    expect(literalToValue(parseConstValue('null'))).to.equal(null);
  });

  it('converts boolean ASTs to values', () => {
    expect(literalToValue(parseConstValue('true'))).to.equal(true);
    expect(literalToValue(parseConstValue('false'))).to.equal(false);
  });

  it('converts Int ASTs to Int values', () => {
    expect(literalToValue(parseConstValue('0'))).to.equal(0);
    expect(literalToValue(parseConstValue('-1'))).to.equal(-1);
    expect(literalToValue(parseConstValue('1000'))).to.equal(1000);
  });

  it('converts Float ASTs to Float values', () => {
    expect(literalToValue(parseConstValue('123.5'))).to.equal(123.5);
    expect(literalToValue(parseConstValue('2e40'))).to.equal(2e40);
  });

  it('converts String ASTs to String values', () => {
    expect(literalToValue(parseConstValue('"hello world"'))).to.equal(
      'hello world',
    );
    expect(literalToValue(parseConstValue('"NAME"'))).to.equal('NAME');
  });

  it('does not do type checking or coercion', () => {
    expect(literalToValue(parseConstValue('0'), GraphQLBoolean)).to.equal(0);
    expect(literalToValue(parseConstValue('1.23'), GraphQLInt)).to.equal(1.23);
    expect(literalToValue(parseConstValue('"123"'), GraphQLInt)).to.equal(
      '123',
    );
    const NonNullBoolean = new GraphQLNonNull(GraphQLBoolean);
    expect(literalToValue(parseConstValue('null'), NonNullBoolean)).to.equal(
      null,
    );
  });

  it('converts ID Int/String ASTs to string values', () => {
    expect(
      literalToValue(parseConstValue('"hello world"'), GraphQLID),
    ).to.equal('hello world');
    expect(literalToValue(parseConstValue('"NAME"'), GraphQLID)).to.equal(
      'NAME',
    );
    expect(literalToValue(parseConstValue('123'), GraphQLID)).to.equal('123');
    expect(literalToValue(parseConstValue('"123"'), GraphQLID)).to.equal('123');
    expect(literalToValue(parseConstValue('123.0'), GraphQLID)).to.equal(123);
  });

  const myEnum = new GraphQLEnumType({
    name: 'MyEnum',
    values: {
      HELLO: {},
      COMPLEX: { value: { someArbitrary: 'complexValue' } },
    },
  });

  it('converts Enum ASTs to string values', () => {
    expect(literalToValue(parseConstValue('HELLO'))).to.equal('HELLO');
    expect(literalToValue(parseConstValue('HELLO'), myEnum)).to.equal('HELLO');
    expect(literalToValue(parseConstValue('COMPLEX'), myEnum)).to.equal(
      'COMPLEX',
    );
    expect(literalToValue(parseConstValue('GOODBYE'), myEnum)).to.equal(
      'GOODBYE',
    );
  });

  it('converts List ASTs to array values', () => {
    expect(literalToValue(parseConstValue('["FOO", BAR]'))).to.deep.equal([
      'FOO',
      'BAR',
    ]);

    expect(
      literalToValue(
        parseConstValue('["123", 123]'),
        new GraphQLList(GraphQLID),
      ),
    ).to.deep.equal(['123', '123']);
  });

  const inputObj = new GraphQLInputObjectType({
    name: 'MyInputObj',
    fields: {
      foo: { type: GraphQLFloat },
      bar: { type: GraphQLID },
    },
  });

  it('converts input objects', () => {
    expect(
      literalToValue(parseConstValue('{ foo: 3, bar: 3 }'), inputObj),
    ).to.deep.equal({
      foo: 3,
      bar: '3',
    });
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

    expect(literalToValue(parseConstValue('FOO'), customScalar)).to.equal(
      '#FOO',
    );
    expect(literalToValue(parseConstValue('"FOO"'), customScalar)).to.equal(
      'FOO',
    );
  });
});
