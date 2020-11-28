'use strict'

module.exports = factoryExpression

var markdownLineEnding = require('micromark/dist/character/markdown-line-ending')
var factoryWhitespace = require('micromark/dist/tokenize/factory-whitespace')
var VMessage = require('vfile-message')

function factoryExpression(
  effects,
  ok,
  nok,
  acorn,
  acornOptions,
  addResult,
  expressionType,
  expressionMarkerType,
  expressionChunkType,
  spread
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
        result = acorn.parseExpressionAt(
          spread ? 'd={' + source + '}' : source,
          0,
          acornOptions
        )
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
        exception.raisedAt === source.length + (spread ? 4 : 0) ||
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

    // Get the spread value.
    if (spread) {
      result = result.right.properties[0]

      if (result.type !== 'SpreadElement') {
        throw new VMessage(
          'Unexpected `' +
            result.type +
            '` in code: only spread elements are supported',
          {
            start: {
              line: position.line + result.loc.start.line - 1,
              column: result.loc.start.column + 1
            },
            end: {
              line: position.line + result.loc.end.line - 1,
              column: result.loc.end.column + 1
            }
          },
          'micromark-extension-mdx-expression:non-spread'
        )
      }
    }

    effects.enter(expressionMarkerType)
    effects.consume(code)
    effects.exit(expressionMarkerType)
    token = effects.exit(expressionType)
    if (addResult) token.estree = result
    return ok
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
