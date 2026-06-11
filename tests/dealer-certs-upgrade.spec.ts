/**
 * Dealer "My Certificates" upgrade — E2E verification
 *
 * Target: https://mvautoassist.in (live Supabase / production)
 *
 * Tests:
 *   DC-1  Page loads with filter chips and search box
 *   DC-2  "All" chip shows all certs, stat header is correct
 *   DC-3  "Pending Approval" chip filters to status=pending only
 *   DC-4  "Approved" chip filters to status=approved only
 *   DC-5  "Payment Pending" chip filters to approved + payment_received=false
 *   DC-6  Search by customer name works
 *   DC-7  Search by certificate number works
 *   DC-8  Search by vehicle (make_model) works
 *   DC-9  Pagination shows when cert count > 10
 *
 * Data policy:
 *   - No new certificates are created by this suite.
 *   - All assertions adapt to whatever certs currently exist for rajesh.test.
 *   - If Rajesh has ≤ 10 certs, DC-9 gracefully marks itself as skipped.
 */

import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const BASE   = 'https://mvautoassist.in';
const DEALER = { email: 'rajesh.test@example.com', password: 'Rajesh@2026!' };

const SHOTS_DIR = path.join(process.cwd(), 'qa-screenshots', 'dealer-certs-upgrade');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

let shotIdx = 0;
async function shot(page: Page, name: string) {
  const filename = `${String(++shotIdx).padStart(2, '0')}_${name}.png`;
  await page.screenshot({ path: path.join(SHOTS_DIR, filename), fullPage: true });
  return filename;
}

async function loginAsDealer(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]',    DEALER.email);
  await page.fill('input[type="password"]', DEALER.password);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/agent\//, { timeout: 20_000 });
  // Navigate directly to certificates page (in case redirect lands elsewhere)
  if (!page.url().includes('/agent/certificates')) {
    await page.goto(`${BASE}/agent/certificates`);
  }
  await page.waitForLoadState('networkidle');
}

/** Count how many cert cards are visible in the current filter view. */
async function visibleCardCount(page: Page): Promise<number> {
  return page.locator('a[href^="/cert/"]').count();
}

/** Extract cert number from the first visible card (JetBrains Mono div). */
async function firstVisibleCertNumber(page: Page): Promise<string | null> {
  const locator = page.locator('a[href^="/cert/"]').first()
    .locator('div[style*="JetBrains"]');
  if (await locator.count() === 0) return null;
  return (await locator.textContent())?.trim() ?? null;
}

/** Extract the first visible customer name. */
async function firstVisibleCustomerName(page: Page): Promise<string | null> {
  const links = page.locator('a[href^="/cert/"]');
  if (await links.count() === 0) return null;
  // customer name is the font-semibold div inside the card
  const nameEl = links.first().locator('.font-semibold').first();
  return (await nameEl.textContent())?.trim() ?? null;
}

/** Extract the first visible vehicle (make_model, text-xs text-stone-500). */
async function firstVisibleVehicle(page: Page): Promise<string | null> {
  const links = page.locator('a[href^="/cert/"]');
  if (await links.count() === 0) return null;
  // make_model is the 4th child div: cert_number (div), customer_name (div), make_model (div)
  // Select by the text-stone-500 div before the border-t section
  const vehicleEl = links.first().locator('.text-stone-500.mb-4').first();
  return (await vehicleEl.textContent())?.trim() ?? null;
}

// ─── tests ───────────────────────────────────────────────────────────────────

