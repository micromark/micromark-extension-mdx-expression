import {VFileMessage} from 'vfile-message'

const own = {}.hasOwnProperty

// Parse a list of micromark events with acorn.
// eslint-disable-next-line complexity
export function eventsToAcorn(acorn, acornOptions, events, config) {
  const before = config.prefix || ''
  const after = config.suffix || ''
  const comments = []
  const acornConfig = Object.assign({}, acornOptions, {onComment: comments})
  const chunks = []
  const lines = {}
  let index = -1
  let swallow = false
  let estree
  let exception
  let mdStartOffset

  /* istanbul ignore else - not passed by `micromark-extension-mdxjs-esm`. */
  if (config.start) {
    mdStartOffset = config.start.offset
    lines[config.start.line] = config.start
  }

  // Assume only void events (and `enter` followed immediately by an `exit`).
  while (++index < events.length) {
    const token = events[index][1]

    if (events[index][0] === 'exit') {
      chunks.push(events[index][2].sliceSerialize(token))

      /* istanbul ignore if - `micromark-extension-mdxjs-esm` doesn’t pass
       * `start` */
      if (mdStartOffset === undefined) {
        mdStartOffset = events[index][1].start.offset
      }

      if (
        !(token.start.line in lines) ||
        lines[token.start.line].offset > token.start.offset
      ) {
        lines[token.start.line] = token.start
      }
    }
  }

  const source = chunks.join('')
  const value = before + source + after
  const isEmptyExpression = config.expression && empty(source)

  if (isEmptyExpression && !config.allowEmpty) {
    throw new VFileMessage(
      'Unexpected empty expression',
      parseOffsetToUnistPoint(0),
      'micromark-extension-mdx-expression:unexpected-empty-expression'
    )
  }

  try {
    estree =
      config.expression && !isEmptyExpression
        ? acorn.parseExpressionAt(value, 0, acornConfig)
        : acorn.parse(value, acornConfig)
  } catch (error) {
    const point = parseOffsetToUnistPoint(error.pos)
    error.message = String(error.message).replace(/ \(\d+:\d+\)$/, '')
    error.pos = point.offset
    error.loc = {line: point.line, column: point.column - 1}
    exception = error
    swallow =
      error.raisedAt >= before.length + source.length ||
      // Broken comments are raised at their start, not their end.
      error.message === 'Unterminated comment'
  }

  if (estree && config.expression && !isEmptyExpression) {
    if (empty(value.slice(estree.end, value.length - after.length))) {
      estree = {
        type: 'Program',
        start: 0,
        end: before.length + source.length,
        body: [
          {
            type: 'ExpressionStatement',
            expression: estree,
            start: 0,
            end: before.length + source.length
          }
        ],
        sourceType: 'module'
      }
    } else {
      const point = parseOffsetToUnistPoint(estree.end)
      exception = new Error('Unexpected content after expression')
      exception.pos = point.offset
      exception.loc = {line: point.line, column: point.column - 1}
      estree = undefined
    }
  }

  if (estree) {
    estree.comments = comments
    visit(estree)
  }

  return {estree, error: exception, swallow}

  function visit(esnode) {
    let key

    // Not a node.
    if (
      !(
        esnode &&
        typeof esnode === 'object' &&
        'type' in esnode &&
        'end' in esnode
      )
    ) {
      return
    }

    /* istanbul ignore else - acorn seems to always nicely add position info,
     * but make sure we don’t crash if some weird extension doesn’t. */
    if ('start' in esnode && 'end' in esnode) {
      const pointStart = parseOffsetToUnistPoint(esnode.start)
      const pointEnd = parseOffsetToUnistPoint(esnode.end)
      esnode.start = pointStart.offset
      esnode.end = pointEnd.offset
      esnode.loc = {
        start: {line: pointStart.line, column: pointStart.column - 1},
        end: {line: pointEnd.line, column: pointEnd.column - 1}
      }
      esnode.range = [esnode.start, esnode.end]
    } else {
      esnode.start = undefined
      esnode.end = undefined
      esnode.loc = undefined
      esnode.range = undefined
    }

    for (key in esnode) {
      if (esnode[key] && typeof esnode[key] === 'object') {
        if (Array.isArray(esnode[key])) {
          let index = -1

          while (++index < esnode[key].length) {
            visit(esnode[key][index])
          }
        } else {
          visit(esnode[key])
        }
      }
    }
  }

  function parseOffsetToUnistPoint(offset) {
    // First, get the offset in `source` (the string of “markdown”)
    let srcOffset = offset - before.length
    let line
    let lineStart

    if (srcOffset < 0) srcOffset = 0
    else if (srcOffset > source.length) srcOffset = source.length

    srcOffset += mdStartOffset

    // Then, update it
    for (line in lines) {
      if (own.call(lines, line)) {
        // First line we find.
        if (!lineStart) lineStart = lines[line]
        if (lines[line].offset > offset) break
        lineStart = lines[line]
      }
    }

    return {
      line: lineStart.line,
      column: lineStart.column + (srcOffset - lineStart.offset),
      offset: srcOffset
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
