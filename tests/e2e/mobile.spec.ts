import { expect, test } from "@playwright/test";

test("catalog is usable at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/exercises");

  const menuButton = page.getByRole("button", { name: /navigation menu/i });
  await expect(menuButton).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Metronome" })).toBeHidden();

  await menuButton.click();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Metronome" })).toBeVisible();

  await expect(page.locator(".site-title")).toHaveText("Exercises");
  await expect(page.getByLabel("Search exercises")).toBeVisible();
  await expect(page.getByLabel("Exercise type")).toBeVisible();
  await expect(page.getByRole("link", { name: "C major scale" })).toBeVisible();
});

test("exercise detail keyboard scrolls horizontally at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/exercises/c-major-scale");

  const keyboardScroll = page.getByRole("group", { name: "Practice keyboard" });
  await expect(keyboardScroll).toBeVisible();
  await expect(page.getByTestId("key-C4")).toBeVisible();

  const hasHorizontalScroll = await keyboardScroll.evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(hasHorizontalScroll).toBe(true);
});
