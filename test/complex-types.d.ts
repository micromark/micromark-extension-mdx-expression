export {}

declare module 'micromark-util-types' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface TokenTypeMap {
    expression: 'expression'
    expressionChunk: 'expressionChunk'
    expressionMarker: 'expressionMarker'
  }
}
