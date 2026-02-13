# Deployment Guide (Public URL + Custom Domain)

This guide shows how to publish the app so anyone can open it from a link.

## Option A (Easiest): Vercel

Vercel is the fastest path to a public URL + custom domain.

### 1) Create a Vercel project
1. Go to [https://vercel.com](https://vercel.com).
2. Import this GitHub repository.
3. Use these settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm install && npm run build -w @crypto/web`
   - **Output Directory**: `apps/web/dist`

A ready-to-use `vercel.json` is included in this repo.

### 2) Deploy
- Click **Deploy**.
- You get a public URL like `https://<project-name>.vercel.app`.

### 3) Add your domain
1. In Vercel project → **Settings** → **Domains**.
2. Add your domain (for example, `predictify.ai`).
3. In your domain registrar DNS panel, set records exactly as Vercel asks.
4. Wait for DNS propagation (can take minutes to hours).

---

## Option B: Netlify

### 1) Create a Netlify site
1. Go to [https://netlify.com](https://netlify.com).
2. Import this GitHub repo.
3. Build settings:
   - **Build command**: `npm install && npm run build -w @crypto/web`
   - **Publish directory**: `apps/web/dist`

A ready-to-use `netlify.toml` is included.

### 2) Deploy
- Netlify gives a public URL like `https://<site-name>.netlify.app`.

### 3) Add your domain
1. Site settings → **Domain management**.
2. Add your custom domain.
3. Update DNS records at your registrar per Netlify instructions.

---

## Option C: Continue with GitHub Pages

If you keep GitHub Pages:
- Make sure **Settings → Pages → Source** is **GitHub Actions**.
- Push to `main` or `master` so `.github/workflows/deploy-pages.yml` runs.
- Check **Actions** tab for deployment success.

---

## Domain checklist (works for any host)

1. Buy a domain from a registrar (Namecheap, Cloudflare, GoDaddy, etc.).
2. Decide if you want:
   - apex/root domain: `example.com`
   - subdomain: `app.example.com`
3. Point DNS to your host:
   - usually **A records** (root)
   - and/or **CNAME** (subdomain)
4. Enable HTTPS (automatic on Vercel/Netlify/GitHub Pages once DNS is correct).

---

## Recommended path

For your use case (public app quickly + domain):
- Use **Vercel** first.
- Attach domain after first successful deploy.
- Keep GitHub as source of truth, Vercel for hosting.
