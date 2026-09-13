"""Screenshot every screen and assert the things a screenshot alone would not catch:
no raw ISO dates rendered to a human, no stuck "Loading", no console errors.

    python3 test/visual.py            # writes to ../../shots/
"""
import os
import re
import sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://127.0.0.1:4000")
OUT = os.environ.get("OUT", os.path.join(os.path.dirname(__file__), "..", "..", "shots"))
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@demo.local")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "demo-password-123")

# 2026-09-13, 2026-09-13T15:52:27.180Z - anything a database hands over untouched.
ISO_DATE = re.compile(r"\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2})?")

os.makedirs(OUT, exist_ok=True)
failures = []
checks = 0


def check(name, ok, detail=""):
    global checks
    checks += 1
    if ok:
        print(f"  ok  {name}")
    else:
        failures.append(f"{name} - {detail}")
        print(f"FAIL  {name} - {detail}")


def audit(page, label):
    body = page.inner_text("body")
    iso = ISO_DATE.findall(body)
    check(f"{label}: no raw ISO date shown to a visitor", not iso, f"found {iso[:3]}")
    check(f"{label}: nothing stuck on Loading", "Loading" not in body, "screen still says Loading")
    check(f"{label}: no error notice", "Something went wrong" not in body, body[:120])


def shoot(page, name, label, wait_for=None):
    page.goto(f"{BASE}{name}", wait_until="networkidle")
    if wait_for:
        page.wait_for_selector(wait_for, timeout=10000)
    page.screenshot(path=os.path.join(OUT, f"{label}.png"))
    audit(page, label)


with sync_playwright() as p:
    browser = p.chromium.launch()

    for scheme in ("dark", "light"):
        ctx = browser.new_context(viewport={"width": 1280, "height": 800}, color_scheme=scheme)
        page = ctx.new_page()
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        shoot(page, "/", f"01-home-{scheme}", "h1")
        shoot(page, "/blog", f"02-blog-{scheme}", ".post-item")
        page.click(".post-item")
        page.wait_for_selector(".post-body")
        page.screenshot(path=os.path.join(OUT, f"03-post-{scheme}.png"))
        audit(page, f"03-post-{scheme}")
        # The comment form sits below the fold on a long post.
        page.locator("form").last.scroll_into_view_if_needed()
        page.screenshot(path=os.path.join(OUT, f"04-comments-{scheme}.png"))
        shoot(page, "/contact", f"05-contact-{scheme}", "form")

        check(f"{scheme}: no console errors", not errors, str(errors[:2]))
        ctx.close()

    # Mobile width - the tab bar and grids have to survive 390px.
    ctx = browser.new_context(viewport={"width": 390, "height": 800}, color_scheme="dark")
    page = ctx.new_page()
    shoot(page, "/", "06-home-mobile", "h1")
    check(
        "mobile: the page does not scroll sideways",
        page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"),
        page.evaluate("`${document.documentElement.scrollWidth} > ${window.innerWidth}`"),
    )
    shoot(page, "/blog", "07-blog-mobile", ".post-item")
    ctx.close()

    # Admin, signed in.
    ctx = browser.new_context(viewport={"width": 1280, "height": 800}, color_scheme="dark")
    page = ctx.new_page()
    page.goto(f"{BASE}/admin", wait_until="networkidle")
    page.screenshot(path=os.path.join(OUT, "08-admin-login.png"))
    check("admin: the login form is the first thing shown", page.locator("#a-pass").is_visible())

    page.fill("#a-email", ADMIN_EMAIL)
    page.fill("#a-pass", ADMIN_PASSWORD)
    page.click("button[type=submit]")
    page.wait_for_selector(".admin-shell", timeout=10000)
    page.screenshot(path=os.path.join(OUT, "09-admin-posts.png"))
    audit(page, "09-admin-posts")
    check("admin: the posts table has rows", page.locator("table tbody tr").count() > 0)

    page.click("text=Comments")
    page.wait_for_selector(".tags")
    page.screenshot(path=os.path.join(OUT, "10-admin-comments.png"))
    audit(page, "10-admin-comments")

    page.click("text=Messages")
    page.wait_for_timeout(500)
    page.screenshot(path=os.path.join(OUT, "11-admin-messages.png"))
    audit(page, "11-admin-messages")

    page.click("text=Posts")
    page.wait_for_selector("table")
    page.click("text=New post")
    page.wait_for_selector("#p-title")
    page.screenshot(path=os.path.join(OUT, "12-admin-editor.png"))
    audit(page, "12-admin-editor")

    ctx.close()
    browser.close()

print(f"\n{checks - len(failures)} passed, {len(failures)} failed")
if failures:
    print("\n".join(f" - {f}" for f in failures))
    sys.exit(1)
