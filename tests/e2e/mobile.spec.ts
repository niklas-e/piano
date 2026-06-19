import { expect, test } from "@playwright/test";

test("catalog is usable at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/exercises");

  await expect(page.getByRole("heading", { name: "Exercises" })).toBeVisible();
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
