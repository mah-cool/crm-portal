# crm-portal — standing up the parallel project

This is an independent copy of the timber CRM (`first-website`), created so the
new **tile-based, section-split** system can be built without touching the live
app. It has its **own git repo, its own Vercel project, and its own (copied)
Neon database** — so the two run completely independently.

Do these four steps once. They're ordered; don't skip ahead.

---

## 1. Put the code on GitHub (its own repo)

The folder already has a fresh git repo with one commit. It just needs a home on
GitHub — a **new, separate repo** (not the `first-website` one).

**Easiest (web):**
1. Go to <https://github.com/new>.
2. Repository name: **`crm-portal`**. Set it **Private**.
3. **Do NOT** tick "Add a README / .gitignore / licence" — the folder already has files.
4. Click **Create repository**. GitHub shows a "push an existing repository" box.
5. In a terminal in this folder, run (replace the URL if GitHub shows a different one):
   ```bash
   cd C:/Users/m_sau/projects/crm-portal
   git remote add origin https://github.com/mah-cool/crm-portal.git
   git push -u origin main
   ```

That's it — the code is now on GitHub, separate from the live app.

---

## 2. Copy the Neon database (so data is independent)

You want the new system to start with all today's data but then diverge on its
own. Neon does this instantly with a **branch** (a copy-on-write clone).

1. Open the **Neon console** → your project (the one the live app uses).
2. Left menu → **Branches** → **New branch**.
3. Branch from **`main`** (your production branch). Name it **`crm-portal`**.
4. Click **Create**. It's an instant full copy of every table and row.
5. Open the new `crm-portal` branch → **Connection Details**.
6. Toggle **Pooled connection** ON, and **copy the connection string**
   (starts `postgresql://…`). Keep it handy for step 3 — this is the new
   `DATABASE_URL`.

> The two databases now share nothing going forward: changes in one don't affect
> the other. (If you'd rather a *fully* separate Neon project instead of a branch,
> create a new project and restore a dump — but a branch is simpler and free.)

---

## 3. Create the Vercel project (points at the new repo)

1. Go to <https://vercel.com/new>.
2. Under **Import Git Repository**, find **`crm-portal`** and click **Import**.
   (If you don't see it, click **Adjust GitHub App Permissions** and grant Vercel
   access to the new repo.)
3. Leave the framework as **Other** and the build settings at their defaults —
   this is a static site + `/api` serverless functions, no build step needed.
4. **Before clicking Deploy**, expand **Environment Variables** and add two:

   | Name           | Value                                                            |
   |----------------|------------------------------------------------------------------|
   | `DATABASE_URL` | the **pooled** Neon string from step 2 (the `crm-portal` branch) |
   | `JWT_SECRET`   | a fresh long random string (see below)                           |

   Generate a new secret locally and paste the output as the value:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
   (Use a *new* secret here — it doesn't need to match the live app.)
5. Click **Deploy**. After ~1 minute you'll get a URL like
   `https://crm-portal-xxxx.vercel.app`.

---

## 4. Log in

Because the database is a **copy**, all your existing users came across with it —
so you sign in at **`/login.html`** on the new URL with your normal credentials.
(You do *not* need `/setup.html`; that only runs when there are zero users.)

---

## Working on it (two people, no overwrites)

- Each person works on their **own branch**, never directly on `main`:
  ```bash
  git pull origin main          # start from latest
  git checkout -b your-name/feature
  # …work…
  git push -u origin your-name/feature
  ```
  Then open a Pull Request on GitHub and merge into `main`. Vercel auto-deploys
  `main`, and gives every PR its own preview URL.
- Keep this folder **out of OneDrive** (it already is). Sync only through git —
  never by copying files between machines.

## What's next

The code here is currently identical to the live app. The point of this project
is to build the **tile home + per-section file split** on top of it, so the two
people can each own a section. That work happens here, in `crm-portal`, leaving
`first-website` as the untouched live system.
