import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Menu, Moon, Settings, Sun } from 'lucide-react'
import { useState } from 'react'

import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from './dropdown-menu'

const RadioMenu = () => {
  const [value, setValue] = useState('dark')

  return (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">{value}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={value} onValueChange={setValue}>
          <DropdownMenuRadioItem value="system">
            <Settings />
            system
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon />
            dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="light">
            <Sun />
            light
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const meta = {
  component: DropdownMenu,
} satisfies Meta<typeof DropdownMenu>

export default meta

type Story = StoryObj<typeof meta>

export const RadioGroupWithIcons: Story = {
  render: () => <RadioMenu />,
}

// Plain items holding links, as in the menu on narrow screens
export const ItemsAsLinks: Story = {
  render: () => (
    <DropdownMenu defaultOpen>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" aria-label="menu">
          <Menu />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <a href="/about">about</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/projects">projects</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/posts">posts</a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}
