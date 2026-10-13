# Fathom

Fathom helps anyone understand US public companies in plain English.
You search for a company, and Fathom gathers information from public sources
that allow it to be shared, explains it at three depths, and links every point
back to where it came from.

Fathom is for education only. It is not financial advice and never says buy,
sell or hold.

## How the project is organised

| Folder or file | What it is |
|---|---|
| `app/` | The website's pages. Each folder is a web address: `app/about/page.tsx` is `/about`. |
| `app/layout.tsx` | The frame around every page: header, footer and fonts. |
| `app/globals.css` | Fathom's colours and fonts, defined once. |
| `components/` | Reusable building blocks, such as the logo. |
| `.github/workflows/` | Instructions for GitHub's robot, which checks the code on every change. |
| `.env.example` | A list of the private settings (keys) the app needs, with no real values. |

More folders arrive as the build continues: `lib/` for data and AI code,
`content/` for the glossary, and `scripts/` for scheduled jobs.

## Where the information comes from

| Source | Used for |
|---|---|
| SEC EDGAR | Financial numbers, annual and quarterly reports, official announcements |
| The GDELT Project | News headlines with links to the original articles |
| Wikipedia | Company background |
| FRED | Economic context. This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis. |

## Running it on your own computer (optional)

1. Install [Node.js](https://nodejs.org) (the LTS version) and [Git](https://git-scm.com).
2. Download the project: `git clone https://github.com/jhnnadm-spec/fathom.git`
3. Open the folder in a terminal and install packages: `npm install`
4. Start the site: `npm run dev`, then open http://localhost:3000

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Runs the site on your computer, refreshing as you edit |
| `npm run lint` | Checks code style |
| `npm run typecheck` | Checks the code for type mistakes |
| `npm run build` | Builds the site exactly as it will be published |

## Publishing

The site is hosted on Vercel. Every time new code reaches the `main` branch on
GitHub, Vercel rebuilds and publishes it automatically.
