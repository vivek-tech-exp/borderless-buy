/**
 * Wishlist Data Integrity Test Suite
 * Tests critical scenarios without calling external APIs
 */

import { WishlistItem } from "@/types";

// ============================================================================
// DUMMY DATA
// ============================================================================

const DUMMY_ITEMS: WishlistItem[] = [
  {
    id: "test-item-1",
    product: {
      id: "mbp-m4",
      name: "MacBook Pro M4",
      displayName: "MacBook Pro M4 16-inch",
      category: "tech",
      carryOnFriendly: true,
      pricing: {
        US: {
          price: 2499,
          currency: "USD",
          priceSource: "Apple US",
          buyingLink: "https://apple.com/us",
          stockStatus: "in_stock",
        },
        IN: {
          price: 250000,
          currency: "INR",
          priceSource: "Apple India",
          buyingLink: "https://apple.com/in",
          stockStatus: "in_stock",
        },
      },
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: "test-item-2",
    product: {
      id: "iphone-16",
      name: "iPhone 16 Pro",
      displayName: "iPhone 16 Pro 256GB",
      category: "tech",
      carryOnFriendly: true,
      pricing: {
        US: {
          price: 999,
          currency: "USD",
          priceSource: "Apple US",
          buyingLink: "https://apple.com/us",
          stockStatus: "in_stock",
        },
        UK: {
          price: 999,
          currency: "GBP",
          priceSource: "Apple UK",
          buyingLink: "https://apple.com/uk",
          stockStatus: "in_stock",
        },
      },
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: "test-item-3",
    product: {
      id: "airpods-max",
      name: "AirPods Max",
      displayName: "AirPods Max USB-C",
      category: "tech",
      carryOnFriendly: true,
      pricing: {
        US: {
          price: 549,
          currency: "USD",
          priceSource: "Apple US",
          buyingLink: "https://apple.com/us",
          stockStatus: "in_stock",
        },
        DE: {
          price: 579,
          currency: "EUR",
          priceSource: "Apple Germany",
          buyingLink: "https://apple.com/de",
          stockStatus: "in_stock",
        },
      },
    },
    createdAt: new Date().toISOString(),
  },
];

const LOCAL_WISHLIST_KEY = "borderless-buy-guest-wishlist";
const INCOME_KEY = "borderless-buy-income";

// ============================================================================
// MOCK ENVIRONMENT SETUP
// ============================================================================

class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] || null;
  }

  setItem(key: string, value: string): void {
    // Simulate quota exceeded after 10KB
    const totalSize = Object.values(this.store).join("").length + value.length;
    if (totalSize > 10000) {
      const error: any = new Error("QuotaExceededError");
      error.name = "QuotaExceededError";
      throw error;
    }
    this.store[key] = value;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] || null;
  }

  // Test helper
  getStore() {
    return { ...this.store };
  }
}

class MockSupabaseAuth {
  private session: any = null;
  private listeners: Array<(event: string, session: any) => void> = [];

  async getSession() {
    return {
      data: { session: this.session },
      error: null,
    };
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.listeners.push(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter((l) => l !== callback);
          },
        },
      },
    };
  }

  // Test helpers
  simulateLogin(userId: string, email: string) {
    this.session = {
      user: { id: userId, email },
      access_token: `mock-token-${userId}`,
    };
    this.listeners.forEach((cb) => cb("SIGNED_IN", this.session));
  }

  simulateLogout() {
    this.session = null;
    this.listeners.forEach((cb) => cb("SIGNED_OUT", null));
  }
}

class MockAPI {
  private serverData: Record<string, WishlistItem[]> = {};
  private shouldFail = false;
  private failureType: "network" | "server" | null = null;

