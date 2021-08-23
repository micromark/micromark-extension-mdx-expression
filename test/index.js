/**
 * @typedef {import('micromark-util-types').HtmlExtension} HtmlExtension
 * @typedef {import('micromark-util-types').Handle} Handle
 */

import * as acorn from 'acorn'
import jsx from 'acorn-jsx'
import test from 'tape'
import {micromark} from 'micromark'
import {mdxExpression as syntax} from 'micromark-extension-mdx-expression'

/** @type {HtmlExtension} */
const html = {
  enter: {mdxFlowExpression: start, mdxTextExpression: start},
  exit: {mdxFlowExpression: end, mdxTextExpression: end}
}

/** @type {Handle} */
function start() {
  this.buffer()
}

/** @type {Handle} */
function end() {
  this.resume()
  this.setData('slurpOneLineEnding', true)
}

test('micromark-extension-mdx-expression', (t) => {
  t.throws(
    () => {
      // @ts-expect-error: runtime.
      syntax({acorn: true})
    },
    /Expected a proper `acorn` instance passed in as `options\.acorn`/,
    'should throw if `acorn` is passed but it has no `parse`'
  )

  t.throws(
    () => {
      syntax({addResult: true})
    },
    /Expected an `acorn` instance passed in as `options\.acorn`/,
    'should throw if `addResult` is passed w/o `acorn`'
  )

  t.throws(
    () => {
      // @ts-expect-error: runtime.
      syntax({acornOptions: {}})
    },
    /Expected an `acorn` instance passed in as `options\.acorn`/,
    'should throw if `acornOptions` is passed w/o `acorn`'
  )

  t.throws(
    () => {
      micromark('a {<b />} c', {extensions: [syntax({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should not support JSX by default'
  )

  t.equal(
    micromark('a {<b />} c', {
      extensions: [syntax({acorn: acorn.Parser.extend(jsx())})],
      htmlExtensions: [html]
    }),
    '<p>a  c</p>',
    'should support JSX if an `acorn` instance supporting it is passed in'
  )

  t.throws(
    () => {
      micromark('a {(() => {})()} c', {
        extensions: [syntax({acorn, acornOptions: {ecmaVersion: 5}})]
      })
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should support `acornOptions` (1)'
  )

  t.equal(
    micromark('a {(() => {})()} c', {
      extensions: [syntax({acorn, acornOptions: {ecmaVersion: 6}})],
      htmlExtensions: [html]
    }),
    '<p>a  c</p>',
    'should support `acornOptions` (2)'
  )

  t.equal(
    micromark('a {b} c', {
      extensions: [syntax({acorn, addResult: true})],
      htmlExtensions: [
        {
          enter: {
            mdxFlowExpression: checkResultExpression,
            mdxTextExpression: checkResultExpression
          },
          exit: {mdxFlowExpression: end, mdxTextExpression: end}
        }
      ]
    }),
    '<p>a  c</p>',
    'should support `addResult`'
  )

  /** @type {Handle} */
  function checkResultExpression(token) {
    t.ok(
      'estree' in token,
      '`addResult` should add `estree` to expression tokens'
    )
    t.deepEqual(
      // @ts-expect-error: it does exist.
      JSON.parse(JSON.stringify(token.estree)),
      {
        type: 'Program',
        start: 3,
        end: 4,
        body: [
          {
            type: 'ExpressionStatement',
            expression: {
              type: 'Identifier',
              start: 3,
              end: 4,
              name: 'b',
              loc: {start: {line: 1, column: 3}, end: {line: 1, column: 4}},
              range: [3, 4]
            },
            start: 3,
            end: 4,
            loc: {start: {line: 1, column: 3}, end: {line: 1, column: 4}},
            range: [3, 4]
          }
        ],
        sourceType: 'module',
        comments: [],
        loc: {start: {line: 1, column: 3}, end: {line: 1, column: 4}},
        range: [3, 4]
      },
      '`addResult` should add an expression'
    )
    return start.call(this)
  }

  t.equal(
    micromark('a {} c', {
      extensions: [syntax({acorn, addResult: true})],
      htmlExtensions: [
        {
          enter: {
            mdxFlowExpression: checkResultEmpty,
            mdxTextExpression: checkResultEmpty
          },
          exit: {mdxFlowExpression: end, mdxTextExpression: end}
        }
      ]
    }),
    '<p>a  c</p>',
    'should support `addResult` for an empty expression'
  )

  /** @type {Handle} */
  function checkResultEmpty(token) {
    t.ok(
      'estree' in token,
      '`addResult` should add `estree` to expression tokens'
    )

    t.deepEqual(
      // @ts-expect-error: it does exist.
      JSON.parse(JSON.stringify(token.estree)),
      {
        type: 'Program',
        start: 3,
        end: 3,
        body: [],
        sourceType: 'module',
        comments: [],
        loc: {start: {line: 1, column: 3}, end: {line: 1, column: 3}},
        range: [3, 3]
      },
      '`estree` should be an empty program for an empty expression'
    )
    return start.call(this)
  }

  t.equal(
    micromark('a {} b', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support an empty expression (1)'
  )

  t.equal(
    micromark('a { \t\r\n} b', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support an empty expression (2)'
  )

  t.equal(
    micromark('a {/**/} b', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support a multiline comment (1)'
  )

  t.equal(
    micromark('a {  /*\n*/\t} b', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support a multiline comment (2)'
  )

  t.equal(
    micromark('a {/*b*//*c*/} d', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support a multiline comment (3)'
  )

  t.equal(
    micromark('a {b/*c*/} d', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support a multiline comment (4)'
  )

  t.equal(
    micromark('a {/*b*/c} d', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support a multiline comment (4)'
  )

  t.throws(
    () => {
      micromark('a {//} b', {extensions: [syntax({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should crash on an incorrect line comment (1)'
  )

  t.throws(
    () => {
      micromark('a { // b } c', {extensions: [syntax({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should crash on an incorrect line comment (2)'
  )

  t.equal(
    micromark('a {//\n} b', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support a line comment followed by a line ending'
  )

  t.equal(
    micromark('a {// b\nd} d', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support a line comment followed by a line ending and an expression'
  )

  t.equal(
    micromark('a {b// c\n} d', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support an expression followed by a line comment and a line ending'
  )

  t.equal(
    micromark('a {/*b*/ // c\n} d', {
      extensions: [syntax({acorn, addResult: true})],
      htmlExtensions: [
        {
          enter: {
            mdxFlowExpression: checkResultComments,
            mdxTextExpression: checkResultComments
          },
          exit: {mdxFlowExpression: end, mdxTextExpression: end}
        }
      ]
    }),
    '<p>a  d</p>',
    'should support `addResult` for comments'
  )

  /** @type {Handle} */
  function checkResultComments(token) {
    t.deepEqual(
      // @ts-expect-error: it does exist.
      JSON.parse(JSON.stringify(token.estree)),
      {
        type: 'Program',
        start: 3,
        end: 14,
        body: [],
        sourceType: 'module',
        comments: [
          {
            type: 'Block',
            value: 'b',
            start: 3,
            end: 8,
            loc: {start: {line: 1, column: 3}, end: {line: 1, column: 8}},
            range: [3, 8]
          },
          {
            type: 'Line',
            value: ' c',
            start: 9,
            end: 13,
            loc: {start: {line: 1, column: 9}, end: {line: 1, column: 13}},
            range: [9, 13]
          }
        ],
        loc: {start: {line: 1, column: 3}, end: {line: 1, column: 14}},
        range: [3, 14]
      },
      '`estree` should have comments'
    )
    return start.call(this)
  }

  t.equal(
    micromark('a {b.c} d', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support expression statements (1)'
  )

  t.equal(
    micromark('a {1 + 1} b', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support expression statements (2)'
  )

  t.equal(
    micromark('a {function () {}} b', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support expression statements (3)'
  )

  t.throws(
    () => {
      micromark('a {var b = "c"} d', {extensions: [syntax({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should crash on non-expressions'
  )

  t.equal(
    micromark('> a {\n> b} c', {
      extensions: [syntax({acorn})],
      htmlExtensions: [html]
    }),
    '<blockquote>\n<p>a  c</p>\n</blockquote>',
    'should support expressions in containers'
  )

  t.throws(
    () => {
      micromark('> a {\n> b<} c', {extensions: [syntax({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should crash on incorrect expressions in containers (1)'
  )

  t.throws(
    () => {
      micromark('> a {\n> b\n> c} d', {extensions: [syntax({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected content after expression/,
    'should crash on incorrect expressions in containers (2)'
  )

  test('text (agnostic)', (t) => {
    t.equal(
      micromark('a {b} c', {extensions: [syntax()], htmlExtensions: [html]}),
      '<p>a  c</p>',
      'should support an expression'
    )

    t.equal(
      micromark('a {} b', {extensions: [syntax()], htmlExtensions: [html]}),
      '<p>a  b</p>',
      'should support an empty expression'
    )

    t.throws(
      () => {
        micromark('a {b c', {extensions: [syntax()]})
      },
      /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
      'should crash if no closing brace is found (1)'
    )

    t.throws(
      () => {
        micromark('a {b { c } d', {extensions: [syntax()]})
      },
      /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
      'should crash if no closing brace is found (2)'
    )

    t.equal(
      micromark('a {\n} b', {extensions: [syntax()], htmlExtensions: [html]}),
      '<p>a  b</p>',
      'should support a line ending in an expression'
    )

    t.equal(
      micromark('a } b', {extensions: [syntax()], htmlExtensions: [html]}),
      '<p>a } b</p>',
      'should support just a closing brace'
    )

    t.equal(
      micromark('{ a } b', {extensions: [syntax()], htmlExtensions: [html]}),
      '<p> b</p>',
      'should support expressions as the first thing when following by other things'
    )

    t.end()
  })

  test('text (gnostic)', (t) => {
    t.equal(
      micromark('a {b} c', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>',
      'should support an expression'
    )

    t.throws(
      () => {
        micromark('a {??} b', {extensions: [syntax({acorn})]})
      },
      /Could not parse expression with acorn: Unexpected token/,
      'should crash on an incorrect expression'
    )

    t.equal(
      micromark('a {} b', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>',
      'should support an empty expression'
    )

    t.throws(
      () => {
        micromark('a {b c', {extensions: [syntax({acorn})]})
      },
      /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
      'should crash if no closing brace is found (1)'
    )

    t.throws(
      () => {
        micromark('a {b { c } d', {extensions: [syntax({acorn})]})
      },
      /Could not parse expression with acorn: Unexpected content after expression/,
      'should crash if no closing brace is found (2)'
    )

    t.equal(
      micromark('a {\n} b', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>',
      'should support a line ending in an expression'
    )

    t.equal(
      micromark('a } b', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a } b</p>',
      'should support just a closing brace'
    )

    t.equal(
      micromark('{ a } b', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '<p> b</p>',
      'should support expressions as the first thing when following by other things'
    )

    t.equal(
      micromark('a { /* { */ } b', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>',
      'should support an unbalanced opening brace (if JS permits)'
    )

    t.equal(
      micromark('a { /* } */ } b', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>',
      'should support an unbalanced closing brace (if JS permits)'
    )

    t.end()
  })

  test('flow (agnostic)', (t) => {
    t.equal(
      micromark('{a}', {extensions: [syntax()], htmlExtensions: [html]}),
      '',
      'should support an expression'
    )

    t.equal(
      micromark('{}', {extensions: [syntax()], htmlExtensions: [html]}),
      '',
      'should support an empty expression'
    )

    t.throws(
      () => {
        micromark('{a', {extensions: [syntax()]})
      },
      /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
      'should crash if no closing brace is found (1)'
    )

    t.throws(
      () => {
        micromark('{b { c }', {extensions: [syntax()]})
      },
      /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
      'should crash if no closing brace is found (2)'
    )

    t.equal(
      micromark('{\n}\na', {extensions: [syntax()], htmlExtensions: [html]}),
      '<p>a</p>',
      'should support a line ending in an expression'
    )

    t.equal(
      micromark('{ a } \t\nb', {
        extensions: [syntax()],
        htmlExtensions: [html]
      }),
      '<p>b</p>',
      'should support expressions followed by spaces'
    )

    t.equal(
      micromark('  { a }\nb', {
        extensions: [syntax()],
        htmlExtensions: [html]
      }),
      '<p>b</p>',
      'should support expressions preceded by spaces'
    )

    t.throws(
      () => {
        micromark('> {a\nb}', {extensions: [syntax()]})
      },
      /Unexpected end of file in expression/,
      'should not support lazyness (1)'
    )

    t.equal(
      micromark('> a\n{b}', {
        extensions: [syntax()],
        htmlExtensions: [html]
      }),
      '<blockquote>\n<p>a</p>\n</blockquote>\n',
      'should not support lazyness (2)'
    )

    t.equal(
      micromark('> {a}\nb', {
        extensions: [syntax()],
        htmlExtensions: [html]
      }),
      '<blockquote>\n</blockquote>\n<p>b</p>',
      'should not support lazyness (3)'
    )

    t.throws(
      () => {
        micromark('> {\n> a\nb}', {extensions: [syntax()]})
      },
      /Unexpected end of file in expression/,
      'should not support lazyness (4)'
    )

    t.end()
  })

  test('flow (gnostic)', (t) => {
    t.equal(
      micromark('{a}', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '',
      'should support an expression'
    )

    t.equal(
      micromark('{}', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '',
      'should support an empty expression'
    )

    t.throws(
      () => {
        micromark('{a', {extensions: [syntax({acorn})]})
      },
      /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
      'should crash if no closing brace is found (1)'
    )

    t.throws(
      () => {
        micromark('{b { c }', {extensions: [syntax({acorn})]})
      },
      /Could not parse expression with acorn: Unexpected content after expression/,
      'should crash if no closing brace is found (2)'
    )

    t.equal(
      micromark('{\n}\na', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a</p>',
      'should support a line ending in an expression'
    )

    t.equal(
      micromark('{ a } \t\nb', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '<p>b</p>',
      'should support expressions followed by spaces'
    )

    t.equal(
      micromark('  { a }\nb', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '<p>b</p>',
      'should support expressions preceded by spaces'
    )

    t.equal(
      micromark('a{(b)}c', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '<p>ac</p>',
      'should support expressions padded w/ parens'
    )

    t.equal(
      micromark('a{/* b */ ( (c) /* d */ + (e) )}f', {
        extensions: [syntax({acorn})],
        htmlExtensions: [html]
      }),
      '<p>af</p>',
      'should support expressions padded w/ parens and comments'
    )

    t.end()
  })

  test('spread (hidden)', (t) => {
    t.throws(
      () => {
        micromark('a {b} c', {
          extensions: [syntax({acorn, spread: true})]
        })
      },
      /Unexpected `Property` in code: only spread elements are supported/,
      'should crash if not a spread'
    )

    t.throws(
      () => {
        micromark('a {...?} c', {
          extensions: [syntax({acorn, spread: true})]
        })
      },
      /Could not parse expression with acorn: Unexpected token/,
      'should crash on an incorrect spread'
    )

    t.throws(
      () => {
        micromark('a {...b,c} d', {
          extensions: [syntax({acorn, spread: true})]
        })
      },
      /Unexpected extra content in spread: only a single spread is supported/,
      'should crash if a spread and other things'
    )

    t.equal(
      micromark('a {} b', {
        extensions: [syntax({acorn, spread: true})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>',
      'should support an empty spread'
    )

    t.throws(
      () => {
        micromark('a {} b', {
          extensions: [syntax({acorn, spread: true, allowEmpty: false})]
        })
      },
      /Unexpected empty expression/,
      'should crash on an empty spread w/ `allowEmpty: false`'
    )

    t.equal(
      micromark('a {/* b */} c', {
        extensions: [syntax({acorn, spread: true})],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>',
      'should support a comment spread'
    )

    t.throws(
      () => {
        micromark('a {/* b */} c', {
          extensions: [syntax({acorn, spread: true, allowEmpty: false})]
        })
      },
      /Unexpected empty expression/,
      'should crash on a comment spread w/ `allowEmpty: false`'
    )

    t.equal(
      micromark('a {...b} c', {
        extensions: [syntax({acorn, spread: true})],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>',
      'should support a spread'
    )

    t.end()
  })

  t.end()
})
