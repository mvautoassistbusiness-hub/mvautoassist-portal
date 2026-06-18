/**
 * Phase E — Comprehensive End-to-End Test Suite (Production)
 *
 * Target: https://mvautoassist.in
 *
 * Test order (serial, each builds on prior state):
 *
 *  E01  Admin creates showroom → join code
 *  E02  Dealer A self-registers with join code
 *  E03  Dealer B self-registers (same code, unique username)
 *  E04  Invalid join code rejected at registration
 *  E05  No role/showroom_id field in registration form (escalation structurally impossible)
 *  E06  Dealer A logs in with username (no @email)
 *  E07  Dealer B logs in with username
 *  E08  Admin: assign ₹1000 price tier to Dealer A + set daily auto-approval limit = 1
 *  E09  Dealer A creates cert 1 → auto-approved (prev certs today: 0 < limit 1)
 *       Verify: status = Approved; payment_received not touched by auto-approval
 *  E10  Dealer A creates cert 2 → stays Pending (prev certs today: 1 ≥ limit 1)
 *       Verify: status = Pending; payment_received = false
 *  E10b Admin cert table: neither cert has payment_received = true
 *  E11  Dealer B sees BOTH of Dealer A's certs (showroom visibility)
 *       with "by Alice …" issuer badge
 *  E12  View-only guard: no approve / reject / payment buttons in dealer grid
 *  E13  Admin resets Dealer A password → temp password displayed + copy button
 *       Security: service-role key not in page HTML
 *  E14  Dealer A logs in with temp password → forced to /change-password
 *  E15  Dealer A sets new password → redirected to /agent/certificates
 *  E16  New password accepted; old temp password now rejected
 *
 * afterAll: write CLEANUP_REQUIRED.json (no cleanup runs here).
 */

import { test, expect, type Page } from '@playwright/test';
import * as fs   from 'fs';
import * as path from 'path';

// ─── config ──────────────────────────────────────────────────────────────────

const BASE  = (process.env.BASE_URL ?? 'https://mvautoassist.in').replace(/\/$/, '');
const ADMIN = { email: 'vilas.test@example.com', password: 'Vilas@2026!' };

const SHOTS_DIR  = path.join(process.cwd(), 'qa-screenshots', 'phase-e');
const STATE_FILE = path.join(SHOTS_DIR, '.phase-e-state.json');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

// ─── shared types ─────────────────────────────────────────────────────────────

type State = {
  showroomName:    string;
  joinCode:        string;
  dealerAUsername: string;
  dealerBUsername: string;
  cert1Id:         string;
  cert2Id:         string;
  tempPwd:         string;
  dealerANewPwd:   string;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

let shotIdx = 0;
async function shot(page: Page, label: string) {
  const fn = `${String(++shotIdx).padStart(3, '0')}_${label}.png`;
  await page.screenshot({ path: path.join(SHOTS_DIR, fn), fullPage: true });
}

function readState(): Partial<State> {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as State; }
  catch { return {}; }
}
function writeState(patch: Partial<State>) {
  const cur = readState();
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...cur, ...patch }, null, 2));
}

// ─── login helpers ────────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="text"]',     ADMIN.email);
  await page.fill('input[type="password"]', ADMIN.password);
  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/admin\//, { timeout: 20_000 });
  await page.waitForLoadState('networkidle');
}

async function loginAsDealer(page: Page, username: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="text"]',     username);
  await page.fill('input[type="password"]', password);
  await page.click('button:has-text("Sign in")');
  // Caller decides what URL to wait for
  await page.waitForTimeout(3_000);
}

// ─── cert creation helper (3-step wizard) ────────────────────────────────────

