#!/usr/bin/env python3
"""
TaylorMade Full Club Scraper — HIGH-RES Edition
─────────────────────────────────────────────────
Visits each club category, then clicks into EVERY product page to grab
the full-resolution WooCommerce gallery hero image instead of the small grid thumbnail.

Categories: Drivers · Fairways · Hybrids · Irons · Putters · Wedges

Output:
  public/<category>/     ← full-res images
  scraped_clubs.json     ← structured data
  lib/products.ts        ← auto-updated

Requirements:
  pip install playwright httpx
  playwright install chromium
"""

import asyncio, re, json, sys, httpx
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("pip install playwright && playwright install chromium"); sys.exit(1)

# ── Config ─────────────────────────────────────────────────────────────────────
BASE     = "https://www.taylormadegolf.co.za"
ROOT     = Path(__file__).parent
PUBLIC   = ROOT / "public"
JSON_OUT = ROOT / "scraped_clubs.json"
PRODUCTS = ROOT / "lib" / "products.ts"

ZAR_TO_USD = 0.054   # update as needed

CATEGORIES = [
    {"label": "Drivers",  "url": f"{BASE}/drivers/",  "ts_cat": "Drivers"},
    {"label": "Fairways", "url": f"{BASE}/fairways/", "ts_cat": "Fairways"},
    {"label": "Hybrids",  "url": f"{BASE}/hybrids/",  "ts_cat": "Hybrids"},
    {"label": "Irons",    "url": f"{BASE}/irons/",    "ts_cat": "Irons"},
    {"label": "Putters",  "url": f"{BASE}/putters/",  "ts_cat": "Putters"},
    {"label": "Wedges",   "url": f"{BASE}/wedges/",   "ts_cat": "Wedges"},
]

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")

# ── Helpers ────────────────────────────────────────────────────────────────────
def slugify(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*\n\r\t]', '', name.strip())
    name = re.sub(r'\s+', '_', name)
    return re.sub(r'_+', '_', name)[:120]

def ext_from_url(url: str) -> str:
    base = url.lower().split('?')[0]
    for e in ('webp', 'png', 'gif'): 
        if base.endswith(f'.{e}'): return e
    return 'jpg'

def parse_price_zar(raw: str) -> float:
    nums = re.sub(r'[^\d.]', '', raw.replace(',', ''))
    try:    return float(nums)
    except: return 0.0

def zar_to_usd(zar: float) -> int:
    return max(1, round(zar * ZAR_TO_USD))

# ── JS: List page — get product links + title + price ─────────────────────────
LIST_JS = """
() => {
    const results = [];
    const seen    = new Set();
    const tileSelectors = [
        'ul.products li.product',
        '.products .product',
        '.woocommerce-loop-product',
        '.product-tile', '.grid-tile', '.product-item',
    ];
    let tiles = [];
    for (const sel of tileSelectors) {
        const found = [...document.querySelectorAll(sel)];
        if (found.length >= 1) { tiles = found; break; }
    }
    for (const tile of tiles) {
        const titleEl = tile.querySelector(
            '.woocommerce-loop-product__title, h2, h3, h4,' +
            '[class*="product-name"],[class*="product-title"],.name,.title'
        );
        const priceEl = tile.querySelector(
            '.price .amount, .woocommerce-Price-amount, .price'
        );
        const linkEl = tile.querySelector('a[href]');
        if (!titleEl) continue;
        const title = titleEl.textContent.trim();
        const href  = linkEl ? linkEl.href : '';
        if (!title || seen.has(title) || !href) continue;
        seen.add(title);
        results.push({
            title,
            rawPrice: priceEl ? priceEl.textContent.trim() : '',
            href,
        });
    }
    return results;
}
"""

