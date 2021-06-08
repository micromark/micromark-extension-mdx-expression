import assert from 'assert'
import {factoryWhitespace} from 'micromark-factory-whitespace'
import {markdownLineEnding} from 'micromark-util-character'
import {codes} from 'micromark-util-symbol/codes.js'
import {positionFromEstree} from 'unist-util-position-from-estree'
import {VFileMessage} from 'vfile-message'
import {eventsToAcorn} from './util-events-to-acorn.js'

// eslint-disable-next-line max-params
export function factoryExpression(
  effects,
  ok,
  nok,
  acorn,
  acornOptions,
  addResult,
  type,
  markerType,
  chunkType,
  spread,
  forbidEmpty
) {
  const self = this
  const eventStart = this.events.length + 3 // Add main and marker token
  let balance = 1
  let startPosition
  let lastCrash

  return start

  function start(code) {
    assert(code === codes.leftCurlyBrace, 'expected `{`')
    effects.enter(type)
    effects.enter(markerType)
    effects.consume(code)
    effects.exit(markerType)
    startPosition = self.now()
    return atBreak
  }

  function atBreak(code) {
    if (code === codes.eof) {
      throw (
        lastCrash ||
        new VFileMessage(
          'Unexpected end of file in expression, expected a corresponding closing brace for `{`',
          self.now(),
          'micromark-extension-mdx-expression:unexpected-eof'
        )
      )
    }

    if (code === codes.rightCurlyBrace) {
      return atClosingBrace(code)
    }

    if (markdownLineEnding(code)) {
      return factoryWhitespace(effects, atBreak)(code)
    }

    effects.enter(chunkType)
    return inside(code)
  }

  function inside(code) {
    if (
      code === codes.eof ||
      code === codes.rightCurlyBrace ||
      markdownLineEnding(code)
    ) {
      effects.exit(chunkType)
      return atBreak(code)
    }

    if (code === codes.leftCurlyBrace && !acorn) {
      effects.consume(code)
      balance++
      return inside
    }

    effects.consume(code)
    return inside
  }

  function atClosingBrace(code) {
    balance--

    // Agnostic mode: count balanced braces.
    if (!acorn) {
      if (balance) {
        effects.enter(chunkType)
        effects.consume(code)
        return inside
      }

      effects.enter(markerType)
      effects.consume(code)
      effects.exit(markerType)
      effects.exit(type)
      return ok
    }

    // Gnostic mode: parse w/ acorn.
    const result = eventsToAcorn(
      acorn,
      acornOptions,
      self.events.slice(eventStart),
      {
        start: startPosition,
        expression: true,
        // To do next major: remove double meaning of `spread` and only accept
        // `forbidEmpty` here.
        allowEmpty: !spread && !forbidEmpty,
        prefix: spread ? '({' : '',
        suffix: spread ? '})' : ''
      }
    )
    const estree = result.estree

    // Get the spread value.
    if (spread && estree) {
      // The next checks should always be the case, as we wrap in `d={}`
      assert.strictEqual(estree.type, 'Program', 'expected program')
      assert(estree.body[0], 'expected body')
      assert.strictEqual(
        estree.body[0].type,
        'ExpressionStatement',
        'expected expression'
      )
      assert.strictEqual(
        estree.body[0].expression.type,
        'ObjectExpression',
        'expected object expression'
      )

      if (estree.body[0].expression.properties[1]) {
        throw new VFileMessage(
          'Unexpected extra content in spread: only a single spread is supported',
          positionFromEstree(estree.body[0].expression.properties[1]).start,
          'micromark-extension-mdx-expression:spread-extra'
        )
      } else if (
        estree.body[0].expression.properties[0].type !== 'SpreadElement'
      ) {
        throw new VFileMessage(
          'Unexpected `' +
            estree.body[0].expression.properties[0].type +
            '` in code: only spread elements are supported',
          positionFromEstree(estree.body[0].expression.properties[0]).start,
          'micromark-extension-mdx-expression:non-spread'
        )
      }
    }

    if (result.error) {
      lastCrash = new VFileMessage(
        'Could not parse expression with acorn: ' + result.error.message,
        {
          line: result.error.loc.line,
          column: result.error.loc.column + 1,
          offset: result.error.pos
        },
        'micromark-extension-mdx-expression:acorn'
      )

      if (code !== codes.eof && result.swallow) {
        effects.enter(chunkType)
        effects.consume(code)
        return inside
      }

      throw lastCrash
    }

    effects.enter(markerType)
    effects.consume(code)
    effects.exit(markerType)
    Object.assign(effects.exit(type), addResult ? {estree} : undefined)
    return ok
  }
}
