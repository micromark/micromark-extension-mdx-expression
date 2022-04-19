/**
 * @typedef {import('micromark-util-types').Event} Event
 * @typedef {import('micromark-util-types').Point} Point
 * @typedef {import('acorn').Options} AcornOptions
 * @typedef {import('acorn').Comment} Comment
 * @typedef {import('acorn').Node} Node
 * @typedef {import('estree').Program} Program
 */

/**
 * @typedef {{parse: import('acorn').parse, parseExpressionAt: import('acorn').parseExpressionAt}} Acorn
 *
 * @typedef {Error & {raisedAt: number, pos: number, loc: {line: number, column: number}}} AcornError
 */

/**
 * @typedef Options
 * @property {Acorn} acorn
 * @property {AcornOptions} [acornOptions]
 * @property {Point} [start]
 * @property {string} [prefix='']
 * @property {string} [suffix='']
 * @property {boolean} [expression=false]
 * @property {boolean} [allowEmpty=false]
 */

import {ok as assert} from 'uvu/assert'
import {visit} from 'estree-util-visit'
import {VFileMessage} from 'vfile-message'
import {location} from 'vfile-location'

/**
 * Parse a list of micromark events with acorn.
 *
 * @param {Event[]} events
 * @param {Options} options
 * @returns {{estree: Program|undefined, error: Error|undefined, swallow: boolean}}
 */
export function eventsToAcorn(events, options) {
  const {prefix = '', suffix = ''} = options
  const acornOptions = /** @type {AcornOptions} */ (options.acornOptions)
  /** @type {Array.<Comment>} */
  const comments = Array.isArray(acornOptions.onComment)
    ? acornOptions.onComment
    : []
  const acornConfig = Object.assign({}, options.acornOptions, {
    onComment: comments,
    preserveParens: true
  })
  /** @type {Array.<string>} */
  const chunks = []
  /** @type {Record<string, Point>} */
  const lines = {}
  let index = -1
  let swallow = false
  /** @type {Node|undefined} */
  let estree
  /** @type {Error|undefined} */
  let exception
  /** @type {number} */
  let startLine

  // We use `events` to detect everything, however, it could be empty.
  // In that case, we need `options.start` to make sense of positional info.
  if (options.start) {
    startLine = options.start.line
    lines[startLine] = options.start
  }

  while (++index < events.length) {
    const [kind, token, context] = events[index]

    // Assume only void events (and `enter` followed immediately by an `exit`).
    if (kind === 'exit') {
      chunks.push(context.sliceSerialize(token))
      setPoint(token.start)
      setPoint(token.end)
    }
  }

  const source = chunks.join('')
  const value = prefix + source + suffix
  const isEmptyExpression = options.expression && empty(source)
  const place = location(source)

  if (isEmptyExpression && !options.allowEmpty) {
    throw new VFileMessage(
      'Unexpected empty expression',
      parseOffsetToUnistPoint(0),
      'micromark-extension-mdx-expression:unexpected-empty-expression'
    )
  }

  try {
    estree =
      options.expression && !isEmptyExpression
        ? options.acorn.parseExpressionAt(value, 0, acornConfig)
        : options.acorn.parse(value, acornConfig)
  } catch (error_) {
    const error = /** @type {AcornError} */ (error_)
    const point = parseOffsetToUnistPoint(error.pos)
    error.message = String(error.message).replace(/ \(\d+:\d+\)$/, '')
    error.pos = point.offset
    error.loc = {line: point.line, column: point.column - 1}
    exception = error
    swallow =
      error.raisedAt >= prefix.length + source.length ||
      // Broken comments are raised at their start, not their end.
      error.message === 'Unterminated comment'
  }

  if (estree && options.expression && !isEmptyExpression) {
    if (empty(value.slice(estree.end, value.length - suffix.length))) {
      estree = {
        type: 'Program',
        start: 0,
        end: prefix.length + source.length,
        // @ts-expect-error: It’s good.
        body: [
          {
            type: 'ExpressionStatement',
            expression: estree,
            start: 0,
            end: prefix.length + source.length
          }
        ],
        sourceType: 'module',
        comments: []
      }
    } else {
      const point = parseOffsetToUnistPoint(estree.end)
      exception = new Error('Unexpected content after expression')
      // @ts-expect-error: acorn exception.
      exception.pos = point.offset
      // @ts-expect-error: acorn exception.
      exception.loc = {line: point.line, column: point.column - 1}
      estree = undefined
    }
  }

  if (estree) {
    // @ts-expect-error: acorn *does* allow comments
    estree.comments = comments

    visit(estree, (esnode, field, index, parents) => {
      let context = /** @type {Node|Node[]} */ (parents[parents.length - 1])
      /** @type {string|number|null} */
      let prop = field

      // Remove non-standard `ParenthesizedExpression`.
      if (esnode.type === 'ParenthesizedExpression' && context && prop) {
        /* c8 ignore next 5 */
        if (typeof index === 'number') {
          // @ts-expect-error: indexable.
          context = context[prop]
          prop = index
        }

        // @ts-expect-error: indexable.
        context[prop] = esnode.expression
      }

      assert('start' in esnode, 'expected `start` in node from acorn')
      assert('end' in esnode, 'expected `end` in node from acorn')
      // @ts-expect-error: acorn has positions.
      const pointStart = parseOffsetToUnistPoint(esnode.start)
      // @ts-expect-error: acorn has positions.
      const pointEnd = parseOffsetToUnistPoint(esnode.end)
      // @ts-expect-error: acorn has positions.
      esnode.start = pointStart.offset
      // @ts-expect-error: acorn has positions.
      esnode.end = pointEnd.offset
      // @ts-expect-error: acorn has positions.
      esnode.loc = {
        start: {line: pointStart.line, column: pointStart.column - 1},
        end: {line: pointEnd.line, column: pointEnd.column - 1}
      }
      // @ts-expect-error: acorn has positions.
      esnode.range = [esnode.start, esnode.end]
    })
  }

  // @ts-expect-error: It’s a program now.
  return {estree, error: exception, swallow}

  /**
   * @param {number} acornOffset
   * @returs {Point}
   */
  function parseOffsetToUnistPoint(acornOffset) {
    let sourceOffset = acornOffset - prefix.length

    if (sourceOffset < 0) {
      sourceOffset = 0
    } else if (sourceOffset > source.length) {
      sourceOffset = source.length
    }

    const pointInSource = place.toPoint(sourceOffset)
    assert(
      typeof startLine === 'number',
      'expected `startLine` to be found or given '
    )
    const line = startLine + (pointInSource.line - 1)
    assert(line in lines, 'expected line to be defined')
    const column = lines[line].column + (pointInSource.column - 1)
    const offset = lines[line].offset + (pointInSource.column - 1)
    return {line, column, offset}
  }

  /** @param {Point} point */
  function setPoint(point) {
    // Not passed by `micromark-extension-mdxjs-esm`
    /* c8 ignore next 3 */
    if (!startLine || point.line < startLine) {
      startLine = point.line
    }

    if (!(point.line in lines) || lines[point.line].offset > point.offset) {
      lines[point.line] = point
    }
  }
}

/**
 * @param {string} value
 * @returns {boolean}
 */
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
