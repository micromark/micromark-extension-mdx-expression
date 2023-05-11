/**
 * @typedef {import('acorn').Comment} Comment
 * @typedef {import('acorn').Token} Token
 * @typedef {import('micromark-util-types').HtmlExtension} HtmlExtension
 * @typedef {import('micromark-util-types').CompileContext} CompileContext
 * @typedef {import('micromark-util-types').Handle} Handle
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {Parser} from 'acorn'
import acornJsx from 'acorn-jsx'
import {micromark} from 'micromark'
import {mdxExpression} from 'micromark-extension-mdx-expression'

const acorn = Parser.extend(acornJsx())

/** @type {HtmlExtension} */
const html = {
  enter: {mdxFlowExpression: start, mdxTextExpression: start},
  exit: {mdxFlowExpression: end, mdxTextExpression: end}
}

/**
 * @this {CompileContext}
 * @type {Handle}
 */
function start() {
  this.buffer()
}

/**
 * @this {CompileContext}
 * @type {Handle}
 */
function end() {
  this.resume()
  this.setData('slurpOneLineEnding', true)
}

test('api', async function () {
  assert.deepEqual(
    Object.keys(await import('micromark-extension-mdx-expression')).sort(),
    ['mdxExpression'],
    'should expose the public api'
  )

  assert.deepEqual(
    Object.keys(await import('micromark-factory-mdx-expression')).sort(),
    ['factoryMdxExpression'],
    'should expose the public api'
  )

  assert.deepEqual(
    Object.keys(await import('micromark-util-events-to-acorn')).sort(),
    ['eventsToAcorn'],
    'should expose the public api'
  )
})

