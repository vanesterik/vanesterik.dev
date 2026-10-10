'use client'

import { Moon, Settings, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const icons = { moon: Moon, settings: Settings, sun: Sun }

const subscribe = () => () => {}

type ThemeOption = {
  icon: string
  name: string
}

type ThemeSelectorProps = {
  options: ThemeOption[]
}

export const ThemeSelector = ({ options }: ThemeSelectorProps) => {
  const { theme, setTheme } = useTheme()
  const isHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  const current = isHydrated ? (theme ?? 'system') : 'system'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">
          <Sun className="dark:hidden" />
          <Moon className="hidden dark:block" />
          {/* Only the icon shows below md, to leave room for the menu */}
          <span className="max-md:sr-only">{current}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={current} onValueChange={setTheme}>
          {options.map(({ icon, name }) => {
            const Icon = icons[icon as keyof typeof icons]

            return (
              <DropdownMenuRadioItem key={name} value={name}>
                {Icon && <Icon />}
                {name}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
