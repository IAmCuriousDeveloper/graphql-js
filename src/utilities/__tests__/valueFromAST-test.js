/* eslint-disable import/no-deprecated */

import { expect } from 'chai';
import { describe, it } from 'mocha';

import { parseValue } from '../../language/parser';
import { GraphQLBoolean } from '../../type/scalars';
import { valueFromAST } from '../valueFromAST';

import { expectWarning } from './expectWarning';

describe('valueFromAST', () => {
  it('warns about deprecation', () => {
    expectWarning(() =>
      valueFromAST(parseValue('true'), GraphQLBoolean),
    ).to.equal(
      'DEPRECATION WARNING: The function "valueFromAST" is deprecated and may be removed in a future version. Use "coerceInputLiteral".',
    );
  });

  it('rejects empty input', () => {
    expect(valueFromAST(null, GraphQLBoolean)).to.deep.equal(undefined);
  });
});
