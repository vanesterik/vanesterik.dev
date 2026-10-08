import localFont from 'next/font/local'

export const lausanne = localFont({
  src: [
    { path: './fonts/twk_lausanne_400.woff2', weight: '400', style: 'normal' },
    { path: './fonts/twk_lausanne_700.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-lausanne',
})

export const nbInternationalProMono = localFont({
  src: './fonts/nb_international_pro_mono.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-nb-international-pro-mono',
})