# ── JS: Product page — get the highest-resolution image ──────────────────────
PRODUCT_IMG_JS = """
() => {
    // Priority order: WooCommerce gallery large image → og:image → biggest <img>
    const trySelectors = [
        // WooCommerce: data-large_image on thumbnail
        () => {
            const thumb = document.querySelector(
                '.woocommerce-product-gallery__image img[data-large_image],' +
                '.woocommerce-product-gallery img[data-large_image]'
            );
            return thumb ? thumb.getAttribute('data-large_image') : null;
        },
        // WooCommerce: full-size link href
        () => {
            const a = document.querySelector(
                '.woocommerce-product-gallery__image > a,' +
                '.woocommerce-product-gallery a[href]'
            );
            return a ? a.href : null;
        },
        // og:image meta tag
        () => {
            const og = document.querySelector('meta[property="og:image"]');
            return og ? og.content : null;
        },
        // Main product image
        () => {
            const img = document.querySelector(
                '.wp-post-image,' +
                '.woocommerce-product-gallery img,' +
                '.product-images img,' +
                '.product__media img'
            );
            return img ? (img.src || img.getAttribute('data-src')) : null;
        },
        // Biggest image on page by naturalWidth
        () => {
            let best = null, bestW = 0;
            document.querySelectorAll('img').forEach(img => {
                const w = img.naturalWidth || parseInt(img.width) || 0;
                const src = img.src || img.getAttribute('data-src') || '';
                if (w > bestW && src && !src.includes('logo') && !src.includes('icon')) {
                    bestW = w; best = src;
                }
            });
            return best;
        },
    ];
    for (const fn of trySelectors) {
        try {
            const result = fn();
            if (result && !result.startsWith('data:')) return result;
        } catch {}
    }
    return null;
}
"""

# ── Scrape category list page ──────────────────────────────────────────────────
async def scrape_list(page, cat: dict) -> list[dict]:
    print(f"\n📂  {cat['label']}  →  {cat['url']}")
    await page.goto(cat["url"], wait_until="networkidle", timeout=60_000)
    await page.wait_for_timeout(2000)
    for _ in range(4):
        await page.evaluate("window.scrollBy(0, window.innerHeight * 0.8)")
        await page.wait_for_timeout(400)
    items = await page.evaluate(LIST_JS)
    print(f"    Found {len(items)} product(s)")
    return items

# ── Visit product page and grab full-res image ────────────────────────────────
async def get_product_image(page, href: str) -> str | None:
    try:
        await page.goto(href, wait_until="domcontentloaded", timeout=40_000)
        await page.wait_for_timeout(1500)
        src = await page.evaluate(PRODUCT_IMG_JS)
        return src
    except Exception as e:
        print(f"    ⚠️  Could not load {href}: {e}")
        return None

# ── Download image ─────────────────────────────────────────────────────────────
async def download(client: httpx.AsyncClient, src: str, dest: Path) -> bool:
    if dest.exists(): return True
    try:
        r = await client.get(src)
        r.raise_for_status()
        dest.write_bytes(r.content)
        return True
    except Exception as e:
        print(f"      ❌  {e}")
        return False

# ── products.ts helpers ────────────────────────────────────────────────────────
NON_CLUB_CATS = {"Golf Balls", "Bags", "Accessories", "Club Sets"}
ALL_TS_CATS = sorted([
    "Drivers", "Fairways", "Hybrids", "Irons", "Putters", "Wedges",
    "Golf Balls", "Bags", "Accessories", "Club Sets",
])

def make_ts_entry(prod: dict) -> str:
    name     = prod["title"].replace("'", "\\'").replace('"', '\\"')
    slug     = re.sub(r'[^a-z0-9]+', '-', prod["title"].lower()).strip('-')
    price    = prod["price_usd"]
    img_path = prod["img_path"]
    ts_cat   = prod["ts_cat"]
    desc     = f"{prod['title']} — premium TaylorMade {ts_cat.lower()} engineered for performance."
    title_lc = prod["title"].lower()
    is_new_flag = any(kw in title_lc for kw in ["qi4d", "qi35", "2024", "2025", "2026", "spider zt", "hi-toe 4", "mg5"])
    badge   = "\n    badge: 'New'," if is_new_flag else ""
    is_new_field = "\n    isNew: true," if is_new_flag else ""
    return f"""  {{
    id: '{slug}',
    name: '{name}',
    category: '{ts_cat}',
    price: {price},{badge}
    image: '{img_path}',
    description: '{desc}',
    specs: ['Premium TaylorMade technology', 'Tour-proven performance'],
  }},"""

def extract_non_club_block(ts_text: str) -> str:
    """Pull out non-club products (Golf Balls, Bags, Accessories, Club Sets) from existing products.ts."""
    blocks = re.findall(r'\{[^{}]*category:\s*\'(' + '|'.join(NON_CLUB_CATS) + r')\'[^{}]*\}', ts_text, re.DOTALL)
    return '\n'.join(f'  {b},' for b in blocks)