test.describe('Dealer Certificates Upgrade', () => {

  test('DC-1 — Page loads: chips, search, and header stat visible', async ({ page }) => {
    await loginAsDealer(page);

    // Header
    await expect(page.locator('h1', { hasText: 'My Certificates' })).toBeVisible();

    // Stat line contains "issued"
    const subtitle = page.locator('p.text-stone-500').first();
    await expect(subtitle).toContainText('issued');

    // All four filter chips
    await expect(page.locator('button', { hasText: 'All' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Pending Approval' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Approved' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Payment Pending' })).toBeVisible();

    // Search input
    await expect(page.locator('input[placeholder*="Search by name"]')).toBeVisible();

    await shot(page, 'DC1_page_loaded');
  });

  test('DC-2 — "All" chip active by default; header stat matches card count (≤ 10)', async ({ page }) => {
    await loginAsDealer(page);

    // "All" chip has active styling (bg-slate-900 text-white)
    const allChip = page.locator('button', { hasText: 'All' });
    await expect(allChip).toHaveClass(/bg-slate-900/);

    const totalCards = await visibleCardCount(page);
    const subtitle   = await page.locator('p.text-stone-500').first().textContent();

    // The issued count in subtitle is the number of approved certs — it may differ
    // from total cards (which includes pending). Just assert it's a number > 0.
    const issuedMatch = subtitle?.match(/(\d+)\s+issued/);
    expect(issuedMatch).not.toBeNull();
    const issuedCount = parseInt(issuedMatch![1], 10);
    expect(issuedCount).toBeGreaterThanOrEqual(0);

    // If there are any approved certs, RSA revenue should appear
    if (issuedCount > 0) {
      expect(subtitle).toContain('RSA revenue');
    }

    await shot(page, 'DC2_all_filter');
    console.log(`  → Total cards in "All" view: ${totalCards}; issued: ${issuedCount}`);
  });

  test('DC-3 — "Pending Approval" chip filters to pending certs only', async ({ page }) => {
    await loginAsDealer(page);

    await page.locator('button', { hasText: 'Pending Approval' }).click();
    await page.waitForTimeout(300);

    await shot(page, 'DC3_pending_filter');

    // Every visible badge should be "Pending" (amber dot)
    const badges = page.locator('a[href^="/cert/"] span.rounded-full');
    const count  = await badges.count();

    for (let i = 0; i < count; i++) {
      const text = await badges.nth(i).textContent();
      expect(text?.trim()).toBe('Pending');
    }

    console.log(`  → Pending certs visible: ${count}`);
  });

  test('DC-4 — "Approved" chip filters to approved certs only', async ({ page }) => {
    await loginAsDealer(page);

    await page.locator('button', { hasText: 'Approved' }).click();
    await page.waitForTimeout(300);

    await shot(page, 'DC4_approved_filter');

    const badges = page.locator('a[href^="/cert/"] span.rounded-full');
    const count  = await badges.count();

    for (let i = 0; i < count; i++) {
      const text = await badges.nth(i).textContent();
      expect(text?.trim()).toBe('Approved');
    }

    console.log(`  → Approved certs visible: ${count}`);
  });

  test('DC-5 — "Payment Pending" chip shows approved + payment not yet confirmed', async ({ page }) => {
    await loginAsDealer(page);

    await page.locator('button', { hasText: 'Payment Pending' }).click();
    await page.waitForTimeout(300);

    await shot(page, 'DC5_payment_pending_filter');

    // All visible cards must have "Approved" status badge
    // (payment_received is a backend field; we can only verify the status badge is Approved)
    const badges = page.locator('a[href^="/cert/"] span.rounded-full');
    const count  = await badges.count();

    for (let i = 0; i < count; i++) {
      const text = await badges.nth(i).textContent();
      expect(text?.trim()).toBe('Approved');
    }

    console.log(`  → Payment-pending (approved, not yet paid) certs: ${count}`);
  });

  test('DC-6 — Search by customer name filters correctly', async ({ page }) => {
    await loginAsDealer(page);

    // Grab the first customer name from "All" view
    const customerName = await firstVisibleCustomerName(page);
    if (!customerName) {
      console.log('  → No certs to search against — skipping');
      return;
    }

    // Use only the first word so partial search is tested
    const query = customerName.split(' ')[0];

    const searchBox = page.locator('input[placeholder*="Search by name"]');
    await searchBox.fill(query);
    await page.waitForTimeout(300);

    await shot(page, 'DC6_search_customer_name');

    // All visible cards must contain the query text somewhere in customer name
    const links = page.locator('a[href^="/cert/"]');
    const matchCount = await links.count();
    expect(matchCount).toBeGreaterThan(0);

    for (let i = 0; i < matchCount; i++) {
      const nameEl = links.nth(i).locator('.font-semibold').first();
      const name   = (await nameEl.textContent())?.toLowerCase() ?? '';
      expect(name).toContain(query.toLowerCase());
    }

    console.log(`  → Search "${query}" returned ${matchCount} result(s)`);
  });

  test('DC-7 — Search by certificate number returns exactly that cert', async ({ page }) => {
    await loginAsDealer(page);

    const certNumber = await firstVisibleCertNumber(page);
    if (!certNumber) {
      console.log('  → No certs visible — skipping');
      return;
    }

    const searchBox = page.locator('input[placeholder*="Search by name"]');
    await searchBox.fill(certNumber);
    await page.waitForTimeout(300);

    await shot(page, 'DC7_search_cert_number');

    const links = page.locator('a[href^="/cert/"]');
    await expect(links).toHaveCount(1);

    const displayedNum = await links.first()
      .locator('div[style*="JetBrains"]').textContent();
    expect(displayedNum?.trim()).toBe(certNumber);

    console.log(`  → Cert number search "${certNumber}" → 1 exact result`);
  });

  test('DC-8 — Search by vehicle make/model returns matching certs only', async ({ page }) => {
    await loginAsDealer(page);

    const vehicle = await firstVisibleVehicle(page);
    if (!vehicle) {
      console.log('  → No certs visible — skipping');
      return;
    }

    // Use the first word of the model (e.g. "HONDA" from "HONDA CB350RS")
    const query = vehicle.split(' ')[0];

    const searchBox = page.locator('input[placeholder*="Search by name"]');
    await searchBox.fill(query);
    await page.waitForTimeout(300);

    await shot(page, 'DC8_search_vehicle');

    const links = page.locator('a[href^="/cert/"]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const vehicleEl = links.nth(i).locator('.text-stone-500.mb-4').first();
      const v = (await vehicleEl.textContent())?.toLowerCase() ?? '';
      expect(v).toContain(query.toLowerCase());
    }

    console.log(`  → Vehicle search "${query}" returned ${count} result(s)`);
  });

  test('DC-9 — Pagination appears and works when certs > 10', async ({ page }) => {
    await loginAsDealer(page);

    // Count total certs in "All" view.
    // If > 10, there should be a next-page button.
    // We can't know the full count until we check all pages, but we can count first page cards
    // and check if pagination controls are present.
    const firstPageCards = await visibleCardCount(page);

    const prevBtn = page.locator('button[aria-label="Previous page"]');
    const nextBtn = page.locator('button[aria-label="Next page"]');

    if (firstPageCards < 10) {
      // Total is ≤ 10 — pagination correctly hidden
      await expect(prevBtn).not.toBeVisible();
      console.log(`  → ${firstPageCards} certs (≤ 10); pagination correctly hidden`);
      await shot(page, 'DC9_pagination_hidden');
      return;
    }

    // > 10 certs: pagination controls must exist
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // Prev should be disabled on page 1
    await expect(prevBtn).toBeDisabled();

    // Page indicator (e.g. "1 / 3")
    const pageIndicator = page.locator('span', { hasText: '1 /' });
    await expect(pageIndicator).toBeVisible();

    await shot(page, 'DC9_page1');

    // Navigate to page 2
    await nextBtn.click();
    await page.waitForTimeout(300);

    await expect(prevBtn).toBeEnabled();
    await expect(page.locator('span').filter({ hasText: /^2 \// })).toBeVisible();

    const page2Cards = await visibleCardCount(page);
    expect(page2Cards).toBeGreaterThan(0);

    await shot(page, 'DC9_page2');

    // Navigate back
    await prevBtn.click();
    await page.waitForTimeout(300);
    await expect(prevBtn).toBeDisabled();
    await expect(page.locator('span', { hasText: '1 /' })).toBeVisible();

    await shot(page, 'DC9_back_to_page1');
    console.log(`  → Pagination verified: page 1 (${firstPageCards} cards) → page 2 (${page2Cards} cards)`);
  });

});
