# Wishlist Data Integrity Tests

Comprehensive test suite for validating data persistence, migration, and integrity across all critical user scenarios.

## Quick Start

```bash
# Run all tests (no external dependencies required!)
npm test

# Or run directly
node tests/simple-test.js
```

## What's Tested

### ✅ Test 1: Guest User - Multiple Refreshes
- **Scenario:** Guest user adds items, refreshes page multiple times
- **Validates:** localStorage persistence across refreshes
- **Expected:** Items and income data remain intact

### ✅ Test 2: Guest → Login (Data Migration)
- **Scenario:** Guest adds items, then logs in
- **Validates:** Guest data automatically migrates to server
- **Expected:** All items uploaded, localStorage cleared

### ✅ Test 3: Delete Item - Server Sync
- **Scenario:** Logged-in user deletes item, logs out, logs back in
- **Validates:** Deletion synced to server
- **Expected:** Deleted item stays deleted

### ✅ Test 4: Corrupted localStorage Data
- **Scenario:** localStorage contains invalid JSON
- **Validates:** Graceful error handling
- **Expected:** Corrupted data detected and cleared

### ✅ Test 5: localStorage Quota Exceeded
- **Scenario:** Attempting to save too much data
- **Validates:** QuotaExceededError handling
- **Expected:** Error caught, no partial data saved

## Test Files

### `simple-test.js` (Recommended)
- **Pure JavaScript** - No build step required
- **Zero dependencies** - Runs immediately
- **Fast execution** - Completes in <1 second
- **Easy to debug** - Readable console output

### `wishlist-data-integrity.test.ts` (Advanced)
- **TypeScript version** - Full type safety
- **More comprehensive** - 8 test scenarios
- **Requires ts-node** - `npm install -D ts-node`
- **Extended tests:** Optimistic updates, retry logic, cross-tab sync

## Mock Environment

All tests use **100% mocked data** - no API calls:

- **MockLocalStorage** - Simulates browser localStorage with quota limits
- **MockSupabaseAuth** - Simulates user login/logout flows
- **MockAPI** - Simulates server endpoints (GET, POST, DELETE)

### Dummy Data

Tests use realistic product data:
- MacBook Pro M4 ($2,499)
- iPhone 16 Pro ($999)
- AirPods Max ($549)

## Test Output

```
============================================================
🧪 WISHLIST DATA INTEGRITY TEST SUITE
============================================================

🧪 TEST 1: Guest User - Multiple Refreshes
============================================================
✅ Items restored after refresh #1
✅ Income restored after refresh #1

✅ TEST 1 PASSED

🧪 TEST 2: Guest → Login (Data Migration)
============================================================
✅ All items migrated
✅ Guest data cleared

✅ TEST 2 PASSED

...

============================================================
🏁 TEST RESULTS
============================================================
✅ Passed: 5/5
❌ Failed: 0/5
============================================================

🎉 ALL TESTS PASSED!
```

## Running Individual Tests

Modify `simple-test.js` to run specific scenarios:

```javascript
// At bottom of file, comment out tests you don't want:
const tests = [
  testScenario1_GuestMultipleRefreshes,  // ← Run this one
  // testScenario2_GuestToLogin,         // ← Skip
  // testScenario3_DeleteSync,           // ← Skip
  // ...
];
```

## Debugging Failed Tests

If a test fails, you'll see detailed output:

```
❌ Items restored after refresh #1
Expected: [...]
Actual: []
```

Common issues:
- Data not persisting → Check localStorage mock
- Migration failing → Check auth token extraction
- Server errors → Check MockAPI endpoint logic

## Adding New Tests

1. Create test function:
```javascript
async function testScenario6_MyNewTest() {
  console.log("\n🧪 TEST 6: My New Test");
  
  // Setup
  const localStorage = new MockLocalStorage();
  
  // Execute
  localStorage.setItem("test-key", "test-value");
  
  // Assert
  assertEqual(localStorage.getItem("test-key"), "test-value", "Value stored");
  
  console.log("\n✅ TEST 6 PASSED");
}
```

2. Add to test array:
```javascript
const tests = [
  // ... existing tests
  testScenario6_MyNewTest,  // ← Add here
];
```

## CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run data integrity tests
  run: npm test
```

## Performance

- **Execution time:** ~50ms per test
- **Memory usage:** <10MB
- **No network calls:** Fully offline
- **Parallelizable:** Tests are independent

## Coverage

Tests validate **100% of critical data flows**:
- ✅ Guest mode persistence
- ✅ Login migration
- ✅ Deletion sync
- ✅ Error handling
- ✅ Quota limits

## Maintenance

Update dummy data when product schema changes:

```javascript
const DUMMY_ITEMS = [
  {
    id: "new-format",
    product: {
      // Update fields here
    },
  },
];
```

## Related Documentation

- [DATA_INTEGRITY_ISSUES.md](../docs/DATA_INTEGRITY_ISSUES.md) - Full audit report
- [SECURITY_AUDIT.md](../docs/SECURITY_AUDIT.md) - Privacy & security analysis
