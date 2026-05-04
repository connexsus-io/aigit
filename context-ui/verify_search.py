import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Intercept and fulfill API request for stats to mock initial load
        await page.route("**/api/stats", lambda route: route.fulfill(status=200, json={
            "totalMemories": 10,
            "totalDecisions": 5,
            "totalTasks": 2,
            "memoryAgents": [],
            "decisionAgents": [],
            "currentBranch": "main"
        }))

        # Start dev server in the background
        import subprocess
        import time
        server = subprocess.Popen(["pnpm", "run", "dev"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        time.sleep(3) # Give it time to start

        try:
            await page.goto("http://localhost:5173/search")

            # Wait for search input
            search_input = page.get_by_role("textbox", name="Search query")
            await search_input.wait_for()

            # 1. Verify autofocus: Evaluate active element
            is_focused = await page.evaluate("document.activeElement === document.querySelector('input[type=text]')")
            print(f"Is search input autofocused? {is_focused}")

            # 2. Verify visual hint
            hint = page.locator("kbd:has-text('/')")
            has_hint = await hint.count() > 0
            print(f"Has visual hint '/' ? {has_hint}")

            # Take a screenshot before typing
            await page.screenshot(path="search_initial.png")

            # Type something to make the clear button appear
            await search_input.fill("test query")

            # Verify clear button appears and hint disappears
            has_hint_after_type = await hint.count() > 0
            print(f"Has visual hint after type? {has_hint_after_type}")

            clear_button = page.get_by_role("button", name="Clear search")
            has_clear_button = await clear_button.count() > 0
            print(f"Has clear button? {has_clear_button}")

            await page.screenshot(path="search_filled.png")

            # 3. Verify clearing search re-focuses input
            await clear_button.click()
            is_focused_after_clear = await page.evaluate("document.activeElement === document.querySelector('input[type=text]')")
            print(f"Is focused after clear? {is_focused_after_clear}")

            # Check if input is empty
            input_val = await search_input.input_value()
            print(f"Input value after clear: '{input_val}'")

            # 4. Verify keyboard shortcut '/'
            # First, blur the input
            await page.evaluate("document.activeElement.blur()")
            is_blurred = await page.evaluate("document.activeElement !== document.querySelector('input[type=text]')")
            print(f"Is blurred? {is_blurred}")

            # Press '/'
            await page.keyboard.press("/")
            is_focused_after_shortcut = await page.evaluate("document.activeElement === document.querySelector('input[type=text]')")
            print(f"Is focused after shortcut '/'? {is_focused_after_shortcut}")

            await page.screenshot(path="search_shortcut.png")

            print("Verification complete.")
        finally:
            server.terminate()
            server.wait()
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