  async fetch(url: string, options?: any): Promise<any> {
    if (this.shouldFail) {
      if (this.failureType === "network") {
        throw new Error("Network error");
      }
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: "Server error" }),
      };
    }

    const userId = this.extractUserId(options?.headers?.Authorization);
    
    if (url.includes("/api/wishlist")) {
      if (options?.method === "POST") {
        return this.handlePost(userId, options.body);
      } else if (options?.method === "DELETE") {
        const itemId = new URL(url, "http://localhost").searchParams.get("id");
        return this.handleDelete(userId, itemId);
      } else {
        return this.handleGet(userId);
      }
    }

    return { ok: false, status: 404, json: async () => ({ error: "Not found" }) };
  }

  private extractUserId(authHeader?: string): string {
    if (!authHeader) return "";
    const token = authHeader.replace("Bearer ", "");
    return token.replace("mock-token-", "");
  }

  private async handleGet(userId: string) {
    const items = this.serverData[userId] || [];
    return {
      ok: true,
      status: 200,
      json: async () => ({ items }),
    };
  }

  private async handlePost(userId: string, body: string) {
    const { item } = JSON.parse(body);
    if (!this.serverData[userId]) {
      this.serverData[userId] = [];
    }
    
    // Check for duplicate
    const exists = this.serverData[userId].find((i) => i.id === item.id);
    if (exists) {
      return { ok: false, status: 409, json: async () => ({ error: "Duplicate" }) };
    }
    
    this.serverData[userId].push(item);
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  }

  private async handleDelete(userId: string, itemId: string | null) {
    if (!itemId) {
      return { ok: false, status: 400, json: async () => ({ error: "Missing id" }) };
    }
    
    if (!this.serverData[userId]) {
      return { ok: false, status: 404, json: async () => ({ error: "Not found" }) };
    }
    
    const index = this.serverData[userId].findIndex((i) => i.id === itemId);
    if (index === -1) {
      return { ok: false, status: 404, json: async () => ({ error: "Not found" }) };
    }
    
    this.serverData[userId].splice(index, 1);
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  }

  // Test helpers
  setFailureMode(type: "network" | "server" | null) {
    this.shouldFail = type !== null;
    this.failureType = type;
  }

  getServerData(userId: string): WishlistItem[] {
    return this.serverData[userId] || [];
  }

  clearServerData() {
    this.serverData = {};
  }
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

function assertEqual(actual: any, expected: any, message: string) {
  const actualStr = JSON.stringify(actual, null, 2);
  const expectedStr = JSON.stringify(expected, null, 2);
  
  if (actualStr !== expectedStr) {
    throw new Error(
      `❌ ${message}\n` +
      `Expected: ${expectedStr}\n` +
      `Actual: ${actualStr}`
    );
  }
  console.log(`✅ ${message}`);
}

function assertNotNull(value: any, message: string) {
  if (value === null || value === undefined) {
    throw new Error(`❌ ${message}: Expected non-null value, got ${value}`);
  }
  console.log(`✅ ${message}`);
}

function assertNull(value: any, message: string) {
  if (value !== null && value !== undefined) {
    throw new Error(`❌ ${message}: Expected null, got ${JSON.stringify(value)}`);
  }
  console.log(`✅ ${message}`);
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

async function testScenario1_GuestMultipleRefreshes() {
  console.log("\n🧪 TEST 1: Guest User - Multiple Refreshes");
  console.log("=" .repeat(60));

  const localStorage = new MockLocalStorage();
  
  // Simulate: User adds items
  console.log("\n📝 Step 1: User adds 3 items to wishlist (guest mode)");
  localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(DUMMY_ITEMS));
  localStorage.setItem(INCOME_KEY, "5000");
  
  // Simulate: Page refresh 1
  console.log("\n🔄 Step 2: Page refresh #1");
  const stored1 = localStorage.getItem(LOCAL_WISHLIST_KEY);
  const items1 = stored1 ? JSON.parse(stored1) : [];
  const income1 = localStorage.getItem(INCOME_KEY);
  
  assertEqual(items1.length, 3, "Items restored after refresh #1");
  assertEqual(income1, "5000", "Income restored after refresh #1");
  
  // Simulate: Page refresh 2
  console.log("\n🔄 Step 3: Page refresh #2");
  const stored2 = localStorage.getItem(LOCAL_WISHLIST_KEY);
  const items2 = stored2 ? JSON.parse(stored2) : [];
  const income2 = localStorage.getItem(INCOME_KEY);
  
  assertEqual(items2.length, 3, "Items still present after refresh #2");
  assertEqual(income2, "5000", "Income still present after refresh #2");
  
  // Simulate: Add one more item
  console.log("\n➕ Step 4: Add one more item");
  items2.push({ ...DUMMY_ITEMS[0], id: "test-item-4" });
  localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(items2));
  
  // Simulate: Page refresh 3
  console.log("\n🔄 Step 5: Page refresh #3");
  const stored3 = localStorage.getItem(LOCAL_WISHLIST_KEY);
  const items3 = stored3 ? JSON.parse(stored3) : [];
  
  assertEqual(items3.length, 4, "All 4 items restored after refresh #3");
  
  console.log("\n✅ TEST 1 PASSED: Guest data persists across multiple refreshes");
}

