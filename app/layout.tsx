import './globals.css'

import type { ReactNode } from 'react'

import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { LinkList } from '@/components/link-list'
import { Navigation } from '@/components/navigation'
import { Prompt } from '@/components/prompt'
import { ThemeProvider, themeProviderProps } from '@/components/theme-provider'
import { ThemeSelector } from '@/components/theme-selector'
import layout from '@/content/layout.json'

import { lausanne, nbInternationalProMono } from './fonts'

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`${lausanne.variable} ${nbInternationalProMono.variable}`}
    >
      <body>
        <ThemeProvider {...themeProviderProps}>
          <div className="flex h-screen flex-col gap-0.5 px-3">
            <Header>
              <Navigation items={layout.menu} />
              <ThemeSelector options={layout.theme} />
            </Header>
            <main className="flex-auto md:min-h-0 md:overflow-y-auto">
              {children}
            </main>
            <Footer>
              <Prompt />
              <LinkList items={layout.contact} />
              <Prompt />
              <LinkList items={layout.social} />
              <div className="font-mono font-normal text-muted-foreground text-xs uppercase">
                &copy; {new Date().getFullYear().toString()}
              </div>
              <div className="font-mono font-normal text-muted-foreground text-xs uppercase">
                {layout.copyright}
              </div>
            </Footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
