import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Moon, Settings, Sun } from 'lucide-react'
import { useState } from 'react'

import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuContent,
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
