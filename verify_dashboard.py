from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Intercept API to return empty agents
        page.route("**/api/stats", lambda route: route.fulfill(
            status=200,
            json={
                "totalMemories": 0,
                "totalDecisions": 0,
                "totalTasks": 0,
                "memoryAgents": [],
                "decisionAgents": [],
                "currentBranch": "main"
            }
        ))

        page.goto("http://localhost:5173/stats")
        page.wait_for_selector("text=No agent memories tracked yet.")
        time.sleep(1) # wait for animations

        page.screenshot(path="dashboard_empty_state.png")
        browser.close()

run()
