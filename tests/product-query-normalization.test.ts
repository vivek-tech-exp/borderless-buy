import assert from "node:assert/strict";
import { hasDuplicateWishlistQuery, isMeaningfulProductQuery, normalizeProductQuery } from "../app/lib/product-query.ts";
import type { WishlistItem } from "../types/index.ts";

function makeItem(params: { id: string; name: string; displayName?: string }): WishlistItem {
  return {
    id: params.id,
    product: {
      id: params.id,
      name: params.name,
      displayName: params.displayName ?? params.name,
      category: "tech",
      carryOnFriendly: true,
      pricing: {},
    },
    createdAt: new Date().toISOString(),
  };
}

const normalizedEmoji = normalizeProductQuery("iphone 15 pro 📱");
assert.equal(normalizedEmoji, "iphone 15 pro");

const normalizedInvisible = normalizeProductQuery("iphone\u200b 15  pro");
assert.equal(normalizedInvisible, "iphone 15 pro");

const normalizedSeparators = normalizeProductQuery("MacBook---Pro///M4");
assert.equal(normalizedSeparators, "macbook pro m4");

assert.equal(isMeaningfulProductQuery(normalizeProductQuery("!!")), false);
assert.equal(isMeaningfulProductQuery(normalizeProductQuery("tv")), true);

const existingItems = [
  makeItem({
    id: "iphone-16-pro",
    name: "iPhone 16 Pro",
    displayName: "iPhone 16 Pro 256GB",
  }),
];

assert.equal(hasDuplicateWishlistQuery(existingItems, normalizeProductQuery("iphone 16 pro 📱")), true);
assert.equal(hasDuplicateWishlistQuery(existingItems, normalizeProductQuery("steam deck oled")), false);

console.log("Product query normalization tests passed.");
