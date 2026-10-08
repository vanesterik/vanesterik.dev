'use client'

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from '@headlessui/react'
import { useSyncExternalStore } from 'react'
import { button, dropdown, type IconVariant, icon } from '@/lib/styles'
import { dropdownList, dropdownListItem } from '@/lib/styles/dropdown'

import { useTheme } from './theme-provider'

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
    <Listbox value={current} onChange={setTheme}>
      <div className={dropdown()}>
        <ListboxButton className={button({ intent: 'secondary' })}>
          <span
            className={icon({
              name: 'sun',
              class: 'dark:hidden',
            })}
          />
          <span
            className={icon({
              name: 'moon',
              class: 'hidden dark:block',
            })}
          />
          {current}
        </ListboxButton>
        <ListboxOptions className={dropdownList({ side: 'right' })}>
          {options.map(({ icon: iconName, name }) => (
            <ListboxOption
              className={dropdownListItem()}
              key={name}
              value={name}
            >
              <span className={icon({ name: iconName as IconVariant })} />
              {name}
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  )
}
