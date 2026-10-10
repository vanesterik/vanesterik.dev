# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [1.3.0](https://github.com/vanesterik/vanesterik.dev/compare/v1.2.1...v1.3.0) (2026-10-10)

### Features

* grab and drag a particle ([6b6b2c9](https://github.com/vanesterik/vanesterik.dev/commit/6b6b2c9a973fa8ef7adb850c3b5a8fb1b4bc64db)), references [#58](https://github.com/vanesterik/vanesterik.dev/issues/58)
* grow the buffer around a held particle and draw its edge ([0f0a56a](https://github.com/vanesterik/vanesterik.dev/commit/0f0a56a9c961ce2a09f94587c4c33175e593688a)), references [#58](https://github.com/vanesterik/vanesterik.dev/issues/58)
* keep other particles clear of a held particle ([bf6a465](https://github.com/vanesterik/vanesterik.dev/commit/bf6a465751ac3c8c52a8ae313d1fbb8778719742)), references [#58](https://github.com/vanesterik/vanesterik.dev/issues/58)
* keep the particle animation running when the theme changes ([6cc790a](https://github.com/vanesterik/vanesterik.dev/commit/6cc790aa084cecd3e82f96e24731bf9ec06d761f)), references [#56](https://github.com/vanesterik/vanesterik.dev/issues/56)
* keep the particle animation running when the viewport resizes ([15906fa](https://github.com/vanesterik/vanesterik.dev/commit/15906facccbd47c01c1d374c776a2989ddc6e009)), references [#56](https://github.com/vanesterik/vanesterik.dev/issues/56)
* keep the particles still for visitors who ask for reduced motion ([e404210](https://github.com/vanesterik/vanesterik.dev/commit/e4042108936c1f1866ef789b35a91350712868a3)), references [#60](https://github.com/vanesterik/vanesterik.dev/issues/60)
* let the particle animation fill the viewport ([bb05a74](https://github.com/vanesterik/vanesterik.dev/commit/bb05a746200b8dbfb7929016845d03b033a2b4af)), references [#56](https://github.com/vanesterik/vanesterik.dev/issues/56)
* set the number of particles per breakpoint ([18f8230](https://github.com/vanesterik/vanesterik.dev/commit/18f8230f90f68dff4bf8f228d0d6e6ed18f512e8)), references [#56](https://github.com/vanesterik/vanesterik.dev/issues/56)
* throw a particle and let it slow back down ([ff6227f](https://github.com/vanesterik/vanesterik.dev/commit/ff6227f7ec33f1fb17da8e5c92b94ce306338f1b)), references [#58](https://github.com/vanesterik/vanesterik.dev/issues/58)
* tone down the ring around a held particle ([b4e6fb4](https://github.com/vanesterik/vanesterik.dev/commit/b4e6fb413db3ab7d943c18c546f5204e1d9bc893)), references [#58](https://github.com/vanesterik/vanesterik.dev/issues/58)
* tone the ring around a held particle down further ([f2ee39e](https://github.com/vanesterik/vanesterik.dev/commit/f2ee39e3a9cc2ba7b0381ba7fae1f7ef14c60757)), references [#58](https://github.com/vanesterik/vanesterik.dev/issues/58)
* widen the buffer around a held particle to four radii ([5417712](https://github.com/vanesterik/vanesterik.dev/commit/5417712d48193d3e893d06e52285c84f60db6139)), references [#58](https://github.com/vanesterik/vanesterik.dev/issues/58)

### Bug Fixes

* draw the particles sharply on high-density screens ([9e80986](https://github.com/vanesterik/vanesterik.dev/commit/9e809864b05cbca5e529fd73597375d69c2a16d2)), references [#60](https://github.com/vanesterik/vanesterik.dev/issues/60)
* keep collision velocities exact instead of rounding them ([54774e2](https://github.com/vanesterik/vanesterik.dev/commit/54774e20076efbe65a312bf92176b99326bcae15)), references [#60](https://github.com/vanesterik/vanesterik.dev/issues/60)
* move a held particle with only the pointer that grabbed it ([ba3110a](https://github.com/vanesterik/vanesterik.dev/commit/ba3110ae8b02ba7bd96de461d7739305c5edc40f)), references [#58](https://github.com/vanesterik/vanesterik.dev/issues/58)
* move particles at the same speed on every refresh rate ([e2149b8](https://github.com/vanesterik/vanesterik.dev/commit/e2149b8bb83e956d9cfe57b3a0d1a2a25377c7ee)), references [#60](https://github.com/vanesterik/vanesterik.dev/issues/60)
* return a number from the first to the second in random ([d42aa7a](https://github.com/vanesterik/vanesterik.dev/commit/d42aa7ad52ebf6390ced84c425ffc1a5c2744111)), references [#60](https://github.com/vanesterik/vanesterik.dev/issues/60)

## [1.2.1](https://github.com/vanesterik/vanesterik.dev/compare/v1.2.0...v1.2.1) (2026-10-10)

## [1.2.0](https://github.com/vanesterik/vanesterik.dev/compare/v1.1.0...v1.2.0) (2026-10-10)

### Features

* add a bit of margin in the theme selector buttons ([aa7b1a2](https://github.com/vanesterik/vanesterik.dev/commit/aa7b1a20b5bd5d9cbb1fd651e2d71799cc67afb3))
* add a copy button to post code blocks ([e96526f](https://github.com/vanesterik/vanesterik.dev/commit/e96526f9e2bc33e1655f937887ba9d65069aaddd))
* add post list and detail pages with the first post ([658dc9e](https://github.com/vanesterik/vanesterik.dev/commit/658dc9e96c6a5e39ea868b8ed58ada5571308e8a))
* add storybook with the button stories ([f6930b2](https://github.com/vanesterik/vanesterik.dev/commit/f6930b23673183e14166f178e9c684874053398d))
* add the dropdown menu and theme selector stories ([57dcaff](https://github.com/vanesterik/vanesterik.dev/commit/57dcaff1b6f7c670eb1c932e94298d742f3d577a))
* add the shadcn/ui button and use it for navigation ([3c61d99](https://github.com/vanesterik/vanesterik.dev/commit/3c61d991b617cd90a506cf740fa74eadda41f500))
* handle the theme with next-themes ([342efc6](https://github.com/vanesterik/vanesterik.dev/commit/342efc61e12c8d1cd6ee4a4e2cfa74d5ddbf9dc1))
* keep the header and footer in view on wider screens ([5e1f047](https://github.com/vanesterik/vanesterik.dev/commit/5e1f047cd0e343f0c1b76cd708a7d5636480db38))
* let content scroll behind a transparent header and footer ([4f11b0e](https://github.com/vanesterik/vanesterik.dev/commit/4f11b0eb7a8c5832c52c7da8e79fa6e7222cf027))
* load and render markdown posts at build time ([f7a7ef4](https://github.com/vanesterik/vanesterik.dev/commit/f7a7ef436a897e4873edec0019eea424c88c5efe))
* rebuild the theme selector on the shadcn/ui dropdown menu ([681d87e](https://github.com/vanesterik/vanesterik.dev/commit/681d87e4a901c422dc0c78ed2f24af2d08e01c63))
* show a gear for the system theme ([2d1487b](https://github.com/vanesterik/vanesterik.dev/commit/2d1487b0d73a66295b15805dcf5088b53a95de63))

### Bug Fixes

* apply the dark theme again ([744ce50](https://github.com/vanesterik/vanesterik.dev/commit/744ce50d3266df0eb2519cf5c4275f8c6b61d9cc)), closes [#45](https://github.com/vanesterik/vanesterik.dev/issues/45)
* keep the pressed colour on theme menu items ([a9e9191](https://github.com/vanesterik/vanesterik.dev/commit/a9e91917b91f948a1fc0e778dcc677db6acdc274))
* let clicks and focus reach content behind the header and footer ([c121699](https://github.com/vanesterik/vanesterik.dev/commit/c1216990bfeb42bc2a4e6c4430d6a32f81c161d3))
* restore the pointer cursor on buttons ([04f84fd](https://github.com/vanesterik/vanesterik.dev/commit/04f84fd152c2264ddcc537947d17c26ed54287bd))
* stop the particle animation completely when leaving the home page ([8ac8411](https://github.com/vanesterik/vanesterik.dev/commit/8ac84117e51bde65da16d2c4a0fad11d909da881)), closes [#47](https://github.com/vanesterik/vanesterik.dev/issues/47)

## 1.1.0 (2025-08-11)

### Features

- add deployment workflow ([4ed299d](https://github.com/vanesterik/vanesterik.dev/commit/4ed299dd6cbd7a53c278372b7211303dc89c6a2f))
- add not found page ([edcb236](https://github.com/vanesterik/vanesterik.dev/commit/edcb236051e06cb5df43b96cb8a4aa9f11cc96ea))
- add tagline to cover component ([c5a2f7a](https://github.com/vanesterik/vanesterik.dev/commit/c5a2f7a4e07aa9e4ca7296ab21a37159199869fe))
- implement class variance authority to ui ([6eeb090](https://github.com/vanesterik/vanesterik.dev/commit/6eeb09066c4d49d5d5a0e9727dc6ab4bd015c8ca))
- implement ui functions in next app ([32cce9c](https://github.com/vanesterik/vanesterik.dev/commit/32cce9c6d592ebcdfeb0e89b3504d0b2d08c1001))
- initial commit ([2374649](https://github.com/vanesterik/vanesterik.dev/commit/237464951482d1abee628ace72b5ad8f6bf23a9d))
- introduce game functions ([d0fe010](https://github.com/vanesterik/vanesterik.dev/commit/d0fe010e36345985e64818ae9a981dafe865d755))
- prune and restructure utils package ([f0d1e6d](https://github.com/vanesterik/vanesterik.dev/commit/f0d1e6d27f1cc9dc328e78509707d465657b37f7))

### Bug Fixes

- resolve build issues ([e10d4db](https://github.com/vanesterik/vanesterik.dev/commit/e10d4db7252ac6ca8ac87e5edc9874de65bdc1b8))
- resolve cleanup issue ([1dd5df6](https://github.com/vanesterik/vanesterik.dev/commit/1dd5df6bc779dfdeba6dc4756edf2aa85f0f196f))
- resolve lint issues ([1ea1c0a](https://github.com/vanesterik/vanesterik.dev/commit/1ea1c0a90e7e03ae3cf20e293020413bce0066d3))
- resolve pnpm node order issue ([763daf8](https://github.com/vanesterik/vanesterik.dev/commit/763daf8b27e6185d3c179077c8b05f0c5a791a72))
