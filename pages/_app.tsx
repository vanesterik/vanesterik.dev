import '@/styles/globals.css'

import type { AppProps } from 'next/app'

import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { LinkList } from '@/components/link-list'
import { Navigation } from '@/components/navigation'
import { Prompt } from '@/components/prompt'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeSelector } from '@/components/theme-selector'
import layout from '@/content/layout.json'
import { container, main, text } from '@/lib/styles'

function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <div className={container()}>
        <Header>
          <Navigation items={layout.menu} />
          <ThemeSelector options={layout.theme} />
        </Header>
        <main className={main()}>
          <Component {...pageProps} />
        </main>
        <Footer>
          <Prompt />
          <LinkList items={layout.contact} />
          <Prompt />
          <LinkList items={layout.social} />
          <div className={text({ intent: 'footnote' })}>
            &copy; {new Date().getFullYear().toString()}
          </div>
          <div className={text({ intent: 'footnote' })}>{layout.copyright}</div>
        </Footer>
      </div>
    </ThemeProvider>
  )
}

export default App
