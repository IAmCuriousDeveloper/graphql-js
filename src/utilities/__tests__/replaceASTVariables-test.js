import { expect } from 'chai';
import { describe, it } from 'mocha';

import type { ValueNode } from '../../language/ast';
import { parseValue as _parseValue } from '../../language/parser';
import { replaceASTVariables } from '../replaceASTVariables';

function parseValue(ast: string): ValueNode {
  return _parseValue(ast, { noLocation: true });
}

describe('replaceASTVariables', () => {
  it('does not change simple AST', () => {
    const ast = parseValue('null');
    expect(replaceASTVariables(ast, undefined)).to.equal(ast);
  });

  it('replaces simple Variables', () => {
    const ast = parseValue('$var');
    expect(replaceASTVariables(ast, { var: 123 })).to.deep.equal(
      parseValue('123'),
    );
  });

  it('replaces nested Variables', () => {
    const ast = parseValue('{ foo: [ $var ], bar: $var }');
    expect(replaceASTVariables(ast, { var: 123 })).to.deep.equal(
      parseValue('{ foo: [ 123 ], bar: 123 }'),
    );
  });

  it('replaces missing Variables with null', () => {
    const ast = parseValue('$var');
    expect(replaceASTVariables(ast, undefined)).to.deep.equal(
      parseValue('null'),
    );
  });

  it('replaces missing Variables in lists with null', () => {
    const ast = parseValue('[1, $var]');
    expect(replaceASTVariables(ast, undefined)).to.deep.equal(
      parseValue('[1, null]'),
    );
  });

  it('omits missing Variables from objects', () => {
    const ast = parseValue('{ foo: 1, bar: $var }');
    expect(replaceASTVariables(ast, undefined)).to.deep.equal(
      parseValue('{ foo: 1 }'),
    );
  });
});