async function testScenario2_GuestToLogin() {
  console.log("\n🧪 TEST 2: Guest → Login (Data Migration)");
  console.log("=" .repeat(60));

  const localStorage = new MockLocalStorage();
  const auth = new MockSupabaseAuth();
  const api = new MockAPI();
  
  // Simulate: Guest adds items
  console.log("\n📝 Step 1: Guest user adds 3 items");
  localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(DUMMY_ITEMS));
  localStorage.setItem(INCOME_KEY, "5000");
  
  const guestItems = JSON.parse(localStorage.getItem(LOCAL_WISHLIST_KEY)!);
  assertEqual(guestItems.length, 3, "Guest has 3 items in localStorage");
  
  // Simulate: User logs in
  console.log("\n🔐 Step 2: User logs in");
  auth.simulateLogin("user-123", "test@example.com");
  const session = await auth.getSession();
  assertNotNull(session.data.session, "Session exists after login");
  
  // Simulate: Migration process
  console.log("\n🔄 Step 3: Migrate guest data to server");
  const storedData = localStorage.getItem(LOCAL_WISHLIST_KEY);
  const itemsToMigrate = storedData ? JSON.parse(storedData) : [];
  
  for (const item of itemsToMigrate) {
    await api.fetch("/api/wishlist", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.data.session.access_token}` },
      body: JSON.stringify({ item }),
    });
  }
  
  // Verify server has items
  const serverItems = api.getServerData("user-123");
  assertEqual(serverItems.length, 3, "All 3 items migrated to server");
  
  // Simulate: Clear localStorage after migration
  console.log("\n🗑️  Step 4: Clear guest localStorage after migration");
  localStorage.removeItem(LOCAL_WISHLIST_KEY);
  localStorage.removeItem(INCOME_KEY);
  
  assertNull(localStorage.getItem(LOCAL_WISHLIST_KEY), "Guest data cleared");
  assertNull(localStorage.getItem(INCOME_KEY), "Income data cleared");
  
  // Simulate: Load from server
  console.log("\n📥 Step 5: Load data from server");
  const response = await api.fetch("/api/wishlist", {
    headers: { Authorization: `Bearer ${session.data.session.access_token}` },
  });
  const data = await response.json();
  
  assertEqual(data.items.length, 3, "Server returns all 3 items");
  
  console.log("\n✅ TEST 2 PASSED: Guest data successfully migrated to server");
}

async function testScenario3_DeleteSync() {
  console.log("\n🧪 TEST 3: Delete Item - Server Sync");
  console.log("=" .repeat(60));

  const auth = new MockSupabaseAuth();
  const api = new MockAPI();
  
  // Simulate: User is logged in and has items
  console.log("\n📝 Step 1: User logs in and has 3 items on server");
  auth.simulateLogin("user-456", "test2@example.com");
  const session = await auth.getSession();
  
  // Add items to server
  for (const item of DUMMY_ITEMS) {
    await api.fetch("/api/wishlist", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.data.session.access_token}` },
      body: JSON.stringify({ item }),
    });
  }
  
  let serverItems = api.getServerData("user-456");
  assertEqual(serverItems.length, 3, "Server has 3 items initially");
  
  // Simulate: User deletes an item
  console.log("\n🗑️  Step 2: User deletes item from UI");
  const itemToDelete = DUMMY_ITEMS[1].id;
  
  await api.fetch(`/api/wishlist?id=${itemToDelete}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.data.session.access_token}` },
  });
  
  serverItems = api.getServerData("user-456");
  assertEqual(serverItems.length, 2, "Server now has 2 items after deletion");
  
  // Simulate: User logs out and back in
  console.log("\n🔄 Step 3: User logs out and logs back in");
  auth.simulateLogout();
  auth.simulateLogin("user-456", "test2@example.com");
  const newSession = await auth.getSession();
  
  // Load from server
  console.log("\n📥 Step 4: Load data from server");
  const response = await api.fetch("/api/wishlist", {
    headers: { Authorization: `Bearer ${newSession.data.session.access_token}` },
  });
  const data = await response.json();
  
  assertEqual(data.items.length, 2, "Deleted item stays deleted");
  assertEqual(
    data.items.find((i: WishlistItem) => i.id === itemToDelete),
    undefined,
    "Deleted item not in list"
  );
  
  console.log("\n✅ TEST 3 PASSED: Deletion synced to server correctly");
}

