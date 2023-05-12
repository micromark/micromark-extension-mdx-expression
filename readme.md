# micromark-extension-mdx-expression

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

Monorepo with a [`micromark`][micromark] extension,
[`micromark-extension-mdx-expression`][micromark-extension-mdx-expression],
and the underlying tools to handle JavaScript in markdown.

## Contents

*   [What is this?](#what-is-this)
*   [When to use this](#when-to-use-this)
*   [Contribute](#contribute)
*   [License](#license)

## What is this?

This project contains three packages:

*   [`micromark-extension-mdx-expression`][micromark-extension-mdx-expression]
    — extension to support MDX expressions in [`micromark`][micromark]
*   [`micromark-factory-mdx-expression`][micromark-factory-mdx-expression]
    — subroutine to parse the expressions
*   [`micromark-util-events-to-acorn`][micromark-util-events-to-acorn]
    — subroutine to parse micromark events with acorn

## When to use this

You might want to use
[`micromark-extension-mdx-expression`][micromark-extension-mdx-expression].

The rest is published separately to let
[`micromark-extension-mdx-jsx`][micromark-extension-mdx-jsx] parse expressions
in JSX and to let
[`micromark-extension-mdxjs-esm`][micromark-extension-mdxjs-esm] parse ESM.
You would only need `micromark-factory-mdx-expression` and
`micromark-util-events-to-acorn` if you want to build alternatives to these.

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

[license]: https://github.com/micromark/micromark-extension-mdx-expression/blob/main/license

[author]: https://wooorm.com

[contributing]: https://github.com/micromark/.github/blob/main/contributing.md

[support]: https://github.com/micromark/.github/blob/main/support.md

[coc]: https://github.com/micromark/.github/blob/main/code-of-conduct.md

[micromark]: https://github.com/micromark/micromark

[micromark-extension-mdx-jsx]: https://github.com/micromark/micromark-extension-mdx-jsx

[micromark-extension-mdx-expression]: packages/micromark-extension-mdx-expression/

[micromark-factory-mdx-expression]: packages/micromark-factory-mdx-expression/

[micromark-util-events-to-acorn]: packages/micromark-util-events-to-acorn/

[micromark-extension-mdxjs-esm]: https://github.com/micromark/micromark-extension-mdxjs-esm
