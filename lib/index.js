'use strict'

module.exports = mdxExpression

var markdownLineEnding = require('micromark/dist/character/markdown-line-ending')
var factorySpace = require('micromark/dist/tokenize/factory-space')
var factoryExpression = require('./factory-expression')

function mdxExpression(options) {
  var settings = options || {}
  var addResult = settings.addResult
  var acorn = settings.acorn
  var spread
  var acornOptions

  if (acorn) {
    if (!acorn.parseExpressionAt) {
      throw new Error(
        'Expected a proper `acorn` instance passed in as `options.acorn`'
      )
    }

    acornOptions = Object.assign(
      {ecmaVersion: 2020, sourceType: 'module'},
      options.acornOptions || {},
      {locations: true}
    )

    // Hidden: `micromark-extension-mdx-jsx` supports expressions in tags,
    // and one of them is only “spread” elements.
    // Instead of duplicating code there is a small hidden feature here to
    // support that.
    spread = settings.spread
  } else if (settings.acornOptions || settings.addResult) {
    throw new Error('Expected an `acorn` instance passed in as `options.acorn`')
  }

  return {
    flow: {123: {tokenize: tokenizeFlowExpression, concrete: true}},
    text: {123: {tokenize: tokenizeTextExpression}}
  }

  function tokenizeFlowExpression(effects, ok, nok) {
    var self = this

    return start

    function start(code) {
      /* istanbul ignore if - handled by mm */
      if (code !== 123 /* `{` */) throw new Error('Expected `{`')

      return factoryExpression.call(
        self,
        effects,
        factorySpace(effects, after, 'whitespace'),
        nok,
        acorn,
        acornOptions,
        addResult,
        'mdxFlowExpression',
        'mdxFlowExpressionMarker',
        'mdxFlowExpressionChunk',
        spread
      )(code)
    }

    function after(code) {
      return code === null || markdownLineEnding(code) ? ok(code) : nok(code)
    }
  }

  function tokenizeTextExpression(effects, ok, nok) {
    var self = this

    return start

    function start(code) {
      /* istanbul ignore if - handled by mm */
      if (code !== 123 /* `{` */) throw new Error('Expected `{`')

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
        spread
      )(code)
    }
  }
}