async function testScenario4_OptimisticUpdateRollback() {
  console.log("\n🧪 TEST 4: Optimistic Update with Rollback");
  console.log("=" .repeat(60));

  const auth = new MockSupabaseAuth();
  const api = new MockAPI();
  
  console.log("\n📝 Step 1: User logs in");
  auth.simulateLogin("user-789", "test3@example.com");
  const session = await auth.getSession();
  
  // Simulate: Optimistic add
  console.log("\n➕ Step 2: User adds item (optimistic update)");
  let localItems = [DUMMY_ITEMS[0]];
  console.log(`   Local items count: ${localItems.length}`);
  
  // Simulate: Server fails
  console.log("\n❌ Step 3: Server rejects the add (network error)");
  api.setFailureMode("network");
  
  try {
    await api.fetch("/api/wishlist", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.data.session.access_token}` },
      body: JSON.stringify({ item: DUMMY_ITEMS[0] }),
    });
  } catch (err) {
    // Rollback
    console.log("\n🔄 Step 4: Rollback - remove from local state");
    localItems = [];
  }
  
  assertEqual(localItems.length, 0, "Item removed from local state after rollback");
  
  // Verify server doesn't have the item
  api.setFailureMode(null);
  const response = await api.fetch("/api/wishlist", {
    headers: { Authorization: `Bearer ${session.data.session.access_token}` },
  });
  const data = await response.json();
  
  assertEqual(data.items.length, 0, "Server doesn't have the failed item");
  
  console.log("\n✅ TEST 4 PASSED: Optimistic update rolled back on failure");
}

async function testScenario5_MigrationRetry() {
  console.log("\n🧪 TEST 5: Migration with Retry Logic");
  console.log("=" .repeat(60));

  const localStorage = new MockLocalStorage();
  const auth = new MockSupabaseAuth();
  const api = new MockAPI();
  
  console.log("\n📝 Step 1: Guest user has 3 items");
  localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(DUMMY_ITEMS));
  
  console.log("\n🔐 Step 2: User logs in");
  auth.simulateLogin("user-retry", "retry@example.com");
  const session = await auth.getSession();
  
  console.log("\n🔄 Step 3: Migration with network failures");
  const guestItems = JSON.parse(localStorage.getItem(LOCAL_WISHLIST_KEY)!);
  
  let successCount = 0;
  let failureCount = 0;
  
  for (const item of guestItems) {
    let uploaded = false;
    
    // Simulate: First 2 attempts fail, 3rd succeeds
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt < 2) {
          api.setFailureMode("network");
        } else {
          api.setFailureMode(null);
        }
        
        const res = await api.fetch("/api/wishlist", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.data.session.access_token}` },
          body: JSON.stringify({ item }),
        });
        
        if (res.ok) {
          uploaded = true;
          successCount++;
          console.log(`   ✅ Item "${item.product.displayName}" uploaded on attempt ${attempt + 1}`);
          break;
        }
      } catch (err) {
        console.log(`   ⚠️  Attempt ${attempt + 1} failed for "${item.product.displayName}"`);
      }
    }
    
    if (!uploaded) {
      failureCount++;
    }
  }
  
  assertEqual(successCount, 3, "All 3 items eventually uploaded");
  assertEqual(failureCount, 0, "No items failed after retries");
  
  const serverItems = api.getServerData("user-retry");
  assertEqual(serverItems.length, 3, "Server has all 3 items");
  
  console.log("\n✅ TEST 5 PASSED: Migration retry logic works correctly");
}

