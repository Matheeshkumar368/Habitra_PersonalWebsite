/**
 * Habitra Core Logic Quality & Reliability Test Suite
 * Validates:
 * 1. Financial formatting (Indian & International numbering, privacy masking, mechanical reel tokens)
 * 2. Daily savings calculations (aggregations, streaks, timeframes)
 * 3. Cash flow & net worth accounting (transfers exclusion, liability handling)
 * 4. Spending engine & budget health (safe/caution/danger thresholds)
 * 5. Data integrity (backup validation, partial restore merging)
 * 6. Cryptographic security (SHA-256 salted password hashing)
 */

import {
  formatCents,
  formatCompactCurrency,
  formatCounterReelParts,
  calculateDailySavingsStats,
  calculateCashFlow,
  calculateNetWorth,
  calculateSpendingStats,
  DEFAULT_FINSA_CATEGORIES,
  DEFAULT_FINSA_ACCOUNTS,
} from '../src/services/finsaEngine';
import { formatLocalYMD } from '../src/constants/scenesAndPresets';
import { parseBackupJson, hashPasswordWithSalt } from '../src/db/indexedDb';
import { FinsaTransaction, FinsaDailySavingsRecord } from '../src/types/finsa';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}`);
    if (details) console.error(`    Details: ${details}`);
  }
}

async function runAuditSuite() {
  console.log('=== HABITRA FINAL PRODUCT QUALITY AUDIT SUITE ===\n');

  // ----------------------------------------------------
  // TEST GROUP 1: Currency & Indian Number Formatting
  // ----------------------------------------------------
  console.log('--- Group 1: Currency & Number Formatting ---');

  // INR Lakhs & Crores formatting
  // 1,25,00,000 INR = 1,250,000,000 paise
  const formattedCrores = formatCents(1250000000, 'INR', false);
  assert(
    formattedCrores.includes('1,25,00,000') && formattedCrores.includes('₹'),
    'INR ₹1.25 Crore formatting includes Indian comma groupings',
    `Received: "${formattedCrores}"`
  );

  // 5 Lakhs = 50,000,000 paise
  const formattedLakhs = formatCents(50000000, 'INR', false);
  assert(
    formattedLakhs.includes('5,00,000') && formattedLakhs.includes('₹'),
    'INR ₹5 Lakh formatting includes Indian comma groupings',
    `Received: "${formattedLakhs}"`
  );

  // Negative values
  const negativeInr = formatCents(-450000, 'INR', false);
  assert(
    negativeInr.startsWith('-₹') && negativeInr.includes('4,500.00'),
    'Negative INR properly formatted with leading minus',
    `Received: "${negativeInr}"`
  );

  // Privacy Mode masking
  const maskedVal = formatCents(1250000000, 'INR', true);
  assert(maskedVal === '••••••', 'Privacy mode masks balance with bullet characters');

  // Compact currency
  const compactCr = formatCompactCurrency(1250000000, 'INR');
  assert(compactCr.includes('1.25 Cr'), 'Compact currency prints Cr for crores', `Received: "${compactCr}"`);

  const compactLakh = formatCompactCurrency(50000000, 'INR');
  assert(compactLakh.includes('5 L') || compactLakh.includes('5.00 L'), 'Compact currency prints L for lakhs', `Received: "${compactLakh}"`);

  // Mechanical Reel Breakdown
  const reelParts = formatCounterReelParts(1250000000, 'INR');
  assert(reelParts.currencySymbol === '₹', 'Reel breakdown extracts ₹ symbol');
  assert(reelParts.hasDecimals === true, 'Reel breakdown detects decimals');
  assert(reelParts.decimalChars.length === 2, 'Reel breakdown provides 2 decimal digits');
  assert(
    reelParts.integerChars.join('').includes('1,25,00,000'),
    'Reel integer chars correctly decompose Indian digit tiles'
  );

  // ----------------------------------------------------
  // TEST GROUP 2: FINSA Daily Savings Engine
  // ----------------------------------------------------
  console.log('\n--- Group 2: Daily Savings Engine ---');

  const todayStr = formatLocalYMD(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatLocalYMD(yesterday);

  const sampleDrops: FinsaDailySavingsRecord[] = [
    { id: 'ds_1', date: todayStr, amountCents: 5000, category: 'Coffee Saved', createdAt: new Date().toISOString() },
    { id: 'ds_2', date: todayStr, amountCents: 10000, category: 'Lunch Prep', createdAt: new Date().toISOString() },
    { id: 'ds_3', date: yesterdayStr, amountCents: 15000, category: 'Transit', createdAt: new Date().toISOString() },
  ];

  const savingsStats = calculateDailySavingsStats(sampleDrops, '30d');
  assert(savingsStats.totalCents === 30000, 'Sums all savings drops across history', `Received: ${savingsStats.totalCents}`);
  assert(savingsStats.todayCents === 15000, 'Aggregates multiple drops on today', `Received: ${savingsStats.todayCents}`);
  assert(savingsStats.streakDays === 2, 'Detects 2-day consecutive saving streak', `Received: ${savingsStats.streakDays}`);

  // ----------------------------------------------------
  // TEST GROUP 3: FINSA Cash Flow & Net Worth Accounting
  // ----------------------------------------------------
  console.log('\n--- Group 3: Cash Flow & Net Worth Accounting ---');

  const testTransactions: FinsaTransaction[] = [
    {
      id: 'tx_1',
      date: todayStr,
      amountCents: 10000000, // 1 Lakh income
      type: 'income',
      categoryId: 'cat_inc_salary',
      accountId: 'acc_1',
      payeeOrPayer: 'Primary Salary',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_2',
      date: todayStr,
      amountCents: 2500000, // 25k expense
      type: 'expense',
      categoryId: 'cat_exp_housing',
      accountId: 'acc_1',
      payeeOrPayer: 'Rent Payment',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_3',
      date: todayStr,
      amountCents: 5000000, // 50k transfer
      type: 'transfer',
      categoryId: 'cat_transfer',
      accountId: 'acc_1',
      toAccountId: 'acc_2',
      payeeOrPayer: 'Savings Vault Deposit',
      createdAt: new Date().toISOString(),
    },
  ];

  const cashFlow = calculateCashFlow(testTransactions);
  assert(cashFlow.incomeCents === 10000000, 'Cash flow accurately sums income');
  assert(cashFlow.expensesCents === 2500000, 'Cash flow accurately sums expenses');
  assert(
    cashFlow.transferVolumeCents === 5000000,
    'Transfers tracked separately and NOT added to income or expense'
  );
  assert(
    cashFlow.netFlowCents === 7500000,
    'Net flow is income minus expenses (100k - 25k = 75k)',
    `Received: ${cashFlow.netFlowCents}`
  );
  assert(
    cashFlow.savingsRatePercent === 75,
    'Savings rate is 75%',
    `Received: ${cashFlow.savingsRatePercent}`
  );

  // Net worth with liability (Credit Card)
  const testAccounts = [
    { id: 'acc_check', name: 'Checking', type: 'checking' as const, balanceCents: 8000000, currency: 'INR' as const, icon: '💳', color: '#fff', isIncludedInNetWorth: true, createdAt: '' },
    { id: 'acc_save', name: 'Savings', type: 'savings' as const, balanceCents: 15000000, currency: 'INR' as const, icon: '🛡️', color: '#fff', isIncludedInNetWorth: true, createdAt: '' },
    { id: 'acc_card', name: 'Credit Card', type: 'credit' as const, balanceCents: 3000000, currency: 'INR' as const, icon: '💳', color: '#fff', isIncludedInNetWorth: true, createdAt: '' },
  ];

  const netWorth = calculateNetWorth(testAccounts);
  // Checking (80k) + Savings (150k) - Credit Card (30k) = 200,000 = 20,000,000 paise
  assert(
    netWorth === 20000000,
    'Net worth properly counts credit card balance as liability/subtraction',
    `Expected: 20000000, Received: ${netWorth}`
  );

  // ----------------------------------------------------
  // TEST GROUP 4: Spending Studio & Budget Calculations
  // ----------------------------------------------------
  console.log('\n--- Group 4: Spending Studio & Budget Health ---');

  const spendingStats = calculateSpendingStats(testTransactions, DEFAULT_FINSA_CATEGORIES);
  assert(spendingStats.todaySpentCents === 2500000, 'Today spent equals today expense transactions');
  assert(spendingStats.categoryMetrics.length > 0, 'Category breakdown produced for spending');
  assert(
    spendingStats.categoryMetrics.some((c) => c.categoryId === 'cat_exp_housing' && c.spentCents === 2500000),
    'Housing category contains 25k spent'
  );

  // ----------------------------------------------------
  // TEST GROUP 5: Data Integrity & Backup Recovery
  // ----------------------------------------------------
  console.log('\n--- Group 5: Data Integrity & Backup Recovery ---');

  // Corrupt string test
  let corruptCaught = false;
  try {
    parseBackupJson('{"broken": invalid JSON');
  } catch (err: unknown) {
    corruptCaught = true;
    assert(
      (err as Error).message.includes('Could not parse JSON content'),
      'Corrupt JSON string safely rejected with descriptive Error message'
    );
  }
  assert(corruptCaught, 'Corrupt JSON string throws clean descriptive Error');

  // Empty string test
  let emptyCaught = false;
  try {
    parseBackupJson('');
  } catch (err: unknown) {
    emptyCaught = true;
    assert(
      (err as Error).message.includes('File is empty'),
      'Empty string safely rejected with descriptive Error message'
    );
  }
  assert(emptyCaught, 'Empty string throws clean descriptive Error');

  // Valid backup with partial data
  const partialBackup = JSON.stringify({
    version: '2.7.0',
    exportedAt: new Date().toISOString(),
    habits: [
      { id: 'h_test', name: 'Morning Meditation', frequency: 'daily', streak: 5, category: 'mindfulness' }
    ],
    profile: {
      userName: 'Test Pilot',
      level: 4,
    }
  });

  const parsedPartial = parseBackupJson(partialBackup);
  assert(parsedPartial !== null, 'Valid partial backup parsed successfully');
  assert(
    parsedPartial?.habits.length === 1 && parsedPartial.habits[0].name === 'Morning Meditation',
    'Preserves habits from restored file'
  );
  assert(
    parsedPartial?.profile.userName === 'Test Pilot',
    'Preserves user profile from restored file'
  );
  assert(
    typeof parsedPartial?.environment.sceneId === 'string' &&
      typeof parsedPartial?.environment.lightingWarmth === 'number',
    'Safely merges default environment fields when absent in partial backup'
  );

  // ----------------------------------------------------
  // TEST GROUP 6: Cryptographic Security & Password Hashing
  // ----------------------------------------------------
  console.log('\n--- Group 6: Security & Password Hashing ---');

  const pwResult1 = await hashPasswordWithSalt('HabitraSecure2026!');
  assert(Boolean(pwResult1.hash && pwResult1.salt), 'Generates secure SHA-256 hash and random salt');
  assert(pwResult1.hash.length === 64, 'SHA-256 hash length is 64 hex characters');

  // Verify same password with same salt reproduces identical hash
  const pwResult2 = await hashPasswordWithSalt('HabitraSecure2026!', pwResult1.salt);
  assert(pwResult2.hash === pwResult1.hash, 'Deterministic verification: same salt + password matches hash');

  // Verify wrong password fails
  const pwResultWrong = await hashPasswordWithSalt('WrongPassword', pwResult1.salt);
  assert(pwResultWrong.hash !== pwResult1.hash, 'Different password with same salt produces different hash');

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`AUDIT TEST SUMMARY: ${passedTests}/${totalTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAuditSuite().catch((err) => {
  console.error('Audit suite encountered unexpected error:', err);
  process.exit(1);
});
