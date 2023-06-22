/**
 * @typedef {import('acorn').Comment} Comment
 * @typedef {import('acorn').Token} Token
 * @typedef {import('estree').Node} Node
 * @typedef {import('estree').Program} Program
 * @typedef {import('micromark-util-types').CompileContext} CompileContext
 * @typedef {import('micromark-util-types').Extension} Extension
 * @typedef {import('micromark-util-types').Handle} Handle
 * @typedef {import('micromark-util-types').HtmlExtension} HtmlExtension
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').TokenizeContext} TokenizeContext
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-factory-mdx-expression').Acorn} Acorn
 * @typedef {import('micromark-factory-mdx-expression').AcornOptions} AcornOptions
 *
 * @typedef {import('./complex-types.js')} DoNotTouchThisRegistersExtraTypes
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import {Parser} from 'acorn'
import acornJsx from 'acorn-jsx'
import {visit} from 'estree-util-visit'
import {micromark} from 'micromark'
import {mdxExpression} from 'micromark-extension-mdx-expression'
import {factoryMdxExpression} from 'micromark-factory-mdx-expression'
import {markdownLineEnding} from 'micromark-util-character'
import {codes} from 'micromark-util-symbol/codes.js'

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

test('api', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(
      Object.keys(await import('micromark-extension-mdx-expression')).sort(),
      ['mdxExpression']
    )
  })

  await t.test('should expose the public api', async function () {
    assert.deepEqual(
      Object.keys(await import('micromark-factory-mdx-expression')).sort(),
      ['factoryMdxExpression']
    )
  })

  await t.test('should expose the public api', async function () {
    assert.deepEqual(
      Object.keys(await import('micromark-util-events-to-acorn')).sort(),
      ['eventsToAcorn']
    )
  })
})

test('mdxExpression', async function (t) {
  await t.test(
    'should throw if `acorn` is passed but it has no `parse`',
    async function () {
      assert.throws(function () {
        // @ts-expect-error: check for a runtime error when `acorn` is incorrect.
        mdxExpression({acorn: true})
      }, /Expected a proper `acorn` instance passed in as `options\.acorn`/)
    }
  )

  await t.test(
    'should throw if `addResult` is passed w/o `acorn`',
    async function () {
      assert.throws(function () {
        mdxExpression({addResult: true})
      }, /Expected an `acorn` instance passed in as `options\.acorn`/)
    }
  )

  await t.test(
    'should throw if `acornOptions` is passed w/o `acorn`',
    async function () {
      assert.throws(function () {
        // @ts-expect-error: check for a runtime error when `acorn` is missing.
        mdxExpression({acornOptions: {}})
      }, /Expected an `acorn` instance passed in as `options\.acorn`/)
    }
  )

  await t.test('should not support JSX by default', async function () {
    assert.throws(function () {
      micromark('a {<b />} c', {extensions: [mdxExpression({acorn: Parser})]})
    }, /Could not parse expression with acorn: Unexpected token/)
  })

  await t.test(
    'should support JSX if an `acorn` instance supporting it is passed in',
    async function () {
      assert.equal(
        micromark('a {<b />} c', {
          extensions: [mdxExpression({acorn: Parser.extend(acornJsx())})],
          htmlExtensions: [html]
        }),
        '<p>a  c</p>'
      )
    }
  )

  await t.test('should support `acornOptions` (1)', async function () {
    assert.throws(function () {
      micromark('a {(() => {})()} c', {
        extensions: [mdxExpression({acorn, acornOptions: {ecmaVersion: 5}})]
      })
    }, /Could not parse expression with acorn: Unexpected token/)
  })

  await t.test('should support `acornOptions` (2)', async function () {
    assert.equal(
      micromark('a {(function () {})()} c', {
        extensions: [mdxExpression({acorn, acornOptions: {ecmaVersion: 6}})],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>'
    )
  })

  await t.test('should support `addResult`', async function () {
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
      '<p>a  c</p>'
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
  })

  await t.test(
    'should support `addResult` for an empty expression',
    async function () {
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
        '<p>a  c</p>'
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
    }
  )

  await t.test('should support an empty expression (1)', async function () {
    assert.equal(
      micromark('a {} b', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>'
    )
  })

  await t.test('should support an empty expression (2)', async function () {
    assert.equal(
      micromark('a { \t\r\n} b', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>'
    )
  })

  await t.test('should support a multiline comment (1)', async function () {
    assert.equal(
      micromark('a {/**/} b', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>'
    )
  })

  await t.test('should support a multiline comment (2)', async function () {
    assert.equal(
      micromark('a {  /*\n*/\t} b', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>'
    )
  })

  await t.test('should support a multiline comment (3)', async function () {
    assert.equal(
      micromark('a {/*b*//*c*/} d', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  d</p>'
    )
  })

  await t.test('should support a multiline comment (4)', async function () {
    assert.equal(
      micromark('a {b/*c*/} d', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  d</p>'
    )
  })

  await t.test('should support a multiline comment (4)', async function () {
    assert.equal(
      micromark('a {/*b*/c} d', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  d</p>'
    )
  })

  await t.test(
    'should crash on an incorrect line comment (1)',
    async function () {
      assert.throws(function () {
        micromark('a {//} b', {extensions: [mdxExpression({acorn})]})
      }, /Could not parse expression with acorn: Unexpected token/)
    }
  )

  await t.test(
    'should crash on an incorrect line comment (2)',
    async function () {
      assert.throws(function () {
        micromark('a { // b } c', {extensions: [mdxExpression({acorn})]})
      }, /Could not parse expression with acorn: Unexpected token/)
    }
  )

  await t.test(
    'should support a line comment followed by a line ending',
    async function () {
      assert.equal(
        micromark('a {//\n} b', {
          extensions: [mdxExpression({acorn})],
          htmlExtensions: [html]
        }),
        '<p>a  b</p>'
      )
    }
  )

  await t.test(
    'should support a line comment followed by a line ending and an expression',
    async function () {
      assert.equal(
        micromark('a {// b\nd} d', {
          extensions: [mdxExpression({acorn})],
          htmlExtensions: [html]
        }),
        '<p>a  d</p>'
      )
    }
  )

  await t.test(
    'should support an expression followed by a line comment and a line ending',
    async function () {
      assert.equal(
        micromark('a {b// c\n} d', {
          extensions: [mdxExpression({acorn})],
          htmlExtensions: [html]
        }),
        '<p>a  d</p>'
      )
    }
  )

  await t.test('should support comments', async function () {
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
      '<p>a  d</p>'
    )

    assert.deepEqual(comments, [
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
    ])

    /**
     * @this {CompileContext}
     * @type {Handle}
     */
    function checkResultComments(token) {
      assert.deepEqual(JSON.parse(JSON.stringify(token.estree)), {
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
      })

      return start.call(this, token)
    }
  })

  await t.test('should support `onComment` as a function', async function () {
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
      '<p>a  d</p>'
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
  })

  await t.test('should support `onToken` (array-form)', async function () {
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
      '<p>a  d</p>'
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
  })

  await t.test('should support `onToken` (function-form)', async function () {
    /** @type {Array<Token>} */
    const tokens = []

    assert.equal(
      micromark('a {b.c} d', {
        extensions: [
          mdxExpression({
            acorn,
            acornOptions: {
              ecmaVersion: 6,
              onToken(token) {
                tokens.push(token)
              }
            }
          })
        ],
        htmlExtensions: [html]
      }),
      '<p>a  d</p>'
    )

    assert.equal(tokens.length, 3)
  })

  await t.test('should support expression statements (1)', async function () {
    assert.equal(
      micromark('a {b.c} d', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  d</p>'
    )
  })

  await t.test('should support expression statements (2)', async function () {
    assert.equal(
      micromark('a {1 + 1} b', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>'
    )
  })

  await t.test('should support expression statements (3)', async function () {
    assert.equal(
      micromark('a {function () {}} b', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>'
    )
  })

  await t.test('should crash on non-expressions', async function () {
    assert.throws(function () {
      micromark('a {var b = "c"} d', {extensions: [mdxExpression({acorn})]})
    }, /Could not parse expression with acorn: Unexpected token/)
  })

  await t.test('should support expressions in containers', async function () {
    assert.equal(
      micromark('> a {\n> b} c', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<blockquote>\n<p>a  c</p>\n</blockquote>'
    )
  })

  await t.test(
    'should crash on incorrect expressions in containers (1)',
    async function () {
      assert.throws(function () {
        micromark('> a {\n> b<} c', {extensions: [mdxExpression({acorn})]})
      }, /Could not parse expression with acorn: Unexpected token/)
    }
  )

  await t.test(
    'should crash on incorrect expressions in containers (2)',
    async function () {
      assert.throws(function () {
        micromark('> a {\n> b\n> c} d', {extensions: [mdxExpression({acorn})]})
      }, /Could not parse expression with acorn: Unexpected content after expression/)
    }
  )
})

test('text (agnostic)', async function (t) {
  await t.test('should support an expression', async function () {
    assert.equal(
      micromark('a {b} c', {
        extensions: [mdxExpression()],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>'
    )
  })

  await t.test('should support an empty expression', async function () {
    assert.equal(
      micromark('a {} b', {
        extensions: [mdxExpression()],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>'
    )
  })

  await t.test(
    'should crash if no closing brace is found (1)',
    async function () {
      assert.throws(function () {
        micromark('a {b c', {extensions: [mdxExpression()]})
      }, /Unexpected end of file in expression, expected a corresponding closing brace for `{`/)
    }
  )

  await t.test(
    'should crash if no closing brace is found (2)',
    async function () {
      assert.throws(function () {
        micromark('a {b { c } d', {extensions: [mdxExpression()]})
      }, /Unexpected end of file in expression, expected a corresponding closing brace for `{`/)
    }
  )

  await t.test(
    'should support a line ending in an expression',
    async function () {
      assert.equal(
        micromark('a {\n} b', {
          extensions: [mdxExpression()],
          htmlExtensions: [html]
        }),
        '<p>a  b</p>'
      )
    }
  )

  await t.test('should support just a closing brace', async function () {
    assert.equal(
      micromark('a } b', {
        extensions: [mdxExpression()],
        htmlExtensions: [html]
      }),
      '<p>a } b</p>'
    )
  })

  await t.test(
    'should support expressions as the first thing when following by other things',
    async function () {
      assert.equal(
        micromark('{ a } b', {
          extensions: [mdxExpression()],
          htmlExtensions: [html]
        }),
        '<p> b</p>'
      )
    }
  )
})

test('text (gnostic)', async function (t) {
  await t.test('should support an expression', async function () {
    assert.equal(
      micromark('a {b} c', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>'
    )
  })

  await t.test('should crash on an incorrect expression', async function () {
    assert.throws(function () {
      micromark('a {??} b', {extensions: [mdxExpression({acorn})]})
    }, /Could not parse expression with acorn: Unexpected token/)
  })

  await t.test('should support an empty expression', async function () {
    assert.equal(
      micromark('a {} b', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>'
    )
  })

  await t.test(
    'should crash if no closing brace is found (1)',
    async function () {
      assert.throws(function () {
        micromark('a {b c', {extensions: [mdxExpression({acorn})]})
      }, /Unexpected end of file in expression, expected a corresponding closing brace for `{`/)
    }
  )

  await t.test(
    'should crash if no closing brace is found (2)',
    async function () {
      assert.throws(function () {
        micromark('a {b { c } d', {extensions: [mdxExpression({acorn})]})
      }, /Could not parse expression with acorn: Unexpected content after expression/)
    }
  )

  await t.test(
    'should support a line ending in an expression',
    async function () {
      assert.equal(
        micromark('a {\n} b', {
          extensions: [mdxExpression({acorn})],
          htmlExtensions: [html]
        }),
        '<p>a  b</p>'
      )
    }
  )

  await t.test('should support just a closing brace', async function () {
    assert.equal(
      micromark('a } b', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      '<p>a } b</p>'
    )
  })

  await t.test(
    'should support expressions as the first thing when following by other things',
    async function () {
      assert.equal(
        micromark('{ a } b', {
          extensions: [mdxExpression({acorn})],
          htmlExtensions: [html]
        }),
        '<p> b</p>'
      )
    }
  )

  await t.test(
    'should support an unbalanced opening brace (if JS permits)',
    async function () {
      assert.equal(
        micromark('a { /* { */ } b', {
          extensions: [mdxExpression({acorn})],
          htmlExtensions: [html]
        }),
        '<p>a  b</p>'
      )
    }
  )

  await t.test(
    'should support an unbalanced closing brace (if JS permits)',
    async function () {
      assert.equal(
        micromark('a { /* } */ } b', {
          extensions: [mdxExpression({acorn})],
          htmlExtensions: [html]
        }),
        '<p>a  b</p>'
      )
    }
  )
})

test('flow (agnostic)', async function (t) {
  await t.test('should support an expression', async function () {
    assert.equal(
      micromark('{a}', {extensions: [mdxExpression()], htmlExtensions: [html]}),
      ''
    )
  })

  await t.test('should support an empty expression', async function () {
    assert.equal(
      micromark('{}', {extensions: [mdxExpression()], htmlExtensions: [html]}),
      ''
    )
  })

  await t.test(
    'should crash if no closing brace is found (1)',
    async function () {
      assert.throws(function () {
        micromark('{a', {extensions: [mdxExpression()]})
      }, /Unexpected end of file in expression, expected a corresponding closing brace for `{`/)
    }
  )

  await t.test(
    'should crash if no closing brace is found (2)',
    async function () {
      assert.throws(function () {
        micromark('{b { c }', {extensions: [mdxExpression()]})
      }, /Unexpected end of file in expression, expected a corresponding closing brace for `{`/)
    }
  )

  await t.test(
    'should support a line ending in an expression',
    async function () {
      assert.equal(
        micromark('{\n}\na', {
          extensions: [mdxExpression()],
          htmlExtensions: [html]
        }),
        '<p>a</p>'
      )
    }
  )

  await t.test(
    'should support expressions followed by spaces',
    async function () {
      assert.equal(
        micromark('{ a } \t\nb', {
          extensions: [mdxExpression()],
          htmlExtensions: [html]
        }),
        '<p>b</p>'
      )
    }
  )

  await t.test(
    'should support expressions preceded by spaces',
    async function () {
      assert.equal(
        micromark('  { a }\nb', {
          extensions: [mdxExpression()],
          htmlExtensions: [html]
        }),
        '<p>b</p>'
      )
    }
  )

  await t.test('should not support lazyness (1)', async function () {
    assert.throws(function () {
      micromark('> {a\nb}', {extensions: [mdxExpression()]})
    }, /Unexpected end of file in expression/)
  })

  await t.test('should not support lazyness (2)', async function () {
    assert.equal(
      micromark('> a\n{b}', {
        extensions: [mdxExpression()],
        htmlExtensions: [html]
      }),
      '<blockquote>\n<p>a</p>\n</blockquote>\n'
    )
  })

  await t.test('should not support lazyness (3)', async function () {
    assert.equal(
      micromark('> {a}\nb', {
        extensions: [mdxExpression()],
        htmlExtensions: [html]
      }),
      '<blockquote>\n</blockquote>\n<p>b</p>'
    )
  })

  await t.test('should not support lazyness (4)', async function () {
    assert.throws(function () {
      micromark('> {\n> a\nb}', {extensions: [mdxExpression()]})
    }, /Unexpected end of file in expression/)
  })
})

test('flow (gnostic)', async function (t) {
  await t.test('should support an expression', async function () {
    assert.equal(
      micromark('{a}', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      ''
    )
  })

  await t.test('should support an empty expression', async function () {
    assert.equal(
      micromark('{}', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      ''
    )
  })

  await t.test(
    'should crash if no closing brace is found (1)',
    async function () {
      assert.throws(function () {
        micromark('{a', {extensions: [mdxExpression({acorn})]})
      }, /Unexpected end of file in expression, expected a corresponding closing brace for `{`/)
    }
  )

  await t.test(
    'should crash if no closing brace is found (2)',
    async function () {
      assert.throws(function () {
        micromark('{b { c }', {extensions: [mdxExpression({acorn})]})
      }, /Could not parse expression with acorn: Unexpected content after expression/)
    }
  )

  await t.test(
    'should support a line ending in an expression',
    async function () {
      assert.equal(
        micromark('{\n}\na', {
          extensions: [mdxExpression({acorn})],
          htmlExtensions: [html]
        }),
        '<p>a</p>'
      )
    }
  )

  await t.test(
    'should support expressions followed by spaces',
    async function () {
      assert.equal(
        micromark('{ a } \t\nb', {
          extensions: [mdxExpression({acorn})],
          htmlExtensions: [html]
        }),
        '<p>b</p>'
      )
    }
  )

  await t.test(
    'should support expressions preceded by spaces',
    async function () {
      assert.equal(
        micromark('  { a }\nb', {
          extensions: [mdxExpression({acorn})],
          htmlExtensions: [html]
        }),
        '<p>b</p>'
      )
    }
  )

  await t.test('should support indented expressions', async function () {
    assert.equal(
      micromark('  {`\n    a\n  `}', {
        extensions: [mdxExpression({acorn})],
        htmlExtensions: [html]
      }),
      ''
    )
  })

  await t.test(
    'should support expressions padded w/ parens',
    async function () {
      assert.equal(
        micromark('a{(b)}c', {
          extensions: [mdxExpression({acorn})],
          htmlExtensions: [html]
        }),
        '<p>ac</p>'
      )
    }
  )

  await t.test(
    'should support expressions padded w/ parens and comments',
    async function () {
      assert.equal(
        micromark('a{/* b */ ( (c) /* d */ + (e) )}f', {
          extensions: [mdxExpression({acorn})],
          htmlExtensions: [html]
        }),
        '<p>af</p>'
      )
    }
  )
})

test('spread (hidden)', async function (t) {
  await t.test('should crash if not a spread', async function () {
    assert.throws(function () {
      micromark('a {b} c', {
        extensions: [mdxExpression({acorn, spread: true})]
      })
    }, /Unexpected `Property` in code: only spread elements are supported/)
  })

  await t.test('should crash on an incorrect spread', async function () {
    assert.throws(function () {
      micromark('a {...?} c', {
        extensions: [mdxExpression({acorn, spread: true})]
      })
    }, /Could not parse expression with acorn: Unexpected token/)
  })

  await t.test('should crash if a spread and other things', async function () {
    assert.throws(function () {
      micromark('a {...b,c} d', {
        extensions: [mdxExpression({acorn, spread: true})]
      })
    }, /Unexpected extra content in spread: only a single spread is supported/)
  })

  await t.test('should support an empty spread', async function () {
    assert.equal(
      micromark('a {} b', {
        extensions: [mdxExpression({acorn, spread: true})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>'
    )
  })

  await t.test(
    'should crash on an empty spread w/ `allowEmpty: false`',
    async function () {
      assert.throws(function () {
        micromark('a {} b', {
          extensions: [mdxExpression({acorn, spread: true, allowEmpty: false})]
        })
      }, /Unexpected empty expression/)
    }
  )

  await t.test(
    'should crash if not a spread w/ `allowEmpty`',
    async function () {
      assert.throws(function () {
        micromark('{a=b}', {
          extensions: [mdxExpression({acorn, spread: true, allowEmpty: false})]
        })
      }, /Could not parse expression with acorn: Shorthand property assignments are valid only in destructuring patterns/)
    }
  )

  await t.test('should support a comment spread', async function () {
    assert.equal(
      micromark('a {/* b */} c', {
        extensions: [mdxExpression({acorn, spread: true})],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>'
    )
  })

  await t.test(
    'should crash on a comment spread w/ `allowEmpty: false`',
    async function () {
      assert.throws(function () {
        micromark('a {/* b */} c', {
          extensions: [mdxExpression({acorn, spread: true, allowEmpty: false})]
        })
      }, /Unexpected empty expression/)
    }
  )

  await t.test('should support a spread', async function () {
    assert.equal(
      micromark('a {...b} c', {
        extensions: [mdxExpression({acorn, spread: true})],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>'
    )
  })
})

test('positional info', async function (t) {
  await t.test(
    'should add correct positional info on acorn tokens',
    function () {
      const micromarkExample = 'a {b} c'
      const acornExample = '   b   '
      /** @type {Array<Token>} */
      const micromarkTokens = []
      /** @type {Array<Token>} */
      const acornTokens = []

      acorn.parseExpressionAt(acornExample, 0, {
        ecmaVersion: 'latest',
        onToken: acornTokens,
        locations: true,
        ranges: true
      })

      micromark(micromarkExample, {
        extensions: [
          createExtensionFromFactoryOptions(
            acorn,
            {ecmaVersion: 'latest', onToken: micromarkTokens},
            false,
            false,
            false,
            true
          )
        ]
      })

      removeOffsetsFromTokens(micromarkTokens)

      assert.deepEqual(
        JSON.parse(JSON.stringify(micromarkTokens)),
        JSON.parse(JSON.stringify(acornTokens))
      )
    }
  )

  await t.test(
    'should add correct positional info on acorn tokens with spread',
    function () {
      const micromarkExample = 'alp {...b}'
      const acornExample = 'a = {...b}'
      /** @type {Array<Token>} */
      const micromarkTokens = []
      /** @type {Array<Token>} */
      const acornTokens = []

      acorn.parseExpressionAt(acornExample, 0, {
        ecmaVersion: 'latest',
        onToken: acornTokens,
        locations: true,
        ranges: true
      })

      micromark(micromarkExample, {
        extensions: [
          createExtensionFromFactoryOptions(
            acorn,
            {ecmaVersion: 'latest', onToken: micromarkTokens},
            false,
            true,
            false,
            true
          )
        ]
      })

      removeOffsetsFromTokens(micromarkTokens)

      // Remove `a`, `=`, `{`
      acornTokens.splice(0, 3)
      // Remove `}`.
      acornTokens.pop()

      assert.deepEqual(
        JSON.parse(JSON.stringify(micromarkTokens)),
        JSON.parse(JSON.stringify(acornTokens))
      )
    }
  )

  await t.test(
    'should use correct positional info when tabs are used',
    function () {
      const micromarkExample = 'ab {`\n\t`}'
      const acornExample = 'a = `\n\t` '
      /** @type {Array<Token>} */
      const micromarkTokens = []
      /** @type {Array<Token>} */
      const acornTokens = []
      /** @type {Program | undefined} */
      let program

      const acornNode = /** @type {Node} */ (
        acorn.parseExpressionAt(acornExample, 0, {
          ecmaVersion: 'latest',
          onToken: acornTokens,
          locations: true,
          ranges: true
        })
      )

      micromark(micromarkExample, {
        extensions: [
          createExtensionFromFactoryOptions(
            acorn,
            {ecmaVersion: 'latest', onToken: micromarkTokens},
            true,
            false,
            false,
            true
          )
        ],
        htmlExtensions: [{enter: {expression}}]
      })

      if (program) removeOffsets(program)
      removeOffsetsFromTokens(micromarkTokens)

      // Remove: `a`, `=`
      acornTokens.splice(0, 2)

      assert.deepEqual(
        JSON.parse(JSON.stringify(micromarkTokens)),
        JSON.parse(JSON.stringify(acornTokens))
      )

      assert(acornNode.type === 'AssignmentExpression')

      assert.deepEqual(
        JSON.parse(JSON.stringify(program)),
        JSON.parse(
          JSON.stringify({
            type: 'Program',
            start: 4,
            end: 8,
            body: [
              {
                type: 'ExpressionStatement',
                expression: acornNode.right,
                start: 4,
                end: 8,
                loc: {start: {line: 1, column: 4}, end: {line: 2, column: 2}},
                range: [4, 8]
              }
            ],
            sourceType: 'module',
            comments: [],
            loc: {start: {line: 1, column: 4}, end: {line: 2, column: 2}},
            range: [4, 8]
          })
        )
      )

      /**
       * @this {CompileContext}
       * @type {Handle}
       */
      function expression(token) {
        program = token.estree
      }
    }
  )

  await t.test(
    'should use correct positional when there are virtual spaces due to a block quote',
    function () {
      // Note: we drop the entire tab in this case, even though it represents 3
      // spaces, where the first is eaten by the block quote.
      // I believe it would be too complex for users to understand that two spaces
      // are passed to acorn and present in template strings.
      const micromarkExample = '> ab {`\n>\t`}'
      const acornExample = '`\n`'
      /** @type {Array<Token>} */
      const micromarkTokens = []
      /** @type {Array<Token>} */
      const acornTokens = []
      /** @type {Program | undefined} */
      let program

      acorn.parseExpressionAt(acornExample, 0, {
        ecmaVersion: 'latest',
        onToken: acornTokens,
        locations: true,
        ranges: true
      })

      micromark(micromarkExample, {
        extensions: [
          createExtensionFromFactoryOptions(
            acorn,
            {ecmaVersion: 'latest', onToken: micromarkTokens},
            true,
            false,
            false,
            true
          )
        ],
        htmlExtensions: [{enter: {expression}}]
      })

      if (program) removeOffsets(program)
      removeOffsetsFromTokens(micromarkTokens)

      assert(acornTokens.length === 3)
      // `` ` ``
      acornTokens[0].start = 6
      assert(acornTokens[0].loc)
      acornTokens[0].loc.start.column = 6
      acornTokens[0].end = 7
      acornTokens[0].loc.end.column = 7
      acornTokens[0].range = [6, 7]
      // `template`
      acornTokens[1].start = 7
      assert(acornTokens[1].loc)
      acornTokens[1].loc.start.column = 7
      acornTokens[1].end = 10
      acornTokens[1].loc.end.column = 2
      acornTokens[1].range = [7, 10]
      // `` ` ``
      acornTokens[2].start = 10
      assert(acornTokens[2].loc)
      acornTokens[2].loc.start.column = 2
      acornTokens[2].end = 11
      acornTokens[2].loc.end.column = 3
      acornTokens[2].range = [10, 11]

      assert.deepEqual(
        JSON.parse(JSON.stringify(micromarkTokens)),
        JSON.parse(JSON.stringify(acornTokens))
      )

      assert.deepEqual(
        JSON.parse(JSON.stringify(program)),
        JSON.parse(
          JSON.stringify({
            type: 'Program',
            start: 6,
            end: 11,
            body: [
              {
                type: 'ExpressionStatement',
                expression: {
                  type: 'TemplateLiteral',
                  start: 6,
                  end: 11,
                  expressions: [],
                  quasis: [
                    {
                      type: 'TemplateElement',
                      start: 7,
                      end: 10,
                      value: {raw: '\n', cooked: '\n'},
                      tail: true,
                      loc: {
                        start: {line: 1, column: 7},
                        end: {line: 2, column: 2}
                      },
                      range: [7, 10]
                    }
                  ],
                  loc: {start: {line: 1, column: 6}, end: {line: 2, column: 3}},
                  range: [6, 11]
                },
                start: 6,
                end: 11,
                loc: {start: {line: 1, column: 6}, end: {line: 2, column: 3}},
                range: [6, 11]
              }
            ],
            sourceType: 'module',
            comments: [],
            loc: {start: {line: 1, column: 6}, end: {line: 2, column: 3}},
            range: [6, 11]
          })
        )
      )

      /**
       * @this {CompileContext}
       * @type {Handle}
       */
      function expression(token) {
        program = token.estree
      }
    }
  )
})

test('indent', async function (t) {
  await t.test(
    'should keep the correct number of spaces in a blockquote (flow)',
    function () {
      /** @type {Program | undefined} */
      let program

      micromark('> {`\n> alpha\n>  bravo\n>   charlie\n>    delta\n> `}', {
        extensions: [
          createExtensionFromFactoryOptions(
            acorn,
            {ecmaVersion: 'latest'},
            true
          )
        ],
        htmlExtensions: [{enter: {expression}}]
      })

      assert(program)
      const statement = program.body[0]
      assert(statement.type === 'ExpressionStatement')
      assert(statement.expression.type === 'TemplateLiteral')
      const quasi = statement.expression.quasis[0]
      assert(quasi)
      const value = quasi.value.cooked
      assert.equal(value, '\nalpha\n bravo\n  charlie\n   delta\n')

      /**
       * @this {CompileContext}
       * @type {Handle}
       */
      function expression(token) {
        program = token.estree
      }
    }
  )

  await t.test(
    'should keep the correct number of spaces in a blockquote (text)',
    function () {
      /** @type {Program | undefined} */
      let program

      micromark(
        '> alpha {`\n> bravo\n>  charlie\n>   delta\n>    echo\n> `} foxtrot.',
        {
          extensions: [
            createExtensionFromFactoryOptions(
              acorn,
              {ecmaVersion: 'latest'},
              true
            )
          ],
          htmlExtensions: [{enter: {expression}}]
        }
      )

      assert(program)
      const statement = program.body[0]
      assert(statement.type === 'ExpressionStatement')
      assert(statement.expression.type === 'TemplateLiteral')
      const quasi = statement.expression.quasis[0]
      assert(quasi)
      const value = quasi.value.cooked
      assert.equal(value, '\nbravo\n charlie\n  delta\n   echo\n')

      /**
       * @this {CompileContext}
       * @type {Handle}
       */
      function expression(token) {
        program = token.estree
      }
    }
  )
})

test('weird characters', async function (t) {
  await t.test('should support `\\0` and `\\r` in expressions', function () {
    /** @type {Program | undefined} */
    let program

    micromark('{`a\0b\rc\nd\r\ne`}', {
      extensions: [
        createExtensionFromFactoryOptions(acorn, {ecmaVersion: 'latest'}, true)
      ],
      htmlExtensions: [{enter: {expression}}]
    })

    assert(program)
    const statement = program.body[0]
    assert(statement.type === 'ExpressionStatement')
    assert(statement.expression.type === 'TemplateLiteral')
    const quasi = statement.expression.quasis[0]
    assert(quasi)
    const value = quasi.value.cooked
    assert.equal(value, 'a�b\nc\nd\ne')

    /**
     * @this {CompileContext}
     * @type {Handle}
     */
    function expression(token) {
      program = token.estree
    }
  })
})

/**
 * @param {Acorn | null | undefined} [acorn]
 *   Object with `acorn.parse` and `acorn.parseExpressionAt`.
 * @param {AcornOptions | null | undefined} [acornOptions]
 *   Configuration for acorn.
 * @param {boolean | null | undefined} [addResult=false]
 *   Add `estree` to token (default: `false`).
 * @param {boolean | null | undefined} [spread=false]
 *   Support a spread (`{...a}`) only (default: `false`).
 * @param {boolean | null | undefined} [allowEmpty=false]
 *   Support an empty expression (default: `false`).
 * @param {boolean | null | undefined} [allowLazy=false]
 *   Support lazy continuation of an expression (default: `false`).
 * @returns {Extension}
 *   Expression.
 */
// eslint-disable-next-line max-params
function createExtensionFromFactoryOptions(
  acorn,
  acornOptions,
  addResult,
  spread,
  allowEmpty,
  allowLazy
) {
  return {
    flow: {
      [codes.leftCurlyBrace]: {tokenize: tokenizeFlow, concrete: true}
    },
    text: {[codes.leftCurlyBrace]: {tokenize: tokenizeText}}
  }

  /**
   * @this {TokenizeContext}
   * @type {Tokenizer}
   */
  function tokenizeFlow(effects, ok, nok) {
    const self = this

    return start

    /** @type {State} */
    function start(code) {
      return factoryMdxExpression.call(
        self,
        effects,
        after,
        'expression',
        'expressionMarker',
        'expressionChunk',
        acorn,
        acornOptions,
        addResult,
        spread,
        allowEmpty
      )(code)
    }

    // Note: trailing whitespace not supported.
    /** @type {State} */
    function after(code) {
      return code === codes.eof || markdownLineEnding(code)
        ? ok(code)
        : nok(code)
    }
  }

  /**
   * @this {TokenizeContext}
   * @type {Tokenizer}
   */
  function tokenizeText(effects, ok) {
    const self = this

    return start

    /** @type {State} */
    function start(code) {
      return factoryMdxExpression.call(
        self,
        effects,
        ok,
        'expression',
        'expressionMarker',
        'expressionChunk',
        acorn,
        acornOptions,
        addResult,
        spread,
        allowEmpty,
        allowLazy
      )(code)
    }
  }
}

/**
 * @param {Node} node
 * @returns {undefined}
 */
function removeOffsets(node) {
  visit(node, function (d) {
    assert(d.loc, 'expected `loc`')
    // @ts-expect-error: we add offsets to our nodes, as we have them.
    delete d.loc.start.offset
    // @ts-expect-error: we add offsets.
    delete d.loc.end.offset
  })
}

/**
 * @param {Array<Token>} tokens
 * @returns {undefined}
 */
function removeOffsetsFromTokens(tokens) {
  for (const d of tokens) {
    // @ts-expect-error: we add offsets to our nodes, as we have them.
    delete d.loc?.start.offset
    // @ts-expect-error: we add offsets.
    delete d.loc?.end.offset
  }
}
