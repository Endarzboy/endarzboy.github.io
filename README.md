# Maregu Assefa — personal academic website

A plain Jekyll site that GitHub Pages builds by itself. There's no theme to install and no build workflow to maintain.
Live at **https://endarzboy.github.io** once it's published (see *Publish* below).

```
_config.yml              ← name, title, email, profile links, navigation
index.md                 ← home page bio + research-interest tags
_data/publications.yml   ← ALL publications (newest first)
_news/                   ← one small .md file per news item or event
_data/projects.yml       ← featured project cards
_data/cv.yml             ← CV timeline (positions, education, awards, service)
assets/img/              ← profile photo, favicon
assets/cv/               ← put your CV PDF here
tools/bib2yml.py         ← BibTeX → publication entry converter
```

---

## Everyday updates

You can do all of these straight on github.com: open the file, click ✏️, edit, then **Commit changes**.
The site updates about a minute later.

### Add a publication

**Option A — from BibTeX (fastest).** On Google Scholar click **Cite → BibTeX** under the paper, copy it, then:

```bash
python3 tools/bib2yml.py --prepend      # paste the BibTeX, then Ctrl-D (Windows: Ctrl-Z, Enter)
```

This inserts a ready entry at the top of `_data/publications.yml`. The PDF button is filled from the DOI/arXiv;
add `code`/`project` links and `selected: true` (to show it on the home page) if you like.

**Option B — by hand.** Copy the top entry of `_data/publications.yml` and edit it:

```yaml
- id: mypaper-2027                 # unique; also the thumbnail file name
  title: "My New Paper"
  authors: [Maregu Assefa, Co Author, Naoufel Werghi]
  venue: Medical Image Computing and Computer Assisted Intervention (MICCAI)
  venue_short: MICCAI              # text on the thumbnail badge
  note: Oral                       # optional highlight
  year: 2027
  type: conference                 # conference | journal | preprint | workshop
  selected: true                   # also show on the home page
  thumbnail: /assets/img/papers/mypaper-2027.jpg
  links:
    pdf: https://arxiv.org/pdf/...  # or the publisher/DOI page
    arxiv: https://arxiv.org/abs/...
    code: https://github.com/Endarzboy/...
    project: https://...
  bibtex: |
    @inproceedings{...}
```

**Thumbnail:** save the paper's first figure or main architecture figure as
`assets/img/papers/<id>.jpg` (about 1200–1400 px wide; white background works best).
Without one, a neat placeholder with the venue name is shown. Visitors can click a thumbnail to enlarge it.

Keep the list **newest first** — the site shows papers in file order. Your name is bolded automatically
(variants are listed under `self_names` in `_config.yml`).

### Add a news item

Create a file in `_news/` named `YYYY-MM-DD-short-name.md`:

```markdown
---
title: Paper accepted at MICCAI 2027
date: 2027-06-15
category: paper          # paper | award | talk | news
---
Our paper **XYZ** is accepted at **MICCAI 2027**. [Preprint](https://arxiv.org/abs/...)
```

The home page shows the latest 6 (`home.news_count` in `_config.yml`). The News page shows all of them, grouped by year.

### Add an event (talk, conference, workshop)

Same as a news item, but with `category: event` and dates:

```markdown
---
title: Invited talk at XYZ Workshop
date: 2027-03-10
category: event
start: 2027-03-10
end: 2027-03-11          # optional, for multi-day events
location: Abu Dhabi, UAE
link: https://...        # optional
---
Talking about label-efficient medical image segmentation.
```

Events whose end date hasn't passed appear under **Upcoming** on the home and News pages. After the date passes they
move to **Past events** automatically. The check runs in the visitor's browser, so you never need to edit or rebuild.

### Other updates

| What | Where |
|---|---|
| Profile photo | Add `assets/img/profile.jpg` (square, ≥ 400 px), then set `author.avatar: /assets/img/profile.jpg` in `_config.yml` |
| Email / ResearchGate / X | `_config.yml` → `author.email`, `links.researchgate`, `links.twitter` (empty values are hidden) |
| CV PDF | Put it in `assets/cv/` and set `cv_pdf: /assets/cv/<file>.pdf` |
| Bio and interest tags | `index.md` |
| Featured projects | `_data/projects.yml` (other GitHub repos are listed automatically; hide some with `github_exclude`) |
| CV timeline | `_data/cv.yml` |
| Colours and fonts | Top of `assets/css/main.css` (`--accent`, `--bg`, …; the dark theme is below them) |

---

## Publish on GitHub Pages (one-time)

1. Create a **public** repository named exactly **`Endarzboy.github.io`** on GitHub.
   (Your `reform3d-website` project page keeps working at `/reform3d-website/`, so don't add a folder with that name here.)
2. Upload the contents of this folder. Either drag and drop the files into **Add file → Upload files**, or run:
   ```bash
   git init && git add . && git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/Endarzboy/Endarzboy.github.io.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages → Build and deployment**, set **Source: Deploy from a branch**, then pick **Branch: `main` / `(root)`**.
4. After 1–2 minutes the site is live at https://endarzboy.github.io.

## Preview locally (optional)

This needs Ruby (on Windows, use RubyInstaller with the DevKit):

```bash
bundle install
bundle exec jekyll serve --livereload     # open http://localhost:4000
```

---

Icons: [Lucide](https://lucide.dev) (ISC) and [Simple Icons](https://simpleicons.org) (CC0).
Fonts: Inter and Source Serif 4 (SIL OFL), self-hosted in `assets/fonts/`.
