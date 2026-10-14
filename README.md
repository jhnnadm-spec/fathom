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

## Explanations for any company (Supabase)

Companies without a saved explanation show a **Write the plain-English
explanation** button. Fathom then writes one with the free Cloudflare AI,
checks every point, and saves it in a free Supabase database.

- Limits (to stay free): about 6 new explanations a day in total, and 3 new
  companies per visitor per day. Requests over the daily total are queued.
- The **Daily explanations** workflow (GitHub Actions) runs at 23:10 UTC, just
  before the AI allowance resets. It writes queued companies, queues an update
  when a company files a newer report, and keeps Supabase from pausing.
- Database setup: paste `supabase/schema.sql` into Supabase → SQL Editor → Run.
- Settings needed on Vercel: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
  `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `VISITOR_SALT`.
  On GitHub (Actions secrets): `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.

## Sectors, watchlist and background facts

- **Build sector list** (GitHub Actions): groups every US-listed company by the
  industry code it gives the SEC, with yearly sales from SEC data so bigger
  companies come first. Runs on the 2nd of each month (about 20 minutes) and
  saves `content/sectors.json`.
- **Watchlist**: saved in each visitor's browser only. No accounts, nothing stored by Fathom.
- **Background facts**: chief executive, founding year, headquarters, employees
  and website come from Wikidata (CC0, free to reuse); the short introduction
  comes from Wikipedia (CC BY-SA 4.0, credited on the page). They're labelled as
  background and never used for financial figures.
