# micromark-extension-mdx-expression

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

**[micromark][]** extension to support MDX (or MDX.js) expressions.

This package provides the low-level modules for integrating with the micromark
tokenizer but has no handling of compiling to HTML: go to a syntax tree instead.

[`micromark-factory-mdx-expression`][factory] and
[`micromark-util-events-to-acorn`][events-to-acorn] are also maintained here.

## When to use this

This package is already included in [xdm][] and [`mdx-js/mdx` (next)][mdx-js].

You should probably use [`micromark-extension-mdx`][mdx] or
[`micromark-extension-mdxjs`][mdxjs] instead, which combine this package with
other MDX features.
Alternatively, if you’re using [`micromark`][micromark] or
[`mdast-util-from-markdown`][from-markdown] and you don’t want all of MDX, use
this package.

## Install

This package is [ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c):
Node 12+ is needed to use it and it must be `import`ed instead of `require`d.

[npm][]:

```sh
npm install micromark-extension-mdx-expression
```

## Use

```js
import * as acorn from 'acorn'
import {micromark} from 'micromark'
import {mdxExpression} from 'micromark-extension-mdx-expression'

// Agnostic (balanced braces):
const output = micromark('a {1 + 1} b', {extensions: [mdxExpression()]})

console.log(output)

// Gnostic (JavaScript):
micromark('a {!} b', {extensions: [mdxExpression({acorn})]})
```

Yields:

```html
<p>a  b</p>
```

```txt
[1:5: Could not parse expression with acorn: Unexpected token] {
  reason: 'Could not parse expression with acorn: Unexpected token',
  line: 1,
  column: 5,
  source: 'micromark-extension-mdx-expression',
  ruleId: 'acorn',
  position: {
    start: { line: 1, column: 5, offset: 4 },
    end: { line: null, column: null }
  }
}
```

…which is rather useless: go to a syntax tree with
[`mdast-util-from-markdown`][from-markdown] and
[`mdast-util-mdx-expression`][util] instead.

## API

This package exports the following identifiers: `mdxExpression`.
There is no default export.

