var acorn = require('acorn')
var jsx = require('acorn-jsx')
var test = require('tape')
var micromark = require('micromark/lib')
var syntax = require('.')

var html = {
  enter: {mdxFlowExpression: start, mdxTextExpression: start},
  exit: {mdxFlowExpression: end, mdxTextExpression: end}
}

function start() {
  this.buffer()
}

function end() {
  this.resume()
  this.setData('slurpOneLineEnding', true)
}

test('micromark-extension-mdx-expression', function (t) {
  t.throws(
    function () {
      syntax({acorn: true})
    },
    /Expected a proper `acorn` instance passed in as `options\.acorn`/,
    'should throw if `acorn` is passed but it has no `parse`'
  )

  t.throws(
    function () {
      syntax({addResult: true})
    },
    /Expected an `acorn` instance passed in as `options\.acorn`/,
    'should throw if `addResult` is passed w/o `acorn`'
  )

  t.throws(
    function () {
      syntax({acornOptions: {}})
    },
    /Expected an `acorn` instance passed in as `options\.acorn`/,
    'should throw if `acornOptions` is passed w/o `acorn`'
  )

  t.throws(
    function () {
      micromark('a {<b />} c', {extensions: [syntax({acorn: acorn})]})
    },
    /Could not parse expression with acorn: SyntaxError: Unexpected token/,
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
    function () {
      micromark('a {(() => {})()} c', {
        extensions: [syntax({acorn: acorn, acornOptions: {ecmaVersion: 5}})]
      })
    },
    /Could not parse expression with acorn: SyntaxError: Unexpected token/,
    'should support `acornOptions` (1)'
  )

  t.equal(
    micromark('a {(() => {})()} c', {
      extensions: [syntax({acorn: acorn, acornOptions: {ecmaVersion: 6}})],
      htmlExtensions: [html]
    }),
    '<p>a  c</p>',
    'should support `acornOptions` (2)'
  )

  t.equal(
    micromark('a {b} c', {
      extensions: [syntax({acorn: acorn, addResult: true})],
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

  function checkResultExpression(token) {
    t.ok(
      'estree' in token,
      '`addResult` should add `estree` to expression tokens'
    )
    t.equal(
      token.estree.type,
      'Identifier',
      '`addResult` should add an expression'
    )
    return start.call(this, token)
  }

  t.equal(
    micromark('a {} c', {
      extensions: [syntax({acorn: acorn, addResult: true})],
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

  function checkResultEmpty(token) {
    t.ok(
      'estree' in token,
      '`addResult` should add `estree` to expression tokens'
    )
    t.equal(
      token.estree,
      undefined,
      '`estree` should be empty for an empty expression'
    )
    return start.call(this, token)
  }

  t.equal(
    micromark('a {} b', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support an empty expression (1)'
  )

  t.equal(
    micromark('a { \t\r\n} b', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support an empty expression (2)'
  )

  t.equal(
    micromark('a {/**/} b', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support a multiline comment (1)'
  )

  t.equal(
    micromark('a {  /*\n*/\t} b', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support a multiline comment (2)'
  )

  t.equal(
    micromark('a {/*b*//*c*/} d', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support a multiline comment (3)'
  )

  t.equal(
    micromark('a {b/*c*/} d', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support a multiline comment (4)'
  )

  t.equal(
    micromark('a {/*b*/c} d', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support a multiline comment (4)'
  )

  t.throws(
    function () {
      micromark('a {//} b', {extensions: [syntax({acorn: acorn})]})
    },
    /Could not parse expression with acorn: SyntaxError: Unexpected token/,
    'should crash on a line comment (1)'
  )

  t.throws(
    function () {
      micromark('a { // b } c', {extensions: [syntax({acorn: acorn})]})
    },
    /Could not parse expression with acorn: SyntaxError: Unexpected token/,
    'should crash on a line comment (2)'
  )

  t.equal(
    micromark('a {//\n} b', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support a line comment followed by a line ending'
  )

  t.equal(
    micromark('a {// b\nd} d', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support a line comment followed by a line ending and an expression'
  )

  t.equal(
    micromark('a {b// c\n} d', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support an expression followed by a line comment and a line ending'
  )

  t.equal(
    micromark('a {b.c} d', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  d</p>',
    'should support expression statements (1)'
  )

  t.equal(
    micromark('a {1 + 1} b', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support expression statements (2)'
  )

  t.equal(
    micromark('a {function () {}} b', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<p>a  b</p>',
    'should support expression statements (3)'
  )

  t.throws(
    function () {
      micromark('a {var b = "c"} d', {extensions: [syntax({acorn: acorn})]})
    },
    /Could not parse expression with acorn: SyntaxError: Unexpected token/,
    'should crash on non-expressions'
  )

  t.equal(
    micromark('> a {\n> b} c', {
      extensions: [syntax({acorn: acorn})],
      htmlExtensions: [html]
    }),
    '<blockquote>\n<p>a  c</p>\n</blockquote>',
    'should support expressions in containers'
  )

  t.throws(
    function () {
      micromark('> a {\n> b<} c', {extensions: [syntax({acorn: acorn})]})
    },
    /Could not parse expression with acorn: SyntaxError: Unexpected token/,
    'should crash on incorrect expressions in containers (1)'
  )

  t.throws(
    function () {
      micromark('> a {\n> b\n> c} d', {extensions: [syntax({acorn: acorn})]})
    },
    /Unexpected content after expression, expected `}`/,
    'should crash on incorrect expressions in containers (2)'
  )

  test('text (agnostic)', function (t) {
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
      function () {
        micromark('a {b c', {extensions: [syntax()]})
      },
      /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
      'should crash if no closing brace is found (1)'
    )

    t.throws(
      function () {
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

  test('text (gnostic)', function (t) {
    t.equal(
      micromark('a {b} c', {
        extensions: [syntax({acorn: acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>',
      'should support an expression'
    )

    t.throws(
      function () {
        micromark('a {??} b', {extensions: [syntax({acorn: acorn})]})
      },
      /Could not parse expression with acorn: SyntaxError: Unexpected token/,
      'should crash on an incorrect expression'
    )

    t.equal(
      micromark('a {} b', {
        extensions: [syntax({acorn: acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>',
      'should support an empty expression'
    )

    t.throws(
      function () {
        micromark('a {b c', {extensions: [syntax({acorn: acorn})]})
      },
      /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
      'should crash if no closing brace is found (1)'
    )

    t.throws(
      function () {
        micromark('a {b { c } d', {extensions: [syntax({acorn: acorn})]})
      },
      /Unexpected content after expression, expected `}`/,
      'should crash if no closing brace is found (2)'
    )

    t.equal(
      micromark('a {\n} b', {
        extensions: [syntax({acorn: acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>',
      'should support a line ending in an expression'
    )

    t.equal(
      micromark('a } b', {
        extensions: [syntax({acorn: acorn})],
        htmlExtensions: [html]
      }),
      '<p>a } b</p>',
      'should support just a closing brace'
    )

    t.equal(
      micromark('{ a } b', {
        extensions: [syntax({acorn: acorn})],
        htmlExtensions: [html]
      }),
      '<p> b</p>',
      'should support expressions as the first thing when following by other things'
    )

    t.equal(
      micromark('a { /* { */ } b', {
        extensions: [syntax({acorn: acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>',
      'should support an unbalanced opening brace (if JS permits)'
    )

    t.equal(
      micromark('a { /* } */ } b', {
        extensions: [syntax({acorn: acorn})],
        htmlExtensions: [html]
      }),
      '<p>a  b</p>',
      'should support an unbalanced closing brace (if JS permits)'
    )

    t.end()
  })

  test('flow (agnostic)', function (t) {
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
      function () {
        micromark('{a', {extensions: [syntax()]})
      },
      /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
      'should crash if no closing brace is found (1)'
    )

    t.throws(
      function () {
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

    t.end()
  })

  test('flow (gnostic)', function (t) {
    t.equal(
      micromark('{a}', {
        extensions: [syntax({acorn: acorn})],
        htmlExtensions: [html]
      }),
      '',
      'should support an expression'
    )

    t.equal(
      micromark('{}', {
        extensions: [syntax({acorn: acorn})],
        htmlExtensions: [html]
      }),
      '',
      'should support an empty expression'
    )

    t.throws(
      function () {
        micromark('{a', {extensions: [syntax({acorn: acorn})]})
      },
      /Unexpected end of file in expression, expected a corresponding closing brace for `{`/,
      'should crash if no closing brace is found (1)'
    )

    t.throws(
      function () {
        micromark('{b { c }', {extensions: [syntax({acorn: acorn})]})
      },
      /Unexpected content after expression, expected `}`/,
      'should crash if no closing brace is found (2)'
    )

    t.equal(
      micromark('{\n}\na', {
        extensions: [syntax({acorn: acorn})],
        htmlExtensions: [html]
      }),
      '<p>a</p>',
      'should support a line ending in an expression'
    )

    t.equal(
      micromark('{ a } \t\nb', {
        extensions: [syntax({acorn: acorn})],
        htmlExtensions: [html]
      }),
      '<p>b</p>',
      'should support expressions followed by spaces'
    )

    t.equal(
      micromark('  { a }\nb', {
        extensions: [syntax({acorn: acorn})],
        htmlExtensions: [html]
      }),
      '<p>b</p>',
      'should support expressions preceded by spaces'
    )

    t.end()
  })

  test('spread (hidden)', function (t) {
    t.throws(
      function () {
        micromark('a {b} c', {
          extensions: [syntax({acorn: acorn, spread: true})]
        })
      },
      /Unexpected `Property` in code: only spread elements are supported/,
      'should crash if not a spread'
    )

    t.throws(
      function () {
        micromark('a {...?} c', {
          extensions: [syntax({acorn: acorn, spread: true})]
        })
      },
      /Could not parse expression with acorn: SyntaxError: Unexpected token/,
      'should crash on an incorrect spread'
    )

    t.throws(
      function () {
        micromark('a {} b', {
          extensions: [syntax({acorn: acorn, spread: true})]
        })
      },
      /Unexpected empty spread expression: expected `\.\.\.`/,
      'should crash on an empty spread'
    )

    t.throws(
      function () {
        micromark('a {/* b */} c', {
          extensions: [syntax({acorn: acorn, spread: true})]
        })
      },
      /Unexpected empty spread expression: expected `\.\.\.`/,
      'should crash on a comment spread'
    )

    t.equal(
      micromark('a {...b} c', {
        extensions: [syntax({acorn: acorn, spread: true})],
        htmlExtensions: [html]
      }),
      '<p>a  c</p>',
      'should support a spread'
    )

    t.end()
  })

  t.end()
})
