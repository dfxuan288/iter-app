# ITER website

The public website for ITER (separate from the app in `mobile/`). Plain static files: no build step.

Live address: https://itertravel.vercel.app (its own Vercel project, Root Directory = `website`).
The app it links to: https://iter-app-alpha.vercel.app

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole home page: layout, styles, animations and demo. |
| `privacy.html`, `terms.html` | Privacy notice and terms of use. Update the "Last updated" date when you change them. |
| `sg.js` | The moving gradient behind the hero (ShaderGradient bundled into one file). Source: `src/hero-gradient.jsx`. |
| `og.jpg` | The 1200×630 picture shown when the link is shared on WhatsApp, LinkedIn, etc. |
| `favicon-32.png`, `apple-touch-icon.png` | Browser tab icon and home-screen icon. |
| `vercel.json` | Clean URLs (`/privacy` instead of `/privacy.html`), security headers and caching. |
| `robots.txt`, `sitemap.xml` | Help search engines find the pages. |

## Changing prices, links or feature wording

Open `index.html` and find `window.ITER_SITE` near the top (inside `<head>`). Every price, plan, button
label, feature sentence and the app link lives there. Change it, commit, and Vercel redeploys.
Keep the prices in step with `mobile/src/config/plans.ts`.

## If the site's address changes

Search `index.html`, `robots.txt` and `sitemap.xml` for `itertravel.vercel.app` and replace it. The share
preview (`og:image`) must be a full address or WhatsApp will not show the picture.

## Rebuilding `sg.js` (only if you change the gradient)

```bash
npm i react@19 react-dom@19 three@0.180 @react-three/fiber@9 @shadergradient/react@2.4.20 esbuild
npx esbuild src/hero-gradient.jsx --bundle --minify --format=iife --jsx=automatic --outfile=sg.js
```

Page views are counted with Vercel Web Analytics (no cookies). Turn it on in the Vercel project: Analytics → Enable.
