# Builder Pulse

What developers and builders are paying attention to right now.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Scheduled jobs (without Vercel Pro)

Vercel Cron is only available on the Pro plan. To run collectors and clustering on the free tier, use **GitHub Actions**:

1. Deploy the app to Vercel (or elsewhere) and note the URL.
2. In your GitHub repo go to **Settings → Secrets and variables → Actions**.
3. Add secrets:
   - **`CRON_SECRET`** — same value as in your app’s env (e.g. from `.env.local`).
   - **`APP_URL`** — your deployment URL (e.g. `https://your-app.vercel.app`).
4. The workflow in [`.github/workflows/cron.yml`](.github/workflows/cron.yml) runs every 15 minutes and calls the collect + cluster API routes.

You can also trigger a run manually from the **Actions** tab → **Builder Pulse Cron** → **Run workflow**.
