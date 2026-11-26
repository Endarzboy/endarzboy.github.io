#!/usr/bin/env python3
"""Convert BibTeX entries into YAML blocks for _data/publications.yml.

Usage
-----
  python3 tools/bib2yml.py                 # paste BibTeX, then Ctrl-D (Ctrl-Z Enter on Windows)
  python3 tools/bib2yml.py paper.bib       # convert a file (can contain many entries)
  python3 tools/bib2yml.py paper.bib --prepend
                                           # also insert the result at the top of _data/publications.yml

Tip: on Google Scholar click "Cite" -> "BibTeX" under a paper and paste it here.
Then open the YAML, check the venue_short badge, add code/project links and a thumbnail.
No third-party packages needed.
"""
import re
import sys
from pathlib import Path

KNOWN_VENUES = [
    (r"neural information processing|neurips|nips", "NeurIPS"),
    (r"computer vision and pattern recognition|\bcvpr\b", "CVPR"),
    (r"international conference on computer vision|\biccv\b", "ICCV"),
    (r"european conference on computer vision|\beccv\b", "ECCV"),
    (r"learning representations|\biclr\b", "ICLR"),
    (r"international conference on machine learning|\bicml\b", "ICML"),
    (r"medical image computing|\bmiccai\b", "MICCAI"),
    (r"\baaai\b", "AAAI"),
    (r"acm multimedia|\bacm mm\b", "ACM MM"),
    (r"image processing.*\(icip\)|\bicip\b", "ICIP"),
    (r"transactions on medical imaging", "IEEE TMI"),
    (r"medical image analysis", "MedIA"),
    (r"pattern analysis and machine intelligence", "IEEE TPAMI"),
    (r"transactions on image processing", "IEEE TIP"),
    (r"transactions on multimedia", "IEEE TMM"),
    (r"circuits and systems for video technology", "IEEE TCSVT"),
    (r"biomedical and health informatics", "IEEE JBHI"),
    (r"neural networks and learning systems", "IEEE TNNLS"),
    (r"internet of things journal", "IEEE IoT-J"),
    (r"pattern recognition letters", "PRL"),
    (r"^pattern recognition$", "PR"),
    (r"neurocomputing", "Neurocomputing"),
    (r"arxiv|corr", "arXiv"),
]
SELF = "Maregu Assefa"


def parse_entries(text):
    entries, i = [], 0
    while True:
        m = re.search(r"@(\w+)\s*\{\s*([^,\s]+)\s*,", text[i:])
        if not m:
            break
        start = i + m.start()
        j, depth = i + m.end(), 1
        while j < len(text) and depth:
            depth += {"{": 1, "}": -1}.get(text[j], 0)
            j += 1
        raw = text[start:j]
        entries.append((m.group(1).lower(), m.group(2), parse_fields(text[i + m.end():j - 1]), raw))
        i = j
    return entries


def parse_fields(body):
    fields, k = {}, 0
    while k < len(body):
        m = re.match(r"\s*,?\s*([A-Za-z_\-]+)\s*=\s*", body[k:])
        if not m:
            break
        name, k = m.group(1).lower(), k + m.end()
        if k < len(body) and body[k] == "{":
            depth, s = 1, k + 1
            k += 1
            while k < len(body) and depth:
                depth += {"{": 1, "}": -1}.get(body[k], 0)
                k += 1
            val = body[s:k - 1]
        elif k < len(body) and body[k] == '"':
            s = k + 1
            k = body.index('"', s) + 1
            val = body[s:k - 1]
        else:
            m2 = re.match(r"[^,]+", body[k:])
            val = m2.group(0).strip() if m2 else ""
            k += len(m2.group(0)) if m2 else 1
        fields[name] = clean(val)
    return fields


def clean(s):
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("\\&", "&").replace("--", "–")
    return re.sub(r"[{}]", "", s)


def names(author_field):
    out = []
    for a in re.split(r"\s+and\s+", author_field):
        a = a.strip()
        if "," in a:
            last, first = [x.strip() for x in a.split(",", 1)]
            a = f"{first} {last}".strip()
        out.append(a)
    return out


def q(s):
    s = str(s)
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def to_yaml(etype, key, f, raw):
    venue = f.get("booktitle") or f.get("journal") or f.get("publisher") or f.get("howpublished") or ""
    low = venue.lower()
    short = next((v for pat, v in KNOWN_VENUES if re.search(pat, low)), "")
    if not short:
        m = re.search(r"\(([A-Z][A-Za-z\-]{1,12})\)", venue)
        short = m.group(1) if m else ""
    if "arxiv" in low or "corr" in low or etype in ("misc", "unpublished", "techreport"):
        ptype = "preprint"
    elif etype in ("inproceedings", "conference", "proceedings", "incollection"):
        ptype = "conference"
    else:
        ptype = "journal"
    year = re.sub(r"\D", "", f.get("year", "")) or "TODO"
    links = {}
    if f.get("doi"):
        links["doi"] = "https://doi.org/" + f["doi"].replace("https://doi.org/", "")
    if f.get("eprint") and ("arxiv" in f.get("archiveprefix", "arxiv").lower()):
        links["arxiv"] = "https://arxiv.org/abs/" + f["eprint"]
    m = re.search(r"arxiv[: ](\d{4}\.\d{4,5})", (f.get("journal", "") + " " + f.get("note", "")).lower())
    if m and "arxiv" not in links:
        links["arxiv"] = "https://arxiv.org/abs/" + m.group(1)
    if f.get("url") and not any(f["url"] in v for v in links.values()):
        links["pdf"] = f["url"]
    if "pdf" not in links:
        links["pdf"] = links.get("arxiv", "").replace("/abs/", "/pdf/") or links.get("doi", "")
        if not links["pdf"]:
            del links["pdf"]

    authors = names(f.get("author", ""))
    lines = [
        f"- id: {key}",
        f"  title: {q(f.get('title', 'TODO'))}",
        "  authors: [" + ", ".join(q(a) for a in authors) + "]",
        f"  venue: {q(venue or 'TODO')}",
        f"  venue_short: {q(short or 'TODO')}",
        f"  year: {year}",
        f"  type: {ptype}",
        "  selected: false",
        f"  thumbnail: \"\"          # e.g. /assets/img/papers/{key}.jpg",
        "  links:",
    ]
    for k in ("pdf", "arxiv", "code", "project", "doi"):
        if k in links:
            lines.append(f"    {k}: {links[k]}")
    lines.append("    # code: https://github.com/...   project: https://...")
    lines.append("  bibtex: |")
    lines += ["    " + ln.rstrip() for ln in raw.strip().splitlines()]
    if SELF.lower() not in " ".join(authors).lower():
        lines.insert(0, f"# NOTE: '{SELF}' not found in the author list of {key} — check the spelling.")
    return "\n".join(lines)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    text = Path(args[0]).read_text(encoding="utf-8") if args else sys.stdin.read()
    entries = parse_entries(text)
    if not entries:
        sys.exit("No BibTeX entries found.")
    yaml_block = "\n\n".join(to_yaml(*e) for e in entries) + "\n"
    print(yaml_block)
    if "--prepend" in sys.argv:
        target = Path(__file__).resolve().parent.parent / "_data" / "publications.yml"
        content = target.read_text(encoding="utf-8")
        m = re.search(r"^- ", content, flags=re.M)
        pos = m.start() if m else len(content)
        target.write_text(content[:pos] + yaml_block + "\n" + content[pos:], encoding="utf-8")
        print(f"→ Added {len(entries)} entr{'y' if len(entries) == 1 else 'ies'} to {target}", file=sys.stderr)


if __name__ == "__main__":
    main()
