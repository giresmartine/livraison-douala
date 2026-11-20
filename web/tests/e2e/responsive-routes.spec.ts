import { expect, test } from "@playwright/test";
import { screens } from "../../lib/screens";

test("all registered routes fit the viewport at mobile and tablet widths", async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);

  const widths = [360, 390, 768];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });

    for (const screen of screens) {
      const path = screen.href === "/" ? "" : screen.href;
      await page.goto(`/fr${path}`, { waitUntil: "load" });

      const dimensions = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(
        dimensions.scrollWidth,
        `${screen.id} (${screen.href}) at ${width}px`,
      ).toBeLessThanOrEqual(dimensions.innerWidth);
    }
  }
});