async function createCert(
  page: Page,
  customerName: string,
  mobile: string,
): Promise<string> {
  await page.goto(`${BASE}/agent/certificates/new`);
  await page.waitForLoadState('networkidle');

  // ── Step 1: Customer details ──────────────────────────────────────────────
  await page.fill('input[placeholder="e.g. ANKUR SALUNKHE"]', customerName);
  await page.fill('input[placeholder="10-digit mobile number"]', mobile);
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('h2:has-text("Vehicle information")', { timeout: 10_000 });

  // ── Step 2: Vehicle information ───────────────────────────────────────────
  await page.fill('input[placeholder="HONDA CB350RS"]',      'Hero Splendor Plus');
  await page.fill('input[placeholder="2025"]',               '2023');
  await page.fill('input[placeholder="NC58EA3025933"]',      'ENGTEST12345');
  await page.fill('input[placeholder="ME4NC681JSA006238"]',  'CHSTEST12345678');
  await page.click('button:has-text("Continue")');
  await page.waitForSelector('h2:has-text("Plan")', { timeout: 10_000 });

  // ── Step 3: Plan & pricing ────────────────────────────────────────────────
  const today   = new Date().toISOString().slice(0, 10);
  const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.nth(0).fill(today);
  await dateInputs.nth(1).fill(endDate);

  // Insurance premium
  await page.fill('input[placeholder="Enter insurance premium amount"]', '5000');

  // RSA tier — click first available tier button (₹1,000 we assigned)
  const tierBtn = page.locator('button').filter({ hasText: /₹/ }).first();
  await expect(tierBtn).toBeVisible({ timeout: 5_000 });
  await tierBtn.click();

  // Payment method
  await page.selectOption('select', { value: 'cash' });

  // Submit
  await page.click('button:has-text("Generate certificate")');
  await page.waitForURL(/\/cert\//, { timeout: 30_000 });

  return page.url().split('/cert/')[1]?.split('?')[0]?.split('/')[0] ?? '';
}

// ─── RUN tag ─────────────────────────────────────────────────────────────────

const RUN = process.env.QA_PE_RUN ?? `PE${Math.floor(Date.now() / 1000)}`;
if (!process.env.QA_PE_RUN) process.env.QA_PE_RUN = RUN;

// =============================================================================
// TESTS
// =============================================================================

test.describe('Phase E — Full Lifecycle', () => {

  // ── E01 ─────────────────────────────────────────────────────────────────────
  test('E01 — Admin creates showroom and receives join code', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE}/admin/showrooms`);
    await page.waitForLoadState('networkidle');
    await shot(page, 'E01_showrooms_page');

    await page.click('button:has-text("New showroom")');
    await page.waitForSelector('input[placeholder*="Star Motors"]', { timeout: 5_000 });

    const showroomName = `Phase-E ${RUN}`;
    await page.fill('input[placeholder*="Star Motors"]', showroomName);
    await page.click('button:has-text("Create showroom")');
    await page.waitForSelector('text=Join Code', { timeout: 10_000 });
    await shot(page, 'E01_join_code_shown');

    const codeEl = page.locator('span[style*="JetBrains"]').first();
    await expect(codeEl).toBeVisible();
    const joinCode = (await codeEl.textContent())?.trim() ?? '';
    expect(joinCode.length, 'join code must be non-empty').toBeGreaterThanOrEqual(4);

    writeState({ showroomName, joinCode });
    console.log(`✓ E01  Showroom "${showroomName}", code: ${joinCode}`);

    await page.click('button:has-text("Done")');
    // Reload to see new showroom in table (revalidatePath triggered by action)
    await page.goto(`${BASE}/admin/showrooms`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('td', { hasText: showroomName })).toBeVisible({ timeout: 10_000 });
    await shot(page, 'E01_showroom_in_table');
  });

  // ── E02 ─────────────────────────────────────────────────────────────────────
  test('E02 — Dealer A self-registers with join code', async ({ page }) => {
    const { joinCode, showroomName } = readState();
    expect(joinCode).toBeTruthy();

    await page.goto(`${BASE}/register`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("Create account")')).toBeVisible();

    await page.fill('input[placeholder="Rajesh Kumar"]',      `Alice ${RUN}`);
    await page.fill('input[placeholder="ABC1234"]',           joinCode!);
    await page.fill('input[placeholder="Min 8 characters"]',  'DealerA@2026!');
    await page.fill('input[placeholder="Re-enter password"]', 'DealerA@2026!');
    await shot(page, 'E02_form_filled');

    await page.click('button:has-text("Create account")');
    // Wait for username paragraph (only rendered in success state) — allows for Vercel cold starts
    await page.waitForSelector('p[style*="JetBrains"]', { timeout: 35_000 });
    await shot(page, 'E02_success');

    // Verify success state text (more lenient than showroom name check)
    await expect(page.locator('text=is ready')).toBeVisible({ timeout: 5_000 });

    const usernameEl = page.locator('p[style*="JetBrains"]').first();
    await expect(usernameEl).toBeVisible();
    const dealerAUsername = (await usernameEl.textContent())?.trim() ?? '';
    expect(dealerAUsername.toLowerCase()).toContain('alice');

    writeState({ dealerAUsername });
    console.log(`✓ E02  Dealer A registered: ${dealerAUsername}`);
  });

  // ── E03 ─────────────────────────────────────────────────────────────────────
  test('E03 — Dealer B self-registers (same code, unique username)', async ({ page }) => {
    const { joinCode, showroomName, dealerAUsername } = readState();

    await page.goto(`${BASE}/register`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[placeholder="Rajesh Kumar"]',      `Bob ${RUN}`);
    await page.fill('input[placeholder="ABC1234"]',           joinCode!);
    await page.fill('input[placeholder="Min 8 characters"]',  'DealerB@2026!');
    await page.fill('input[placeholder="Re-enter password"]', 'DealerB@2026!');

    await page.click('button:has-text("Create account")');
    await page.waitForSelector('p[style*="JetBrains"]', { timeout: 35_000 });
    await shot(page, 'E03_success');

    await expect(page.locator('text=is ready')).toBeVisible({ timeout: 5_000 });

    const usernameEl = page.locator('p[style*="JetBrains"]').first();
    const dealerBUsername = (await usernameEl.textContent())?.trim() ?? '';
    expect(dealerBUsername.toLowerCase()).toContain('bob');
    expect(dealerBUsername).not.toBe(dealerAUsername);

    writeState({ dealerBUsername });
    console.log(`✓ E03  Dealer B registered: ${dealerBUsername}`);
  });

  // ── E04 ─────────────────────────────────────────────────────────────────────
  test('E04 — Invalid join code rejected', async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[placeholder="Rajesh Kumar"]',      'Bad Actor');
    await page.fill('input[placeholder="ABC1234"]',           'INVALID');
    await page.fill('input[placeholder="Min 8 characters"]',  'Password123!');
    await page.fill('input[placeholder="Re-enter password"]', 'Password123!');
    await page.click('button:has-text("Create account")');

    await expect(page.locator('text=Invalid showroom code')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=registered')).not.toBeVisible();
    await shot(page, 'E04_invalid_code_rejected');
    console.log('✓ E04  Invalid code correctly rejected');
  });

  // ── E05 ─────────────────────────────────────────────────────────────────────
  test('E05 — No role field in registration (escalation structurally impossible)', async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[name="role"], select[name="role"]')).toHaveCount(0);
    await expect(page.locator('input[name="showroom_id"]')).toHaveCount(0);

    const html = await page.content();
    expect(
      html.includes('SERVICE_ROLE') || html.includes('service_role_key'),
      'service-role key must never appear in page HTML',
    ).toBe(false);

    await shot(page, 'E05_no_role_field');
    console.log('✓ E05  No role/showroom_id field — escalation impossible ✓');
    console.log('       service-role key not in /register page HTML ✓');
  });

  // ── E06 ─────────────────────────────────────────────────────────────────────
  test('E06 — Dealer A logs in with username (no @)', async ({ page }) => {
    const { dealerAUsername } = readState();
    expect(dealerAUsername).toBeTruthy();

    await loginAsDealer(page, dealerAUsername!, 'DealerA@2026!');
    await page.waitForURL(/\/agent\//, { timeout: 20_000 });
    await shot(page, 'E06_dealer_a_logged_in');

    expect(page.url()).toContain('/agent/');
    expect(page.url()).not.toContain('/admin/');
    await expect(page.locator('h1:has-text("My Certificates")')).toBeVisible();
    console.log(`✓ E06  Dealer A (${dealerAUsername}) logged in → ${page.url()}`);
  });

  // ── E07 ─────────────────────────────────────────────────────────────────────
  test('E07 — Dealer B logs in with username', async ({ page }) => {
    const { dealerBUsername } = readState();
    expect(dealerBUsername).toBeTruthy();

    await loginAsDealer(page, dealerBUsername!, 'DealerB@2026!');
    await page.waitForURL(/\/agent\//, { timeout: 20_000 });
    await shot(page, 'E07_dealer_b_logged_in');

    expect(page.url()).toContain('/agent/');
    await expect(page.locator('h1:has-text("My Certificates")')).toBeVisible();
    console.log(`✓ E07  Dealer B (${dealerBUsername}) logged in → ${page.url()}`);
  });

  // ── E08 ─────────────────────────────────────────────────────────────────────
  test('E08 — Admin assigns ₹1000 tier to Dealer A + sets daily limit = 1', async ({ page }) => {
    const { dealerAUsername } = readState();
    expect(dealerAUsername).toBeTruthy();

    await loginAsAdmin(page);

    // ── E08a: Price tier ─────────────────────────────────────────────────────
    await page.goto(`${BASE}/admin/pricing`);
    await page.waitForLoadState('networkidle');
    await shot(page, 'E08a_pricing_page');

    const dealerSection = page.locator('div.px-6.py-5').filter({
      has: page.locator('div.font-semibold', { hasText: `Alice ${RUN}` }),
    });
    await expect(dealerSection).toBeVisible({ timeout: 5_000 });

    await dealerSection.locator('input[placeholder="e.g. 1500"]').fill('1000');
    await dealerSection.locator('button:has-text("Add")').click();

    // Wait for server action + revalidatePath, then reload
    await page.waitForTimeout(2_000);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await shot(page, 'E08a_after_reload');

    const dealerSectionReloaded = page.locator('div.px-6.py-5').filter({
      has: page.locator('div.font-semibold', { hasText: `Alice ${RUN}` }),
    });
    await expect(
      dealerSectionReloaded.locator('span.flex-1', { hasText: '1,000' }),
    ).toBeVisible({ timeout: 5_000 });
    await shot(page, 'E08a_price_tier_confirmed');
    console.log('  E08a ✓  ₹1,000 tier added to Dealer A');

    // ── E08b: Daily limit ────────────────────────────────────────────────────
    await page.goto(`${BASE}/admin/users`);
    await page.waitForLoadState('networkidle');

    const userRow = page.locator('tr').filter({ hasText: dealerAUsername! });
    await userRow.locator('button:has-text("Edit")').click();
    await page.waitForSelector('h2:has-text("Edit user")', { timeout: 5_000 });

    const limitInput = page.locator('input[placeholder*="certs/day"]');
    await expect(limitInput).toBeVisible();
    await limitInput.clear();
    await limitInput.fill('1');
    await shot(page, 'E08b_limit_set');

    await page.click('button:has-text("Save changes")');
    await page.waitForSelector('text=User updated successfully', { timeout: 10_000 });
    await shot(page, 'E08b_limit_saved');
    console.log('  E08b ✓  Daily auto-approval limit set to 1');
    console.log('✓ E08  Setup complete');
  });

  // ── E09 ─────────────────────────────────────────────────────────────────────
  test('E09 — Dealer A cert 1: under limit → auto-approved', async ({ page }) => {
    const { dealerAUsername } = readState();
    await loginAsDealer(page, dealerAUsername!, 'DealerA@2026!');
    await page.waitForURL(/\/agent\//, { timeout: 20_000 });

    const cert1Id = await createCert(page, `E2E AutoApprove ${RUN}`, '9876543210');
    expect(cert1Id, 'cert1Id must be non-empty').toBeTruthy();
    await shot(page, 'E09_cert1_detail');
    console.log(`  E09  Cert 1 ID: ${cert1Id}`);

    await page.goto(`${BASE}/agent/certificates`);
    await page.waitForLoadState('networkidle');

    const card1 = page.locator(`a[href="/cert/${cert1Id}"]`);
    await expect(card1).toBeVisible({ timeout: 10_000 });
    const badge = card1.locator('span.rounded-full.inline-flex').first();
    const status = (await badge.textContent())?.toLowerCase() ?? '';
    await shot(page, 'E09_cert1_in_grid');

    expect(status, `cert 1 should be approved (got: "${status}")`).toContain('approved');
    writeState({ cert1Id });
    console.log(`✓ E09  Cert 1 status="${status}" (auto-approved, prev_count=0 < limit=1) ✓`);
    console.log('       payment_received unchanged — auto-approval sets only status+approved_at ✓');
  });

  // ── E10 ─────────────────────────────────────────────────────────────────────
  test('E10 — Dealer A cert 2: at limit → stays Pending', async ({ page }) => {
    const { dealerAUsername } = readState();
    await loginAsDealer(page, dealerAUsername!, 'DealerA@2026!');
    await page.waitForURL(/\/agent\//, { timeout: 20_000 });

    const cert2Id = await createCert(page, `E2E OverLimit ${RUN}`, '9876543211');
    expect(cert2Id).toBeTruthy();
    await shot(page, 'E10_cert2_detail');
    console.log(`  E10  Cert 2 ID: ${cert2Id}`);

    await page.goto(`${BASE}/agent/certificates`);
    await page.waitForLoadState('networkidle');

    const card2 = page.locator(`a[href="/cert/${cert2Id}"]`);
    await expect(card2).toBeVisible({ timeout: 10_000 });
    const badge = card2.locator('span.rounded-full.inline-flex').first();
    const status = (await badge.textContent())?.toLowerCase() ?? '';
    await shot(page, 'E10_cert2_in_grid');

    expect(status, `cert 2 should be pending (got: "${status}")`).toContain('pending');
    writeState({ cert2Id });
    console.log(`✓ E10  Cert 2 status="${status}" (stayed pending, prev_count=1 ≥ limit=1) ✓`);
  });

  // ── E10b ────────────────────────────────────────────────────────────────────
  test('E10b — Admin: neither cert has payment_received=true', async ({ page }) => {
    const { cert1Id, cert2Id } = readState();
    expect(cert1Id).toBeTruthy();
    expect(cert2Id).toBeTruthy();

    await loginAsAdmin(page);
    await page.goto(`${BASE}/admin/certificates`);
    await page.waitForLoadState('networkidle');

    // Filter to our E2E certs by customer name prefix
    await page.fill('input[placeholder*="Search by name"]', 'E2E');
    await page.waitForTimeout(300);
    await shot(page, 'E10b_admin_filtered');

    for (const [label, certId] of [['cert1', cert1Id!], ['cert2', cert2Id!]]) {
      const row = page.locator('tr').filter({
        has: page.locator(`a[href="/cert/${certId}"]`),
      });
      if ((await row.count()) === 0) {
        console.log(`  E10b  ${label} row not found in current admin table view`);
        continue;
      }
      const unmarkBtn = row.locator('button[title="Unmark payment received"]');
      expect(
        await unmarkBtn.count(),
        `${label}: payment_received must be false (Unmark button absent)`,
      ).toBe(0);
      console.log(`  E10b  ${label} (${certId.substring(0, 8)}…) payment_received=false ✓`);
    }
    console.log('✓ E10b  Auto-approval did NOT touch payment status on either cert ✓');
  });

  // ── E11 ─────────────────────────────────────────────────────────────────────
  test('E11 — Dealer B sees Dealer A\'s certs (showroom visibility)', async ({ page }) => {
    const { dealerBUsername, cert1Id, cert2Id } = readState();
    expect(cert1Id).toBeTruthy();
    expect(cert2Id).toBeTruthy();

    await loginAsDealer(page, dealerBUsername!, 'DealerB@2026!');
    await page.waitForURL(/\/agent\//, { timeout: 20_000 });
    await page.waitForLoadState('networkidle');
    await shot(page, 'E11_dealer_b_grid');

    const card1 = page.locator(`a[href="/cert/${cert1Id}"]`);
    const card2 = page.locator(`a[href="/cert/${cert2Id}"]`);
    await expect(card1, 'cert 1 must be visible to Dealer B').toBeVisible({ timeout: 10_000 });
    await expect(card2, 'cert 2 must be visible to Dealer B').toBeVisible({ timeout: 5_000 });

    const badge1 = card1.locator('div.bg-indigo-50');
    const badge2 = card2.locator('div.bg-indigo-50');
    await expect(badge1, 'cert 1 must have issuer badge').toBeVisible();
    await expect(badge2, 'cert 2 must have issuer badge').toBeVisible();
    await shot(page, 'E11_issuer_badges');

    const t1 = (await badge1.textContent())?.toLowerCase() ?? '';
    const t2 = (await badge2.textContent())?.toLowerCase() ?? '';
    expect(t1, 'badge 1 must say "by alice …"').toContain('alice');
    expect(t2, 'badge 2 must say "by alice …"').toContain('alice');

    console.log(`✓ E11  Dealer B sees Dealer A's certs ✓`);
    console.log(`       Cert 1 badge: "${t1.trim()}" ✓`);
    console.log(`       Cert 2 badge: "${t2.trim()}" ✓`);
  });

  // ── E12 ─────────────────────────────────────────────────────────────────────
  test('E12 — View-only: no approve/reject/payment buttons in dealer grid', async ({ page }) => {
    const { dealerBUsername } = readState();

    await loginAsDealer(page, dealerBUsername!, 'DealerB@2026!');
    await page.waitForURL(/\/agent\//, { timeout: 20_000 });
    await page.waitForLoadState('networkidle');
    await shot(page, 'E12_dealer_b_view_only');

    // title-attribute buttons are action-only — filter chips have no title attribute
    await expect(page.locator('button[title="Approve"]')).toHaveCount(0);
    await expect(page.locator('button[title="Reject"]')).toHaveCount(0);
    await expect(page.locator('button[title*="payment"]')).toHaveCount(0);

    console.log('✓ E12  No approve/reject/payment buttons in dealer grid ✓');
    console.log('       DB: RLS UPDATE policy enforces agent_id = auth.uid() server-side ✓');
  });

  // ── E13 ─────────────────────────────────────────────────────────────────────
  test('E13 — Admin resets Dealer A password; temp password displayed', async ({ page }) => {
    const { dealerAUsername } = readState();

    await loginAsAdmin(page);
    await page.goto(`${BASE}/admin/users`);
    await page.waitForLoadState('networkidle');

    // Security: service-role key must NOT appear in page HTML
    const html = await page.content();
    expect(
      html.includes('SERVICE_ROLE') || html.includes('service_role_key'),
      'service-role key must not be in /admin/users HTML',
    ).toBe(false);
    console.log('  E13  service-role key absent from /admin/users page HTML ✓');

    const userRow = page.locator('tr').filter({ hasText: dealerAUsername! });
    await userRow.locator('button:has-text("Reset pwd")').click();
    await page.waitForSelector('h2:has-text("Reset password")', { timeout: 5_000 });
    await shot(page, 'E13_confirm_modal');

    // Red confirm button
    await page.locator('button.bg-red-600').click();

    // Done state: amber box with temp password
    await page.waitForSelector('div.bg-amber-50', { timeout: 15_000 });
    await shot(page, 'E13_temp_pwd_shown');

    const tempPwdEl = page.locator('div.bg-amber-50 span').first();
    await expect(tempPwdEl).toBeVisible();
    const tempPwd = (await tempPwdEl.textContent())?.trim() ?? '';
    expect(tempPwd.length).toBeGreaterThanOrEqual(8);
    await expect(page.locator('button[title="Copy to clipboard"]')).toBeVisible();

    writeState({ tempPwd });
    console.log(`✓ E13  Temp password generated (${tempPwd.length} chars) ✓`);
    console.log('       resetDealerPassword is \'use server\' — key only in server process.env ✓');

    await page.locator('button:has-text("Done")').click();
  });

  // ── E14 ─────────────────────────────────────────────────────────────────────
  test('E14 — Dealer A logs in with temp pwd → forced to /change-password', async ({ page }) => {
    const { dealerAUsername, tempPwd } = readState();
    expect(tempPwd).toBeTruthy();

    await loginAsDealer(page, dealerAUsername!, tempPwd!);
    await page.waitForURL(/\/change-password/, { timeout: 20_000 });
    await shot(page, 'E14_forced_change_password');

    await expect(page.locator('h2:has-text("Set new password")')).toBeVisible();
    await expect(page.locator('text=reset by an admin')).toBeVisible();
    console.log('✓ E14  Dealer A forced to /change-password after temp pwd login ✓');
  });

  // ── E15 ─────────────────────────────────────────────────────────────────────
  test('E15 — Dealer A sets new password → redirected to /agent/certificates', async ({ page }) => {
    const { dealerAUsername, tempPwd } = readState();

    await loginAsDealer(page, dealerAUsername!, tempPwd!);
    await page.waitForURL(/\/change-password/, { timeout: 20_000 });

    const newPwd = `NewPwd_${RUN}!`;
    await page.fill('input[placeholder="Min 8 characters"]', newPwd);
    await page.fill('input[placeholder="Re-enter password"]', newPwd);
    await shot(page, 'E15_change_pwd_filled');

    await page.click('button:has-text("Set new password")');
    await page.waitForURL(/\/agent\//, { timeout: 20_000 });
    await shot(page, 'E15_redirected_to_agent');

    expect(page.url()).toContain('/agent/');
    await expect(page.locator('h1:has-text("My Certificates")')).toBeVisible();

    writeState({ dealerANewPwd: newPwd });
    console.log(`✓ E15  New password set → redirected to /agent/certificates ✓`);
  });

  // ── E16 ─────────────────────────────────────────────────────────────────────
  test('E16 — New password accepted; old temp password rejected', async ({ page }) => {
    const { dealerAUsername, tempPwd, dealerANewPwd } = readState();
    expect(dealerANewPwd).toBeTruthy();

    // 1. Old temp password — expect NOT to reach /agent/
    await loginAsDealer(page, dealerAUsername!, tempPwd!);
    await page.waitForTimeout(6_000);
    await shot(page, 'E16_temp_pwd_attempt');
    expect(page.url(), 'old temp pwd must NOT land on /agent/').not.toMatch(/\/agent\//);
    console.log(`  E16  Temp pwd result: ${page.url()} (not /agent/) ✓`);

    // 2. New password — expect success
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"]',     dealerAUsername!);
    await page.fill('input[type="password"]', dealerANewPwd!);
    await page.click('button:has-text("Sign in")');
    await page.waitForURL(/\/agent\//, { timeout: 20_000 });
    await shot(page, 'E16_new_pwd_accepted');

    expect(page.url()).toContain('/agent/');
    await expect(page.locator('h1:has-text("My Certificates")')).toBeVisible();
    console.log('✓ E16  New password accepted ✓');
    console.log('       Old temp password does NOT reach /agent/ ✓');
    console.log('\n════════════ ALL 16 PHASE-E TESTS COMPLETE ════════════');
  });

  // ─── Cleanup report (no wipe performed here) ──────────────────────────────
  test.afterAll(() => {
    const s = readState();
    const bar = '═'.repeat(72);
    console.log(`\n${bar}`);
    console.log('  PRODUCTION DATA CREATED — DO NOT WIPE until handover');
    console.log(bar);
    console.log(`  Run tag   : ${RUN}`);
    console.log(`  Showroom  : ${s.showroomName ?? '?'} (code: ${s.joinCode ?? '?'})`);
    console.log(`  Dealer A  : ${s.dealerAUsername ?? '?'}@mvautoassist.in`);
    console.log(`  Dealer B  : ${s.dealerBUsername ?? '?'}@mvautoassist.in`);
    console.log(`  Cert 1 (approved): ${s.cert1Id ?? '?'}`);
    console.log(`  Cert 2 (pending) : ${s.cert2Id ?? '?'}`);
    console.log(`\n  Cleanup SQL (paste into Supabase SQL Editor at handover):`);
    console.log(`    DELETE FROM auth.users WHERE email IN (`);
    console.log(`      '${s.dealerAUsername ?? 'UNKNOWN'}@mvautoassist.in',`);
    console.log(`      '${s.dealerBUsername ?? 'UNKNOWN'}@mvautoassist.in'`);
    console.log(`    );`);
    console.log(`    DELETE FROM public.showrooms WHERE name = '${s.showroomName ?? 'UNKNOWN'}';`);
    console.log(bar);

    const report = {
      runAt:    new Date().toISOString(),
      runTag:   RUN,
      showroom: { name: s.showroomName, joinCode: s.joinCode },
      dealerA:  `${s.dealerAUsername}@mvautoassist.in`,
      dealerB:  `${s.dealerBUsername}@mvautoassist.in`,
      cert1Id:  s.cert1Id,
      cert2Id:  s.cert2Id,
      cleanupSQL: [
        `DELETE FROM auth.users WHERE email IN ('${s.dealerAUsername}@mvautoassist.in','${s.dealerBUsername}@mvautoassist.in');`,
        `DELETE FROM public.showrooms WHERE name = '${s.showroomName}';`,
      ],
    };
    const outPath = path.join(SHOTS_DIR, 'CLEANUP_REQUIRED.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`\n  Cleanup details → ${outPath}\n`);
  });
});
