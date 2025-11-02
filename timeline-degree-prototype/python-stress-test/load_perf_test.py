import asyncio
import time
from statistics import mean
from playwright.async_api import async_playwright

# -----------------------------
# 🔧 Configuration (hardcoded)
# -----------------------------
BASE_URL = "http://localhost:3000"  # React app URL
USERS = 100                          # total simulated users
MAX_CONCURRENT = 10                  # browsers running at once
PAGE_TIMEOUT = 180_000              # page load timeout (ms)
SELECTOR_TIMEOUT = 180_000          # element wait timeout (ms)
HEADLESS = False                    # show browsers (set True for speed)
SLOW_MO = 200                       # delay between actions (ms)

# -----------------------------
# 🧠 Simulation logic
# -----------------------------
async def simulate_user(playwright, user_id):
    
    browser = await playwright.chromium.launch(headless=HEADLESS, slow_mo=SLOW_MO)
    context = await browser.new_context()
    page = await context.new_page()
    start = time.perf_counter()

    try:
        # Go to the React app
        await page.goto(BASE_URL, timeout=PAGE_TIMEOUT)

        # Wait until the Submit button is rendered and clickable
        await page.wait_for_selector("button:has-text('Submit')", timeout=30_000)
        await page.click("button:has-text('Submit')")

        # Wait for the next page (Course Timeline Planner)
        await page.wait_for_selector("text=/Course Timeline Planner/i", timeout=SELECTOR_TIMEOUT)

        duration = time.perf_counter() - start
        print(f"✅ User {user_id} completed in {duration:.2f}s")

    except Exception as e:
        print(f"❌ User {user_id} failed: {e}")
        # Capture screenshot for debugging
        await page.screenshot(path=f"screenshot_user_{user_id}.png")
        duration = None

    finally:
        await context.close()
        await browser.close()

    return duration

# -----------------------------
# 🚀 Main load test runner
# -----------------------------
async def run_batch(playwright, batch_start, batch_end):
    tasks = [simulate_user(playwright, i) for i in range(batch_start, batch_end)]
    return await asyncio.gather(*tasks)

async def main():
    all_durations = []
    async with async_playwright() as playwright:
        start_all = time.perf_counter()
        for batch_start in range(1, USERS + 1, MAX_CONCURRENT):
            batch_end = min(batch_start + MAX_CONCURRENT, USERS + 1)
            print(f"\n🚀 Running users {batch_start}–{batch_end - 1} ...")
            results = await run_batch(playwright, batch_start, batch_end)
            durations = [r for r in results if r is not None]
            all_durations.extend(durations)

        total_time = time.perf_counter() - start_all

    if all_durations:
        print("\n--- Simulation Summary ---")
        print(f"Users: {len(all_durations)}")
        print(f"Average Duration: {mean(all_durations):.2f}s")
        print(f"Min: {min(all_durations):.2f}s | Max: {max(all_durations):.2f}s")
        print(f"Total runtime: {total_time:.2f}s")
    else:
        print("❌ No successful runs.")

if __name__ == "__main__":
    asyncio.run(main())
