import assert from 'assert'
import {factorySpace} from 'micromark-factory-space'
import {markdownLineEnding} from 'micromark-util-character'
import {codes} from 'micromark-util-symbol/codes.js'
import {types} from 'micromark-util-symbol/types.js'
import {factoryExpression} from './factory-expression.js'

export function mdxExpression(options = {}) {
  const addResult = options.addResult
  const acorn = options.acorn
  // Hidden: `micromark-extension-mdx-jsx` supports expressions in tags,
  // and one of them is only “spread” elements.
  // It also has expressions that are not allowed to be empty (`<x y={}/>`).
  // Instead of duplicating code there, this are two small hidden feature here
  // to test that behavior.
  const spread = options.spread
  const forbidEmpty = options.forbidEmpty
  let acornOptions

  if (acorn) {
    if (!acorn.parseExpressionAt) {
      throw new Error(
        'Expected a proper `acorn` instance passed in as `options.acorn`'
      )
    }

    acornOptions = Object.assign(
      {ecmaVersion: 2020, sourceType: 'module'},
      options.acornOptions || {}
    )
  } else if (options.acornOptions || options.addResult) {
    throw new Error('Expected an `acorn` instance passed in as `options.acorn`')
  }

  return {
    flow: {
      [codes.leftCurlyBrace]: {tokenize: tokenizeFlowExpression, concrete: true}
    },
    text: {[codes.leftCurlyBrace]: {tokenize: tokenizeTextExpression}}
  }

  function tokenizeFlowExpression(effects, ok, nok) {
    const self = this

    return start

    function start(code) {
      assert(code === codes.leftCurlyBrace, 'expected `{`')
      return factoryExpression.call(
        self,
        effects,
        factorySpace(effects, after, types.whitespace),
        nok,
        acorn,
        acornOptions,
        addResult,
        'mdxFlowExpression',
        'mdxFlowExpressionMarker',
        'mdxFlowExpressionChunk',
        spread,
        forbidEmpty
      )(code)
    }

    function after(code) {
      return code === codes.eof || markdownLineEnding(code)
        ? ok(code)
        : nok(code)
    }
  }

  function tokenizeTextExpression(effects, ok, nok) {
    const self = this

    return start

    function start(code) {
      assert(code === codes.leftCurlyBrace, 'expected `{`')
      return factoryExpression.call(
        self,
        effects,
        ok,
        nok,
        acorn,
        acornOptions,
        addResult,
        'mdxTextExpression',
        'mdxTextExpressionMarker',
        'mdxTextExpressionChunk',
        spread,
        forbidEmpty
      )(code)
    }
  }
}
