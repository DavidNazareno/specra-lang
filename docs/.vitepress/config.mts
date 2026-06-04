import { defineConfig } from 'vitepress'

const base = process.env.DOCS_BASE || '/'

export default defineConfig({
  title: 'Specra',
  description: 'Contract-driven AI coding and verification.',
  base,
  cleanUrls: true,
  themeConfig: {
    logo: {
      light: '/logo-black.svg',
      dark: '/logo-white.svg',
    },
    siteTitle: false,
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'Language', link: '/language-scl' },
      { text: 'Verification', link: '/verification-workflow' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Agents', link: '/agents' },
          { text: 'Current Stable Surface', link: '/current-stable-surface' },
        ],
      },
      {
        text: 'Authoring',
        items: [{ text: 'Language Guide', link: '/language-scl' }],
      },
      {
        text: 'Verification',
        items: [
          { text: 'Verification Workflow', link: '/verification-workflow' },
        ],
      },
      {
        text: 'Release',
        items: [
          { text: 'Publishing Checklist', link: '/publishing-checklist' },
          { text: 'Versioning and Releases', link: '/versioning-and-releases' },
        ],
      },
      {
        text: 'RFCs',
        items: [{ text: '0001 Vision', link: '/rfc/0001-vision' }],
      },
    ],
    search: {
      provider: 'local',
    },
    footer: {
      message: 'Contract-driven AI coding and verification.',
      copyright: 'Released under the MIT License.',
    },
  },
})
