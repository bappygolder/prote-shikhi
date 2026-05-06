# REBRAND-02 — GitHub Repo Rename (Bappy executes manually)

**Status**: ⏳ Pending (waiting on Bappy)
**Created**: 2026-05-06
**Predecessor commit**: `aa11ea2`
**Touches**: GitHub repo settings + local git remote URL. **No code, no docs.**
**Risk**: Low (GitHub auto-redirects old URLs forever, but other systems don't always follow redirects)
**Time**: 5 minutes
**Score**: 1.5 (low urgency, but cleanup feels good)

---

## Context

The GitHub remote currently lives at `https://github.com/bappygolder/prote-shikhi.git` — a misspelling of an older name candidate. The product is now **PoraShikhi**, so the repo name should match.

GitHub auto-redirects old URLs to new ones permanently, so existing clones, CI hooks, deploy webhooks, and PR links keep working. The only systems that need manual updates are ones that store the URL by hash or that don't follow redirects (rare but possible — Vercel, Expo EAS, GitHub Actions are all redirect-safe; most third-party CI tools are too).

---

## Decision lock

- **New repo name**: `porashikhi`
- **Owner stays**: `bappygolder` (personal account; oLab company GitHub org can be a separate decision later)
- **Old URL**: `https://github.com/bappygolder/prote-shikhi.git`
- **New URL**: `https://github.com/bappygolder/porashikhi.git`

---

## Manual steps (Bappy)

### 1. Rename the repo on GitHub

1. Go to https://github.com/bappygolder/prote-shikhi
2. Click **Settings** (top-right tab inside the repo)
3. Top of the General page, find **Repository name**
4. Change `prote-shikhi` → `porashikhi`
5. Click **Rename**
6. GitHub confirms with a green banner; old URLs redirect automatically.

### 2. Update the local git remote

In Terminal, in the project directory:

```bash
cd "/Users/bappygolder/Desktop/Desktop - MacBook Pro/Projects/_1. Co-Work Projects/04_bornomala-bangla-alphabet-training"

# Confirm the current remote
git remote -v

# Update the URL
git remote set-url origin https://github.com/bappygolder/porashikhi.git

# Verify
git remote -v

# Sanity check: a no-op fetch should succeed
git fetch origin
```

Expected after `git remote -v`:
```
origin  https://github.com/bappygolder/porashikhi.git (fetch)
origin  https://github.com/bappygolder/porashikhi.git (push)
```

### 3. Audit downstream systems

Quick check (most are redirect-safe but worth glancing at):

- [ ] **Vercel** (if connected): https://vercel.com/dashboard → project → Settings → Git → confirm repo URL still resolves. Vercel auto-follows GitHub renames; usually no action needed.
- [ ] **Expo EAS** (if/when you set this up): `eas.json` doesn't store the GitHub URL, so nothing to update there.
- [ ] **GitHub Actions** (if any workflows reference the repo by name in `actions/checkout` etc.): redirect-safe.
- [ ] **Claude Code memory paths**: `~/.claude/projects/-Users-bappygolder-...` — these are local paths, unaffected by GitHub rename.
- [ ] **Personal bookmarks / Slack / Notion links pointing at the repo**: GitHub redirects work, but updating bookmarks is courtesy.

### 4. Tell Claude in the next session

After the rename is done, in any future Claude session in this project, mention:
> "GitHub repo was renamed from `prote-shikhi` to `porashikhi` on 2026-05-06."

This avoids confusion if Claude grabs an outdated reference from memory.

---

## Verification

After step 2:

```bash
git push origin main --dry-run
```

Should print `Everything up-to-date` (no errors). Confirms the remote URL works.

---

## Rollback (if something breaks)

GitHub allows renaming back. From step 1, just rename `porashikhi` → `prote-shikhi` again, then re-run step 2 with the original URL. No data is lost.

---

## Out of scope

- Migrating the repo to an `oLab` GitHub organization (separate decision; needs the org to exist)
- Renaming branches (`main` stays)
- Force-pushing or rewriting history (do not do)

---

## Why Bappy does this manually

GitHub rename requires repo-admin auth on github.com. Claude Code can't drive a web UI, and using the `gh` CLI for `gh repo rename` requires interactive confirmation that's unreliable in the CLI environment. 30 seconds in the browser is the simplest path.
