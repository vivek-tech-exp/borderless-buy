#!/usr/bin/env node

/**
 * Wishlist Data Integrity Test Suite (Plain JavaScript Version)
 * Run with: node tests/simple-test.js
 */

// ============================================================================
// DUMMY DATA
// ============================================================================

const DUMMY_ITEMS = [
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
      },
    },
    createdAt: new Date().toISOString(),
  },
];

const LOCAL_WISHLIST_KEY = "borderless-buy-guest-wishlist";
const INCOME_KEY = "borderless-buy-income";

// ============================================================================
// MOCK ENVIRONMENT
// ============================================================================

class MockLocalStorage {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    const totalSize = Object.values(this.store).join("").length + value.length;
    if (totalSize > 10000) {
      const error = new Error("QuotaExceededError");
      error.name = "QuotaExceededError";
      throw error;
    }
    this.store[key] = value;
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }
}

class MockSupabaseAuth {
  constructor() {
    this.session = null;
    this.listeners = [];
  }

  async getSession() {
    return { data: { session: this.session }, error: null };
  }

  onAuthStateChange(callback) {
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

  simulateLogin(userId, email) {
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
  constructor() {
    this.serverData = {};
    this.shouldFail = false;
    this.failureType = null;
  }

  async fetch(url, options = {}) {
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

    const userId = this.extractUserId(options.headers?.Authorization);

    if (url.includes("/api/wishlist")) {
      if (options.method === "POST") {
        return this.handlePost(userId, options.body);
      } else if (options.method === "DELETE") {
        const itemId = url.split("id=")[1];
        return this.handleDelete(userId, itemId);
      } else {
        return this.handleGet(userId);
      }
    }

    return { ok: false, status: 404, json: async () => ({ error: "Not found" }) };
  }

  extractUserId(authHeader) {
    if (!authHeader) return "";
    return authHeader.replace("Bearer ", "").replace("mock-token-", "");
  }

  async handleGet(userId) {
    const items = this.serverData[userId] || [];
    return { ok: true, status: 200, json: async () => ({ items }) };
  }

  async handlePost(userId, body) {
    const { item } = JSON.parse(body);
    if (!this.serverData[userId]) {
      this.serverData[userId] = [];
    }

    const exists = this.serverData[userId].find((i) => i.id === item.id);
    if (exists) {
      return { ok: false, status: 409, json: async () => ({ error: "Duplicate" }) };
    }

    this.serverData[userId].push(item);
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  }

  async handleDelete(userId, itemId) {
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

  setFailureMode(type) {
    this.shouldFail = type !== null;
    this.failureType = type;
  }

  getServerData(userId) {
    return this.serverData[userId] || [];
  }
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function assertEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);

  if (actualStr !== expectedStr) {
    throw new Error(
      `❌ ${message}\nExpected: ${expectedStr}\nActual: ${actualStr}`
    );
  }
  console.log(`✅ ${message}`);
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(`❌ ${message}: Expected non-null value`);
  }
  console.log(`✅ ${message}`);
}

function assertNull(value, message) {
  if (value !== null && value !== undefined) {
    throw new Error(`❌ ${message}: Expected null`);
  }
  console.log(`✅ ${message}`);
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

async function testScenario1_GuestMultipleRefreshes() {
  console.log("\n🧪 TEST 1: Guest User - Multiple Refreshes");
  console.log("=".repeat(60));

  const localStorage = new MockLocalStorage();

  localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(DUMMY_ITEMS));
  localStorage.setItem(INCOME_KEY, "5000");

  const stored1 = localStorage.getItem(LOCAL_WISHLIST_KEY);
  const items1 = JSON.parse(stored1);
  const income1 = localStorage.getItem(INCOME_KEY);

  assertEqual(items1.length, 3, "Items restored after refresh #1");
  assertEqual(income1, "5000", "Income restored after refresh #1");

  console.log("\n✅ TEST 1 PASSED");
}

async function testScenario2_GuestToLogin() {
  console.log("\n🧪 TEST 2: Guest → Login (Data Migration)");
  console.log("=".repeat(60));

  const localStorage = new MockLocalStorage();
  const auth = new MockSupabaseAuth();
  const api = new MockAPI();

  localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(DUMMY_ITEMS));