test('mdxExpression', function () {
  assert.throws(
    function () {
      // @ts-expect-error: runtime.
      mdxExpression({acorn: true})
    },
    /Expected a proper `acorn` instance passed in as `options\.acorn`/,
    'should throw if `acorn` is passed but it has no `parse`'
  )

  assert.throws(
    function () {
      mdxExpression({addResult: true})
    },
    /Expected an `acorn` instance passed in as `options\.acorn`/,
    'should throw if `addResult` is passed w/o `acorn`'
  )

  assert.throws(
    function () {
      // @ts-expect-error: runtime.
      mdxExpression({acornOptions: {}})
    },
    /Expected an `acorn` instance passed in as `options\.acorn`/,
    'should throw if `acornOptions` is passed w/o `acorn`'
  )

  assert.throws(
    function () {
      micromark('a {<b />} c', {extensions: [mdxExpression({acorn: Parser})]})
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should not support JSX by default'
  )

  assert.equal(
    micromark('a {<b />} c', {
      extensions: [mdxExpression({acorn: Parser.extend(acornJsx())})],
      htmlExtensions: [html]
    }),
    '<p>a  c</p>',
    'should support JSX if an `acorn` instance supporting it is passed in'
  )

  assert.throws(
    function () {
      micromark('a {(() => {})()} c', {
        extensions: [mdxExpression({acorn, acornOptions: {ecmaVersion: 5}})]
      })
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should support `acornOptions` (1)'
  )

  assert.equal(
    micromark('a {(function () {})()} c', {
      extensions: [mdxExpression({acorn, acornOptions: {ecmaVersion: 6}})],
      htmlExtensions: [html]
    }),
    '<p>a  c</p>',
    'should support `acornOptions` (2)'
  )

  assert.equal(
    micromark('a {b} c', {
      extensions: [mdxExpression({acorn, addResult: true})],
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

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function checkResultExpression(token) {
    assert.ok(
      'estree' in token,
      '`addResult` should add `estree` to expression tokens'
    )
    assert.deepEqual(
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
              loc: {
                start: {
                  line: 1,
                  column: 3,
                  offset: 3
                },
                end: {
                  line: 1,
                  column: 4,
                  offset: 4
                }
              },
              range: [3, 4]
            },
            start: 3,
            end: 4,
            loc: {
              start: {
                line: 1,
                column: 3,
                offset: 3
              },
              end: {
                line: 1,
                column: 4,
                offset: 4
              }
            },
            range: [3, 4]
          }
        ],
        sourceType: 'module',
        comments: [],
        loc: {
          start: {
            line: 1,
            column: 3,
            offset: 3
          },
          end: {
            line: 1,
            column: 4,
            offset: 4
          }
        },
        range: [3, 4]
      },
      '`addResult` should add an expression'
    )
    return start.call(this, token)
  }

  assert.equal(
    micromark('a {} c', {
      extensions: [mdxExpression({acorn, addResult: true})],
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

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function checkResultEmpty(token) {
    assert.ok(
      'estree' in token,
      '`addResult` should add `estree` to expression tokens'
    )

    assert.deepEqual(
      JSON.parse(JSON.stringify(token.estree)),
      {
        type: 'Program',
        start: 3,
        end: 3,
        body: [],
        sourceType: 'module',
        comments: [],
        loc: {
          start: {
            line: 1,
            column: 3,
            offset: 3
          },
          end: {
            line: 1,
            column: 3,
            offset: 3
          }
        },
        range: [3, 3]
      },
      '`estree` should be an empty program for an empty expression'
    )
    return start.call(this, token)
  }

  assert.equal(
    micromark('a {} b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support an empty expression (1)'
  )

  assert.equal(
    micromark('a { \t\r\n} b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support an empty expression (2)'
  )

  assert.equal(
    micromark('a {/**/} b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support a multiline comment (1)'
  )

  assert.equal(
    micromark('a {  /*\n*/\t} b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support a multiline comment (2)'
  )

  assert.equal(
    micromark('a {/*b*//*c*/} d', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support a multiline comment (3)'
  )

  assert.equal(
    micromark('a {b/*c*/} d', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support a multiline comment (4)'
  )

  assert.equal(
    micromark('a {/*b*/c} d', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support a multiline comment (4)'
  )

  assert.throws(
    function () {
      micromark('a {//} b', {extensions: [mdxExpression({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should crash on an incorrect line comment (1)'
  )

  assert.throws(
    function () {
      micromark('a { // b } c', {extensions: [mdxExpression({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should crash on an incorrect line comment (2)'
  )

  assert.equal(
    micromark('a {//\n} b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support a line comment followed by a line ending'
  )

  assert.equal(
    micromark('a {// b\nd} d', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support a line comment followed by a line ending and an expression'
  )

  assert.equal(
    micromark('a {b// c\n} d', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support an expression followed by a line comment and a line ending'
  )

  /** @type {Array<Comment>} */
  const comments = []

  assert.equal(
    micromark('a {/*b*/ // c\n} d', {
      extensions: [
        mdxExpression({
          acorn,
          acornOptions: {ecmaVersion: 6, onComment: comments},
          addResult: true
        })
      ],
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
    'should support comments (1)'
  )

  assert.deepEqual(
    comments,
    [
      {
        type: 'Block',
        value: 'b',
        start: 3,
        end: 8,
        loc: {
          start: {line: 1, column: 3, offset: 3},
          end: {line: 1, column: 8, offset: 8}
        },
        range: [3, 8]
      },
      {
        type: 'Line',
        value: ' c',
        start: 9,
        end: 13,
        loc: {
          start: {line: 1, column: 9, offset: 9},
          end: {line: 1, column: 13, offset: 13}
        },
        range: [9, 13]
      }
    ],
    'should support comments (2)'
  )

  /**
   * @this {CompileContext}
   * @type {Handle}
   */
  function checkResultComments(token) {
    assert.deepEqual(
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
            loc: {
              start: {line: 1, column: 3, offset: 3},
              end: {line: 1, column: 8, offset: 8}
            },
            range: [3, 8]
          },
          {
            type: 'Line',
            value: ' c',
            start: 9,
            end: 13,
            loc: {
              start: {line: 1, column: 9, offset: 9},
              end: {line: 1, column: 13, offset: 13}
            },
            range: [9, 13]
          }
        ],
        loc: {
          start: {line: 1, column: 3, offset: 3},
          end: {line: 2, column: 0, offset: 14}
        },
        range: [3, 14]
      },
      '`estree` should have comments'
    )
    return start.call(this, token)
  }

  /** @type {Array<Array<unknown>>} */
  const listOfArguments = []

  assert.equal(
    micromark('a {/*b*/ // c\n} d', {
      extensions: [
        mdxExpression({
          acorn,
          acornOptions: {
            ecmaVersion: 6,
            onComment() {
              listOfArguments.push([...arguments])
            }
          }
        })
      ],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support `onComment` as a function'
  )

  assert.deepEqual(listOfArguments, [
    [
      true,
      'b',
      3,
      8,
      {line: 1, column: 3, offset: 3},
      {line: 1, column: 8, offset: 8}
    ],
    [
      false,
      ' c',
      9,
      13,
      {line: 1, column: 9, offset: 9},
      {line: 1, column: 13, offset: 13}
    ]
  ])

  /** @type {Array<Token>} */
  const tokens = []

  assert.equal(
    micromark('a {b.c} d', {
      extensions: [
        mdxExpression({
          acorn,
          acornOptions: {ecmaVersion: 6, onToken: tokens}
        })
      ],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support `onToken` (array-form)'
  )

  assert.equal(
    JSON.stringify(tokens),
    JSON.stringify([
      {
        type: {
          label: 'name',
          beforeExpr: false,
          startsExpr: true,
          isLoop: false,
          isAssign: false,
          prefix: false,
          postfix: false,
          binop: null
        },
        value: 'b',
        start: 3,
        end: 4,
        loc: {
          start: {line: 1, column: 3, offset: 3},
          end: {line: 1, column: 4, offset: 4}
        },
        range: [3, 4]
      },
      {
        type: {
          label: '.',
          beforeExpr: false,
          startsExpr: false,
          isLoop: false,
          isAssign: false,
          prefix: false,
          postfix: false,
          binop: null,
          updateContext: null
        },
        start: 4,
        end: 5,
        loc: {
          start: {line: 1, column: 4, offset: 4},
          end: {line: 1, column: 5, offset: 5}
        },
        range: [4, 5]
      },
      {
        type: {
          label: 'name',
          beforeExpr: false,
          startsExpr: true,
          isLoop: false,
          isAssign: false,
          prefix: false,
          postfix: false,
          binop: null
        },
        value: 'c',
        start: 5,
        end: 6,
        loc: {
          start: {line: 1, column: 5, offset: 5},
          end: {line: 1, column: 6, offset: 6}
        },
        range: [5, 6]
      }
    ])
  )

  /** @type {Array<Token>} */
  const tokens2 = []

  assert.equal(
    micromark('a {b.c} d', {
      extensions: [
        mdxExpression({
          acorn,
          acornOptions: {
            ecmaVersion: 6,
            onToken(token) {
              tokens2.push(token)
            }
          }
        })
      ],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support `onToken` (function-form, 1)'
  )

  assert.deepEqual(
    tokens,
    tokens2,
    'should support `onToken` (function-form, 2)'
  )

  assert.equal(
    micromark('a {b.c} d', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support expression statements (1)'
  )

  assert.equal(
    micromark('a {1 + 1} b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support expression statements (2)'
  )

  assert.equal(
    micromark('a {function () {}} b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support expression statements (3)'
  )

  assert.throws(
    function () {
      micromark('a {var b = "c"} d', {extensions: [mdxExpression({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should crash on non-expressions'
  )

  assert.equal(
    micromark('> a {\n> b} c', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<blockquote>\n<p>a  c</p>\n</blockquote>',
    'should support expressions in containers'
  )

  assert.throws(
    function () {
      micromark('> a {\n> b<} c', {extensions: [mdxExpression({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should crash on incorrect expressions in containers (1)'
  )

  assert.throws(
    function () {
      micromark('> a {\n> b\n> c} d', {extensions: [mdxExpression({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected content after expression/,
    'should crash on incorrect expressions in containers (2)'
  )
})

test('text (agnostic)', function () {
  assert.equal(
    micromark('a {b} c', {
      extensions: [mdxExpression()],
      htmlExtensions: [html]
    }),
    '<p>a  c</p>',
    'should support an expression'
  )

  assert.equal(
    micromark('a {} b', {
      extensions: [mdxExpression()],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support an empty expression'
  )

  assert.throws(
    function () {
      micromark('a {b c', {extensions: [mdxExpression()]})
    },
    /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
    'should crash if no closing brace is found (1)'
  )

  assert.throws(
    function () {
      micromark('a {b { c } d', {extensions: [mdxExpression()]})
    },
    /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
    'should crash if no closing brace is found (2)'
  )

  assert.equal(
    micromark('a {\n} b', {
      extensions: [mdxExpression()],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support a line ending in an expression'
  )

  assert.equal(
    micromark('a } b', {extensions: [mdxExpression()], htmlExtensions: [html]}),
    '<p>a } b</p>',
    'should support just a closing brace'
  )

  assert.equal(
    micromark('{ a } b', {
      extensions: [mdxExpression()],
      htmlExtensions: [html]
    }),
    '<p> b</p>',
    'should support expressions as the first thing when following by other things'
  )
})

test('text (gnostic)', function () {
  assert.equal(
    micromark('a {b} c', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  c</p>',
    'should support an expression'
  )

  assert.throws(
    function () {
      micromark('a {??} b', {extensions: [mdxExpression({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should crash on an incorrect expression'
  )

  assert.equal(
    micromark('a {} b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support an empty expression'
  )

  assert.throws(
    function () {
      micromark('a {b c', {extensions: [mdxExpression({acorn})]})
    },
    /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
    'should crash if no closing brace is found (1)'
  )

  assert.throws(
    function () {
      micromark('a {b { c } d', {extensions: [mdxExpression({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected content after expression/,
    'should crash if no closing brace is found (2)'
  )

  assert.equal(
    micromark('a {\n} b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support a line ending in an expression'
  )

  assert.equal(
    micromark('a } b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a } b</p>',
    'should support just a closing brace'
  )

  assert.equal(
    micromark('{ a } b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p> b</p>',
    'should support expressions as the first thing when following by other things'
  )

  assert.equal(
    micromark('a { /* { */ } b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support an unbalanced opening brace (if JS permits)'
  )

  assert.equal(
    micromark('a { /* } */ } b', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support an unbalanced closing brace (if JS permits)'
  )
})

test('flow (agnostic)', function () {
  assert.equal(
    micromark('{a}', {extensions: [mdxExpression()], htmlExtensions: [html]}),
    '',
    'should support an expression'
  )

  assert.equal(
    micromark('{}', {extensions: [mdxExpression()], htmlExtensions: [html]}),
    '',
    'should support an empty expression'
  )

  assert.throws(
    function () {
      micromark('{a', {extensions: [mdxExpression()]})
    },
    /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
    'should crash if no closing brace is found (1)'
  )

  assert.throws(
    function () {
      micromark('{b { c }', {extensions: [mdxExpression()]})
    },
    /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
    'should crash if no closing brace is found (2)'
  )

  assert.equal(
    micromark('{\n}\na', {
      extensions: [mdxExpression()],
      htmlExtensions: [html]
    }),
    '<p>a</p>',
    'should support a line ending in an expression'
  )

  assert.equal(
    micromark('{ a } \t\nb', {
      extensions: [mdxExpression()],
      htmlExtensions: [html]
    }),
    '<p>b</p>',
    'should support expressions followed by spaces'
  )

  assert.equal(
    micromark('  { a }\nb', {
      extensions: [mdxExpression()],
      htmlExtensions: [html]
    }),
    '<p>b</p>',
    'should support expressions preceded by spaces'
  )

  assert.throws(
    function () {
      micromark('> {a\nb}', {extensions: [mdxExpression()]})
    },
    /Unexpected end of file in expression/,
    'should not support lazyness (1)'
  )

  assert.equal(
    micromark('> a\n{b}', {
      extensions: [mdxExpression()],
      htmlExtensions: [html]
    }),
    '<blockquote>\n<p>a</p>\n</blockquote>\n',
    'should not support lazyness (2)'
  )

  assert.equal(
    micromark('> {a}\nb', {
      extensions: [mdxExpression()],
      htmlExtensions: [html]
    }),
    '<blockquote>\n</blockquote>\n<p>b</p>',
    'should not support lazyness (3)'
  )

  assert.throws(
    function () {
      micromark('> {\n> a\nb}', {extensions: [mdxExpression()]})
    },
    /Unexpected end of file in expression/,
    'should not support lazyness (4)'
  )
})

test('flow (gnostic)', function () {
  assert.equal(
    micromark('{a}', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '',
    'should support an expression'
  )

  assert.equal(
    micromark('{}', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '',
    'should support an empty expression'
  )

  assert.throws(
    function () {
      micromark('{a', {extensions: [mdxExpression({acorn})]})
    },
    /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
    'should crash if no closing brace is found (1)'
  )

  assert.throws(
    function () {
      micromark('{b { c }', {extensions: [mdxExpression({acorn})]})
    },
    /Could not parse expression with acorn: Unexpected content after expression/,
    'should crash if no closing brace is found (2)'
  )

  assert.equal(
    micromark('{\n}\na', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>a</p>',
    'should support a line ending in an expression'
  )

  assert.equal(
    micromark('{ a } \t\nb', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>b</p>',
    'should support expressions followed by spaces'
  )

  assert.equal(
    micromark('  { a }\nb', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>b</p>',
    'should support expressions preceded by spaces'
  )

  assert.equal(
    micromark('  {`\n    a\n  `}', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '',
    'should support indented expressions'
  )

  assert.equal(
    micromark('a{(b)}c', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>ac</p>',
    'should support expressions padded w/ parens'
  )

  assert.equal(
    micromark('a{/* b */ ( (c) /* d */ + (e) )}f', {
      extensions: [mdxExpression({acorn})],
      htmlExtensions: [html]
    }),
    '<p>af</p>',
    'should support expressions padded w/ parens and comments'
  )
})
test('spread (hidden)', function () {
  assert.throws(
    function () {
      micromark('a {b} c', {
        extensions: [mdxExpression({acorn, spread: true})]
      })
    },
    /Unexpected `Property` in code: only spread elements are supported/,
    'should crash if not a spread'
  )

  assert.throws(
    function () {
      micromark('a {...?} c', {
        extensions: [mdxExpression({acorn, spread: true})]
      })
    },
    /Could not parse expression with acorn: Unexpected token/,
    'should crash on an incorrect spread'
  )

  assert.throws(
    function () {
      micromark('a {...b,c} d', {
        extensions: [mdxExpression({acorn, spread: true})]
      })
    },
    /Unexpected extra content in spread: only a single spread is supported/,
    'should crash if a spread and other things'
  )

  assert.equal(
    micromark('a {} b', {
      extensions: [mdxExpression({acorn, spread: true})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support an empty spread'
  )

  assert.throws(
    function () {
      micromark('a {} b', {
        extensions: [mdxExpression({acorn, spread: true, allowEmpty: false})]
      })
    },
    /Unexpected empty expression/,
    'should crash on an empty spread w/ `allowEmpty: false`'
  )

  assert.throws(
    function () {
      micromark('{a=b}', {
        extensions: [mdxExpression({acorn, spread: true, allowEmpty: false})]
      })
    },
    /Could not parse expression with acorn: Shorthand property assignments are valid only in destructuring patterns/,
    'should crash if not a spread w/ `allowEmpty`'
  )

  assert.equal(
    micromark('a {/* b */} c', {
      extensions: [mdxExpression({acorn, spread: true})],
      htmlExtensions: [html]
    }),
    '<p>a  c</p>',
    'should support a comment spread'
  )

  assert.throws(
    function () {
      micromark('a {/* b */} c', {
        extensions: [mdxExpression({acorn, spread: true, allowEmpty: false})]
      })
    },
    /Unexpected empty expression/,
    'should crash on a comment spread w/ `allowEmpty: false`'
  )

  assert.equal(
    micromark('a {...b} c', {
      extensions: [mdxExpression({acorn, spread: true})],
      htmlExtensions: [html]
    }),
    '<p>a  c</p>',
    'should support a spread'
  )
})
