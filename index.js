'use strict'

module.exports = mdxExpression

var markdownLineEnding = require('micromark/dist/character/markdown-line-ending')
var factorySpace = require('micromark/dist/tokenize/factory-space')
var factoryWhitespace = require('micromark/dist/tokenize/factory-whitespace')
var VMessage = require('vfile-message')

function mdxExpression(options) {
  var settings = options || {}
  var acorn = settings.acorn
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

      return createExpression.call(
        self,
        effects,
        factorySpace(effects, after, 'whitespace'),
        nok,
        'mdxFlowExpression',
        'mdxFlowExpressionMarker',
        'mdxFlowExpressionChunk'
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

      return createExpression.call(
        self,
        effects,
        ok,
        nok,
        'mdxTextExpression',
        'mdxTextExpressionMarker',
        'mdxTextExpressionChunk'
      )(code)
    }
  }

  function createExpression(
    effects,
    ok,
    nok,
    expressionType,
    expressionMarkerType,
    expressionChunkType
  ) {
    var self = this
    var lastEventIndex = this.events.length + 3 // Add main and marker token
    var position = self.now()
    var source = ''
    var balance = 1
    var lastCrash

    return start

    function start(code) {
      // Always a `{`
      effects.enter(expressionType)
      effects.enter(expressionMarkerType)
      effects.consume(code)
      effects.exit(expressionMarkerType)
      return atBreak
    }

    function atBreak(code) {
      if (code === null) {
        throw (
          lastCrash ||
          new VMessage(
            'Unexpected end of file in expression, expected a corresponding closing brace for `{`',
            self.now(),
            'micromark-extension-mdx-expression:unexpected-eof'
          )
        )
      }

      if (code === 125) {
        return atClosingBrace(code)
      }

      if (markdownLineEnding(code)) {
        return factoryWhitespace(effects, atBreak)(code)
      }

      effects.enter(expressionChunkType)
      return inside(code)
    }

    function inside(code) {
      if (code === null || code === 125 || markdownLineEnding(code)) {
        effects.exit(expressionChunkType)
        return atBreak(code)
      }

      if (code === 123) {
        if (!acorn) {
          effects.consume(code)
          balance++
          return inside
        }
      }

      effects.consume(code)
      return inside
    }

    function atClosingBrace(code) {
      var result
      var exception
      var reason
      var token

      balance--

      // Agnostic mode: count balanced braces.
      if (!acorn) {
        if (balance) {
          effects.enter(expressionChunkType)
          effects.consume(code)
          return inside
        }

        effects.enter(expressionMarkerType)
        effects.consume(code)
        effects.exit(expressionMarkerType)
        effects.exit(expressionType)
        return ok
      }

      // Gnostic mode: parse w/ acorn.
      while (lastEventIndex < self.events.length) {
        source += self.sliceSerialize(self.events[lastEventIndex][1])
        lastEventIndex += 2 // Skip over `exit`.
      }

      if (!empty(source)) {
        try {
          result = acorn.parseExpressionAt(source, 0, acornOptions)
        } catch (error) {
          exception = error
        }
        // Empty.
      }

      if (exception) {
        reason = String(exception).replace(/ \(\d+:\d+\)$/, '')

        lastCrash = new VMessage(
          'Could not parse expression with acorn: ' + reason,
          {
            line: position.line + exception.loc.line - 1,
            column:
              exception.loc.line === 1
                ? position.column + exception.loc.column + 1
                : exception.loc.column + 1
          },
          'micromark-extension-mdx-expression:acorn'
        )

        if (
          exception.raisedAt === source.length ||
          // Comments are `raisedAt` their start, instead of the EOF.
          reason === 'SyntaxError: Unterminated comment'
        ) {
          effects.enter(expressionChunkType)
          effects.consume(code)
          return inside
        }

        throw lastCrash
      }

      if (result && !empty(source.slice(result.end))) {
        throw new VMessage(
          'Unexpected content after expression, expected `}`',
          {
            line: position.line + result.loc.end.line - 1,
            column:
              result.loc.end.line === 1
                ? position.column + result.loc.end.column + 1
                : result.loc.end.column + 1
          },
          'micromark-extension-mdx-expression:unexpected-content'
        )
      }

      effects.enter(expressionMarkerType)
      effects.consume(code)
      effects.exit(expressionMarkerType)
      token = effects.exit(expressionType)
      if (options.addResult) token.estree = result
      return ok
    }
  }
}

function empty(value) {
  return /^\s*$/.test(
    value
      // Multiline comments.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Line comments.
      // EOF instead of EOL is specifically not allowed, because that would
      // mean the closing brace is on the commented-out line
      .replace(/\/\/[^\r\n]*(\r\n|\n|\r)/g, '')
  )
}
