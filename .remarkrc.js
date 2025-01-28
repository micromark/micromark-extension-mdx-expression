/**
 * @import {CheckFlag} from 'remark-lint-fenced-code-flag'
 * @import {Preset} from 'unified'
 */

import remarkPresetWooorm from 'remark-preset-wooorm'
import remarkLintFencedCodeFlag, {
  checkGithubLinguistFlag
} from 'remark-lint-fenced-code-flag'
import remarkLintMaximumHeadingLength from 'remark-lint-maximum-heading-length'

/** @type {Preset} */
const remarkPresetMdx = {
  plugins: [
    remarkPresetWooorm,
    [remarkLintFencedCodeFlag, check],
    [remarkLintMaximumHeadingLength, false]
  ]
}

export default remarkPresetMdx

/**
 * Check according to GitHub Linguist.
 *
 * @param {string} value
 *   Language flag to check.
 * @returns {string | undefined}
 *   Whether the flag is valid (`undefined`),
 *   or a message to warn about (`string`).
 * @satisfies {CheckFlag}
 */
function check(value) {
  if (value === 'mdx-invalid') return undefined
  return checkGithubLinguistFlag(value)
}