# ── Main ───────────────────────────────────────────────────────────────────────
async def main():
    enriched: list[dict] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent=UA, locale="en-ZA",
            viewport={"width": 1440, "height": 900},
        )
        page = await ctx.new_page()

        for cat in CATEGORIES:
            items = await scrape_list(page, cat)
            folder = PUBLIC / cat["label"].lower()
            folder.mkdir(parents=True, exist_ok=True)

            for item in items:
                title = item["title"]
                safe  = slugify(title)
                print(f"\n  🔍  {title}")

                # Go to product page to get full-res image
                full_img_src = await get_product_image(page, item["href"])
                if not full_img_src:
                    print(f"      ⚠️  No full-res image found, skipping")
                    continue

                ext  = ext_from_url(full_img_src)
                dest = folder / f"{safe}.{ext}"

                # Download full-res image
                async with httpx.AsyncClient(follow_redirects=True, timeout=40,
                                              headers={"User-Agent": UA}) as client:
                    ok = await download(client, full_img_src, dest)

                size_kb = dest.stat().st_size / 1024 if dest.exists() else 0
                status  = f"✅  {size_kb:.0f} KB" if ok else "❌  failed"
                print(f"      {status}  →  {cat['label'].lower()}/{safe}.{ext}")

                zar = parse_price_zar(item["rawPrice"])
                usd = zar_to_usd(zar) if zar > 0 else {
                    "Drivers": 699, "Fairways": 349, "Hybrids": 299,
                    "Irons": 999, "Putters": 349, "Wedges": 179,
                }.get(cat["label"], 299)

                enriched.append({
                    "title":     title,
                    "category":  cat["label"],
                    "ts_cat":    cat["ts_cat"],
                    "price_zar": zar,
                    "price_usd": usd,
                    "img_path":  f"/{cat['label'].lower()}/{safe}.{ext}",
                    "src":       full_img_src,
                })

        await browser.close()

    # ── Save JSON ────────────────────────────────────────────────────────────
    JSON_OUT.write_text(json.dumps(enriched, indent=2))
    print(f"\n\n💾  Saved → {JSON_OUT}  ({len(enriched)} products)")

    # ── Rebuild products.ts ──────────────────────────────────────────────────
    print("🔧  Updating lib/products.ts ...")
    existing_ts = PRODUCTS.read_text() if PRODUCTS.exists() else ""
    non_club    = extract_non_club_block(existing_ts)

    # Group by category label order
    cat_order = [c["label"] for c in CATEGORIES]
    club_lines = []
    for label in cat_order:
        prods = [e for e in enriched if e["category"] == label]
        if not prods: continue
        sep = '─' * 60
        club_lines.append(f"  // ── {label.upper()} {sep[:max(0, 60-len(label))]}")
        for prod in prods:
            club_lines.append(make_ts_entry(prod))

    cat_union = " | ".join(f"'{c}'" for c in ALL_TS_CATS)
    new_ts = f"""// AUTO-GENERATED by script.py — scraped from taylormadegolf.co.za
// Full-resolution images from individual product pages

export interface Product {{
  id: string;
  name: string;
  category: {cat_union};
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  description?: string;
  specs?: string[];
  isNew?: boolean;
}}

export function formatPrice(price: number): string {{
  return new Intl.NumberFormat('en-US', {{
    style: 'currency', currency: 'USD', minimumFractionDigits: 0,
  }}).format(price);
}}

export const products: Product[] = [
{"chr(10)".join(club_lines)}

{non_club}
];

export const categories = [
  {{ id: 'all',         label: 'All Products' }},
  {{ id: 'Club Sets',   label: 'Club Sets'    }},
  {{ id: 'Drivers',     label: 'Drivers'      }},
  {{ id: 'Fairways',    label: 'Fairways'     }},
  {{ id: 'Hybrids',     label: 'Hybrids'      }},
  {{ id: 'Irons',       label: 'Irons'        }},
  {{ id: 'Putters',     label: 'Putters'      }},
  {{ id: 'Wedges',      label: 'Wedges'       }},
  {{ id: 'Golf Balls',  label: 'Golf Balls'   }},
  {{ id: 'Bags',        label: 'Bags'         }},
  {{ id: 'Accessories', label: 'Accessories'  }},
];
"""

    PRODUCTS.write_text(new_ts)
    print(f"✅  products.ts updated — {len(enriched)} products with full-res images!")
    print(f"🏁  Done! Visit http://localhost:3000/shop\n")


if __name__ == "__main__":
    asyncio.run(main())