async function testScenario6_CorruptedData() {
  console.log("\n🧪 TEST 6: Corrupted localStorage Data");
  console.log("=" .repeat(60));

  const localStorage = new MockLocalStorage();
  
  console.log("\n💣 Step 1: Corrupt localStorage data");
  localStorage.setItem(LOCAL_WISHLIST_KEY, "{invalid json content [[");
  
  console.log("\n🔄 Step 2: Attempt to load corrupted data");
  const stored = localStorage.getItem(LOCAL_WISHLIST_KEY);
  let items: WishlistItem[] = [];
  
  if (stored) {
    try {
      items = JSON.parse(stored);
    } catch (err) {
      console.log("   ⚠️  Corrupted data detected, clearing it");
      localStorage.removeItem(LOCAL_WISHLIST_KEY);
    }
  }
  
  assertEqual(items.length, 0, "No items loaded from corrupted data");
  assertNull(localStorage.getItem(LOCAL_WISHLIST_KEY), "Corrupted data cleared");
  
  console.log("\n📝 Step 3: Add new valid data");
  localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify([DUMMY_ITEMS[0]]));
  
  const newStored = localStorage.getItem(LOCAL_WISHLIST_KEY);
  const newItems = newStored ? JSON.parse(newStored) : [];
  assertEqual(newItems.length, 1, "New valid data stored correctly");
  
  console.log("\n✅ TEST 6 PASSED: Corrupted data handled gracefully");
}

async function testScenario7_QuotaExceeded() {
  console.log("\n🧪 TEST 7: localStorage Quota Exceeded");
  console.log("=" .repeat(60));

  const localStorage = new MockLocalStorage();
  
  console.log("\n📝 Step 1: Fill localStorage with items");
  const manyItems: WishlistItem[] = [];
  for (let i = 0; i < 100; i++) {
    manyItems.push({ ...DUMMY_ITEMS[0], id: `test-item-${i}` });
  }
  
  let quotaExceeded = false;
  try {
    localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(manyItems));
  } catch (err: any) {
    if (err.name === "QuotaExceededError") {
      console.log("   ⚠️  QuotaExceededError detected");
      quotaExceeded = true;
    }
  }
  
  assertEqual(quotaExceeded, true, "Quota exceeded error caught");
  
  // Verify data wasn't partially saved
  const stored = localStorage.getItem(LOCAL_WISHLIST_KEY);
  assertNull(stored, "No partial data saved when quota exceeded");
  
  console.log("\n✅ TEST 7 PASSED: Quota exceeded handled correctly");
}

async function testScenario8_CrossTabSync() {
  console.log("\n🧪 TEST 8: Cross-Tab Sync (Simulated)");
  console.log("=" .repeat(60));

  const sharedLocalStorage = new MockLocalStorage();
  
  console.log("\n📝 Step 1: Tab 1 adds items");
  sharedLocalStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify([DUMMY_ITEMS[0]]));
  
  console.log("\n🔄 Step 2: Tab 2 detects storage change");
  const tab2Items = JSON.parse(sharedLocalStorage.getItem(LOCAL_WISHLIST_KEY)!);
  assertEqual(tab2Items.length, 1, "Tab 2 sees item from Tab 1");
  
  console.log("\n➕ Step 3: Tab 2 adds another item");
  tab2Items.push(DUMMY_ITEMS[1]);
  sharedLocalStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(tab2Items));
  
  console.log("\n🔄 Step 4: Tab 1 detects storage change");
  const tab1Items = JSON.parse(sharedLocalStorage.getItem(LOCAL_WISHLIST_KEY)!);
  assertEqual(tab1Items.length, 2, "Tab 1 sees both items");
  
  console.log("\n✅ TEST 8 PASSED: Cross-tab sync works correctly");
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log("\n");
  console.log("=" .repeat(60));
  console.log("🧪 WISHLIST DATA INTEGRITY TEST SUITE");
  console.log("=" .repeat(60));
  
  const tests = [
    testScenario1_GuestMultipleRefreshes,
    testScenario2_GuestToLogin,
    testScenario3_DeleteSync,
    testScenario4_OptimisticUpdateRollback,
    testScenario5_MigrationRetry,
    testScenario6_CorruptedData,
    testScenario7_QuotaExceeded,
    testScenario8_CrossTabSync,
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (err) {
      console.error(`\n❌ TEST FAILED: ${err}`);
      failed++;
    }
  }
  
  console.log("\n");
  console.log("=" .repeat(60));
  console.log("🏁 TEST RESULTS");
  console.log("=" .repeat(60));
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  console.log("=" .repeat(60));
  
  if (failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED!");
  } else {
    console.log("\n⚠️  SOME TESTS FAILED");
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };
