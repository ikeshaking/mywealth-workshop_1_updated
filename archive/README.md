# Archive

Code kept here is **not part of the Mabel app** and is **not deployed**. It lives
in this folder so nothing is lost, and so Vercel (which builds Mabel from the repo
root) can never accidentally build it.

## `mywealth-strategy-workshop/`

The original "MyWealth Strategy Workshop" starter — a separate Next.js app,
unrelated to Mabel. It was previously at the repo root, which caused a Vercel
project to build it by mistake.

To turn it back into its own live app later:

1. Create a new (empty) GitHub repository, e.g. `mywealth-strategy-workshop`.
2. Copy the contents of `archive/mywealth-strategy-workshop/` into it (these four
   files: `package.json`, `app/layout.jsx`, `app/page.jsx`,
   `components/ClientStrategyWorkshopPage.jsx`).
3. Import that repo into Vercel as its own project.

Its full history is also preserved in this repo's git history.
