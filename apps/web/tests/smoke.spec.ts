import { expect, test } from "@playwright/test";

test("loads SkyCeil projection surface and controls", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator("canvas.projection-canvas");
  await expect(canvas).toBeVisible();
  await expect(page.getByLabel("Radar Mode")).toBeVisible();
  await page.getByLabel("Radar Mode").click();
  await expect(page.getByLabel("Radar Mode")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByLabel("Calibration").click();
  await expect(page.getByText("CALIBRATION")).toBeVisible();

  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(300);
  expect(box?.height).toBeGreaterThan(300);
});
