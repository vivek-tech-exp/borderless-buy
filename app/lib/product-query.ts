import type { WishlistItem } from "@/types";

const INVISIBLE_CHARACTERS_REGEX = /[\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180d\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu;
const EMOJI_REGEX = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F]/gu;
const NON_ALPHANUMERIC_REGEX = /[^\p{L}\p{N}]+/gu;
const WHITESPACE_REGEX = /\s+/gu;
const LETTER_OR_NUMBER_REGEX = /[\p{L}\p{N}]/u;
const LETTER_OR_NUMBER_GLOBAL_REGEX = /[\p{L}\p{N}]/gu;

export function normalizeProductQuery(query: string): string {
  return query
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(INVISIBLE_CHARACTERS_REGEX, "")
    .replace(EMOJI_REGEX, "")
    .replace(NON_ALPHANUMERIC_REGEX, " ")
    .replace(WHITESPACE_REGEX, " ")
    .trim();
}

export function isMeaningfulProductQuery(normalizedQuery: string): boolean {
  if (!normalizedQuery || !LETTER_OR_NUMBER_REGEX.test(normalizedQuery)) {
    return false;
  }

  const compact = normalizedQuery.replace(WHITESPACE_REGEX, "");
  const alphanumericCount = (compact.match(LETTER_OR_NUMBER_GLOBAL_REGEX) ?? []).length;

  return compact.length >= 2 && alphanumericCount >= 2;
}

function getProductQueryCandidates(item: WishlistItem): string[] {
  return [
    item.product.displayName,
    item.product.name,
    item.product.id.replace(/-/g, " "),
  ];
}

export function hasDuplicateWishlistQuery(items: WishlistItem[], normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return false;
  }

  return items.some((item) =>
    getProductQueryCandidates(item).some((candidate) => normalizeProductQuery(candidate) === normalizedQuery)
  );
}
