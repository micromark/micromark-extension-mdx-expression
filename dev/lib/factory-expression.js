/**
 * @typedef {import('micromark-util-types').Point} Point
 * @typedef {import('micromark-util-types').TokenizeContext} TokenizeContext
 * @typedef {import('micromark-util-types').Effects} Effects
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('./util-events-to-acorn.js').Acorn} Acorn
 * @typedef {import('./util-events-to-acorn.js').AcornOptions} AcornOptions
 */

import assert from 'assert'
import {factoryWhitespace} from 'micromark-factory-whitespace'
import {markdownLineEnding} from 'micromark-util-character'
import {codes} from 'micromark-util-symbol/codes.js'
import {positionFromEstree} from 'unist-util-position-from-estree'
import {VFileMessage} from 'vfile-message'
import {eventsToAcorn} from './util-events-to-acorn.js'

/**
 * @this {TokenizeContext}
 * @param {Effects} effects
 * @param {State} ok
 * @param {State} nok
 * @param {Acorn|undefined} acorn
 * @param {AcornOptions} acornOptions
 * @param {boolean|undefined} addResult
 * @param {string} type
 * @param {string} markerType
 * @param {string} chunkType
 * @param {boolean} [spread=false]
 * @param {boolean} [forbidEmpty=false]
 * @returns {State}
 */
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
  /** @type {Point} */
  let startPosition
  /** @type {Error} */
  let lastCrash

  return start

  /** @type {State} */
  function start(code) {
    assert(code === codes.leftCurlyBrace, 'expected `{`')
    effects.enter(type)
    effects.enter(markerType)
    effects.consume(code)
    effects.exit(markerType)
    startPosition = self.now()
    return atBreak
  }

  /** @type {State} */
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

  /** @type {State} */
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

  /** @type {State} */
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
      assert(estree.type === 'Program', 'expected program')
      const head = estree.body[0]
      assert(head, 'expected body')
      assert(head.type === 'ExpressionStatement', 'expected expression')
      assert(
        head.expression.type === 'ObjectExpression',
        'expected object expression'
      )

      if (head.expression.properties[1]) {
        throw new VFileMessage(
          'Unexpected extra content in spread: only a single spread is supported',
          // @ts-expect-error Looks similar enough.
          positionFromEstree(head.expression.properties[1]).start,
          'micromark-extension-mdx-expression:spread-extra'
        )
      } else if (head.expression.properties[0].type !== 'SpreadElement') {
        throw new VFileMessage(
          'Unexpected `' +
            head.expression.properties[0].type +
            '` in code: only spread elements are supported',
          // @ts-expect-error Looks similar enough.
          positionFromEstree(head.expression.properties[0]).start,
          'micromark-extension-mdx-expression:non-spread'
        )
      }
    }

    if (result.error) {
      lastCrash = new VFileMessage(
        'Could not parse expression with acorn: ' + result.error.message,
        {
          // @ts-expect-error: fine.
          line: result.error.loc.line,
          // @ts-expect-error: fine.
          column: result.error.loc.column + 1,
          // @ts-expect-error: fine.
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