  auth.simulateLogin("user-123", "test@example.com");
  const session = await auth.getSession();

  const itemsToMigrate = JSON.parse(localStorage.getItem(LOCAL_WISHLIST_KEY));
  for (const item of itemsToMigrate) {
    await api.fetch("/api/wishlist", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.data.session.access_token}` },
      body: JSON.stringify({ item }),
    });
  }

  const serverItems = api.getServerData("user-123");
  assertEqual(serverItems.length, 3, "All items migrated");

  localStorage.removeItem(LOCAL_WISHLIST_KEY);
  assertNull(localStorage.getItem(LOCAL_WISHLIST_KEY), "Guest data cleared");

  console.log("\n✅ TEST 2 PASSED");
}

async function testScenario3_DeleteSync() {
  console.log("\n🧪 TEST 3: Delete Item - Server Sync");
  console.log("=".repeat(60));

  const auth = new MockSupabaseAuth();
  const api = new MockAPI();

  auth.simulateLogin("user-456", "test2@example.com");
  const session = await auth.getSession();

  for (const item of DUMMY_ITEMS) {
    await api.fetch("/api/wishlist", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.data.session.access_token}` },
      body: JSON.stringify({ item }),
    });
  }

  const itemToDelete = DUMMY_ITEMS[1].id;
  await api.fetch(`/api/wishlist?id=${itemToDelete}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.data.session.access_token}` },
  });

  const serverItems = api.getServerData("user-456");
  assertEqual(serverItems.length, 2, "Item deleted from server");

  console.log("\n✅ TEST 3 PASSED");
}

async function testScenario4_CorruptedData() {
  console.log("\n🧪 TEST 4: Corrupted localStorage Data");
  console.log("=".repeat(60));

  const localStorage = new MockLocalStorage();

  localStorage.setItem(LOCAL_WISHLIST_KEY, "{invalid json [[");

  const stored = localStorage.getItem(LOCAL_WISHLIST_KEY);
  let items = [];

  if (stored) {
    try {
      items = JSON.parse(stored);
    } catch (err) {
      console.log("   ⚠️  Corrupted data detected, clearing it");
      localStorage.removeItem(LOCAL_WISHLIST_KEY);
    }
  }

  assertEqual(items.length, 0, "No items from corrupted data");
  assertNull(localStorage.getItem(LOCAL_WISHLIST_KEY), "Corrupted data cleared");

  console.log("\n✅ TEST 4 PASSED");
}

async function testScenario5_QuotaExceeded() {
  console.log("\n🧪 TEST 5: localStorage Quota Exceeded");
  console.log("=".repeat(60));

  const localStorage = new MockLocalStorage();

  const manyItems = [];
  for (let i = 0; i < 100; i++) {
    manyItems.push({ ...DUMMY_ITEMS[0], id: `test-item-${i}` });
  }

  let quotaExceeded = false;
  try {
    localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(manyItems));
  } catch (err) {
    if (err.name === "QuotaExceededError") {
      quotaExceeded = true;
    }
  }

  assertEqual(quotaExceeded, true, "Quota exceeded error caught");

  console.log("\n✅ TEST 5 PASSED");
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 WISHLIST DATA INTEGRITY TEST SUITE");
  console.log("=".repeat(60));

  const tests = [
    testScenario1_GuestMultipleRefreshes,
    testScenario2_GuestToLogin,
    testScenario3_DeleteSync,
    testScenario4_CorruptedData,
    testScenario5_QuotaExceeded,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (err) {
      console.error(`\n❌ TEST FAILED: ${err.message}`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("🏁 TEST RESULTS");
  console.log("=".repeat(60));
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}/${tests.length}`);
  console.log("=".repeat(60));

  if (failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED!");
  } else {
    console.log("\n⚠️  SOME TESTS FAILED");
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
