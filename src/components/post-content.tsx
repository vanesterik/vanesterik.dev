import type { Root } from 'hast'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'

import { CodeBlock } from './code-block'

type PostContentProps = {
  tree: Root
}

// Renders a post's HTML syntax tree as React elements, so elements such as
// code blocks get a copy button
export const PostContent = ({ tree }: PostContentProps) =>
  toJsxRuntime(tree, { Fragment, jsx, jsxs, components: { pre: CodeBlock } })
