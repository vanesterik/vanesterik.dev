import './globals.css'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { MobileMenu } from '@/components/mobile-menu'
import { Navigation } from '@/components/navigation'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeSelector } from '@/components/theme-selector'
import layout from '@/content/layout.json'

import { lausanne, nbInternationalProMono } from './fonts'

// Resolves the canonical URLs pages give as paths
export const metadata: Metadata = {
  metadataBase: new URL('https://www.vanesterik.dev'),
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      suppressHydrationWarning
      lang="en"
      className={`${lausanne.variable} ${nbInternationalProMono.variable} md:scroll-pt-24 md:scroll-pb-24`}
    >
      <body>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col gap-0.5 px-3">
            <Header>
              <Navigation items={layout.menu} />
              <div className="flex flex-row gap-x-0.5">
                <div className="md:hidden">
                  <MobileMenu items={layout.menu} />
                </div>
                <ThemeSelector options={layout.theme} />
              </div>
            </Header>
            <main className="flex flex-auto flex-col">{children}</main>
            <Footer>
              <div className="font-mono font-normal text-muted-foreground/60 text-xs uppercase">
                &copy; {new Date().getFullYear().toString()} {layout.copyright}
              </div>
            </Footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