The export map supports the endorsed
[`development` condition](https://nodejs.org/api/packages.html#packages\_resolving\_user\_conditions).
Run `node --conditions development module.js` to get instrumented dev code.
Without this condition, production code is loaded.

### `mdxExpression(options?)`

A function that can be called with options that returns an extension for
micromark to parse expressions (can be passed in `extensions`).

##### `options`

###### `options.acorn`

Acorn parser to use ([`Acorn`][acorn], optional).

###### `options.acornOptions`

Options to pass to acorn (`Object`, default: `{ecmaVersion: 2020, sourceType:
'module'}`).
All fields can be set.
Positional info (`loc`, `range`) is set on ES nodes regardless of acorn options.

###### `options.addResult`

Whether to add an `estree` field to `mdxFlowExpression` and `mdxTextExpression`
tokens with the results from acorn (`boolean`, default: `false`).
Note that expressions can be empty or be just comments, in which case `estree`
will be undefined.

## Syntax

This extensions support both MDX and MDX.js.
The first is agnostic to the programming language (it could contain Rust or
so), the last is specific to JavaScript.
To turn on gnostic mode, pass `acorn`.

There are two types of expressions: in text (inline, span) or in flow (block).
They start with `{`.

Depending on whether `acorn` is passed, expressions are either parsed in several
tries until whole JavaScript is found (as in, nested curly braces depend on JS
expression nesting), or they are counted and must be balanced.

Expressions end with `}`.

For flow (block) expressions, optionally markdown spaces (` ` or `\t`) can occur
after the closing brace, and finally a markdown line ending (`\r`, `\n`) or the
end of the file must follow.

While markdown typically knows no errors, for MDX it is decided to instead
throw on invalid syntax.

```markdown
Here is an expression in a heading:

## Hello, {1 + 1}!

In agnostic mode, balanced braces can occur: {a + {b} + c}.

In gnostic mode, the value of the expression must be JavaScript, so
this would fail: {!}.
But, in gnostic mode, braces can be in comments, strings, or in other
places: {1 /* { */ + 2}.

The previous examples were text (inline, span) expressions, they can
also be flow (block):

{
  1 + 1
}

This is incorrect, because there are further characters:

{
  1 + 1
}!

Blank lines cannot occur in text, because markdown has already split them in
separate constructs, so this is incorrect: {1 +

1}


In flow, you can have blank lines:

{
  1 +

  2
}
```

## Errors

### Unexpected end of file in expression, expected a corresponding closing brace for `{`

This error occurs if a `{` was seen without a `}` (source:
`micromark-extension-mdx-expression`, rule id: `unexpected-eof`).
For example:

```markdown
a { b
```

### Could not parse expression with acorn: Unexpected content after expression

This error occurs when there is more content after a JS expression (source:
`micromark-extension-mdx-expression`, rule id: `acorn`).
For example:

```markdown
a {"b" "c"} d
```

### Could not parse expression with acorn: $error

This error occurs if acorn crashes (source: `micromark-extension-mdx-expression`,
rule id: `acorn`).
For example:

```markdown
a {var b = "c"} d
```

## Tokens

Two tokens are used, `mdxFlowExpression` and `mdxTextExpression`, to reflect
flow and text expressions.

They include:

*   `lineEnding` for the markdown line endings `\r`, `\n`, and `\r\n`
*   `mdxFlowExpressionMarker` and `mdxTextExpressionMarker` for the braces
*   `whitespace` for markdown spaces and tabs in blank lines
*   `mdxFlowExpressionChunk` and `mdxTextExpressionChunk` for chunks of
    expression content

## Related

*   [`micromark/micromark`][micromark]
    — the smallest commonmark-compliant markdown parser that exists
*   [`micromark/micromark-extension-mdx`][mdx]
    — micromark extension to support MDX
*   [`micromark/micromark-extension-mdxjs`][mdxjs]
    — micromark extension to support MDX.js
*   [`micromark/micromark-extension-mdx-jsx`][mdx-jsx]
    — micromark extension to support MDX (or MDX.js) JSX
*   [`micromark/micromark-extension-mdx-md`][mdx-md]
    — micromark extension to support misc MDX changes
*   [`micromark/micromark-extension-mdxjs-esm`][mdxjs-esm]
    — micromark extension to support MDX.js import/exports
*   [`syntax-tree/mdast-util-mdx`][mdast-util-mdx]
    — mdast utility to support MDX (or MDX.js)

## Contribute

See [`contributing.md` in `micromark/.github`][contributing] for ways to get
started.
See [`support.md`][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][license] © [Titus Wormer][author]

<!-- Definitions -->

[build-badge]: https://github.com/micromark/micromark-extension-mdx-expression/workflows/main/badge.svg

[build]: https://github.com/micromark/micromark-extension-mdx-expression/actions

[coverage-badge]: https://img.shields.io/codecov/c/github/micromark/micromark-extension-mdx-expression.svg

[coverage]: https://codecov.io/github/micromark/micromark-extension-mdx-expression

[downloads-badge]: https://img.shields.io/npm/dm/micromark-extension-mdx-expression.svg

[downloads]: https://www.npmjs.com/package/micromark-extension-mdx-expression

[size-badge]: https://img.shields.io/bundlephobia/minzip/micromark-extension-mdx-expression.svg

[size]: https://bundlephobia.com/result?p=micromark-extension-mdx-expression

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[collective]: https://opencollective.com/unified

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[chat]: https://github.com/micromark/micromark/discussions

[npm]: https://docs.npmjs.com/cli/install

[license]: https://github.com/micromark/micromark-extension-mdx-expression/blob/main/license

[author]: https://wooorm.com

[contributing]: https://github.com/micromark/.github/blob/HEAD/contributing.md

[support]: https://github.com/micromark/.github/blob/HEAD/support.md

[coc]: https://github.com/micromark/.github/blob/HEAD/code-of-conduct.md

[micromark]: https://github.com/micromark/micromark

[xdm]: https://github.com/wooorm/xdm

[mdx-js]: https://github.com/mdx-js/mdx

[mdx-jsx]: https://github.com/micromark/micromark-extension-mdx-jsx

[mdx-md]: https://github.com/micromark/micromark-extension-mdx-md

[mdxjs-esm]: https://github.com/micromark/micromark-extension-mdxjs-esm

[mdx]: https://github.com/micromark/micromark-extension-mdx

[mdxjs]: https://github.com/micromark/micromark-extension-mdxjs

[util]: https://github.com/syntax-tree/mdast-util-mdx-expression

[mdast-util-mdx]: https://github.com/syntax-tree/mdast-util-mdx

[from-markdown]: https://github.com/syntax-tree/mdast-util-from-markdown

[acorn]: https://github.com/acornjs/acorn

[factory]: https://github.com/micromark/micromark-extension-mdx-expression/tree/main/packages/micromark-factory-mdx-expression

[events-to-acorn]: https://github.com/micromark/micromark-extension-mdx-expression/tree/main/packages/micromark-util-events-to-acorn
