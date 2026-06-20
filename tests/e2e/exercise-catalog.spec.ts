import { expect, test } from "@playwright/test";

test("catalog renders exercises as a plain list", async ({ page }) => {
  await page.goto("/exercises");

  await expect(page.locator(".site-title")).toHaveText("Exercises");
  await expect(page.getByRole("link", { name: "C major scale" })).toHaveAttribute("href", "/exercises/c-major-scale");
  await expect(page.getByRole("link", { name: "A minor arpeggio" })).toHaveAttribute("href", "/exercises/a-minor-arpeggio");
  await expect(page.getByText("ABRSM", { exact: false })).toHaveCount(0);
  await expect(page.locator(".exercise-card", { has: page.getByRole("link", { name: "C major scale" }) }).locator(".card-meta")).not.toContainText(/one octave/i);
});

test("catalog search filters by title and tonic", async ({ page }) => {
  await page.goto("/exercises");

  await expect(page.locator("label", { has: page.getByLabel("Search exercises") }).locator(".ph-icon")).toHaveCount(1);

  await page.getByLabel("Search exercises").fill("arpeggio");
  await expect(page.getByRole("link", { name: "A minor arpeggio" })).toBeVisible();
  await expect(page.getByRole("link", { name: "C major scale" })).toHaveCount(0);

  await page.getByLabel("Search exercises").fill("D");
  await expect(page.getByRole("link", { name: "D major scale" })).toBeVisible();
});

test("catalog ranks title matches before content matches and highlights search text", async ({ page }) => {
  await page.goto("/exercises");

  await page.getByLabel("Search exercises").fill("minor");
  const resultLinks = page.locator(".exercise-card h2 a");
  await expect(resultLinks.first()).toHaveText(/minor/);
  await expect
    .poll(() => page.evaluate(() => CSS.highlights.get("search-match")?.size ?? 0))
    .toBeGreaterThan(0);

  await page.getByLabel("Search exercises").fill("F#");
  await expect
    .poll(() => page.evaluate(() => CSS.highlights.get("search-match")?.size ?? 0))
    .toBeGreaterThan(0);
});

test("catalog type filter persists", async ({ page }) => {
  await page.goto("/exercises");

  await page.getByLabel("Exercise type").selectOption("arpeggio");
  await expect(page.getByRole("link", { name: "A minor arpeggio" })).toBeVisible();
  await expect(page.getByRole("link", { name: "C major scale" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByLabel("Exercise type")).toHaveValue("arpeggio");
  await expect(page.getByRole("link", { name: "A minor arpeggio" })).toBeVisible();
});

test("catalog shows continue link for the last opened exercise", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("piano:last-exercise-id", "g-major-scale"));
  await page.goto("/exercises");

  const continueLink = page.getByRole("link", { name: "Continue with G major scale" });

  await expect(continueLink).toHaveAttribute("href", "/exercises/g-major-scale");
  await expect(continueLink.locator(".ph-icon")).toHaveCount(1);
});
