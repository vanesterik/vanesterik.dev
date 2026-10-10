import type { Root } from 'hast'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'

type PostContentProps = {
  tree: Root
}

// Renders a post's HTML syntax tree as React elements, so elements such as
// code blocks can be mapped to components
export const PostContent = ({ tree }: PostContentProps) =>
  toJsxRuntime(tree, { Fragment, jsx, jsxs })
