# Data Integrity Issues Audit - Wishlist Data

**Date:** February 9, 2026  
**Severity:** CRITICAL + MEDIUM

---

## 🔴 CRITICAL Issues

### 1. **Item Deletion NOT Synced to Server**

**Location:** [app/page.tsx](app/page.tsx#L185-L192) - `handleRemove` function

**Issue:**
```typescript
const handleRemove = useCallback((id: string) => {
  setItems((prev) => prev.filter((i) => i.id !== id)); // ← Removes from UI only
  setSelectedIds((prev) => { /* ... */ });
  // ❌ NO API call to delete from server
}, [hoveredItemId]);
```

**Problem:**
1. User deletes item from wishlist (logged in)
2. Item removed from UI immediately
3. Item remains in Supabase database
4. User logs out and logs back in
5. Deleted item reappears 🔴

**Data Mismatch:**
```
Client state: [item1, item3]         (item2 deleted)
Server state: [item1, item2, item3]  (item2 still there)
Result:       ❌ Inconsistent data
```

**Missing API Endpoint:**
```
DELETE /api/wishlist/:itemId
  - Should accept itemId in body or URL
  - Verify ownership via JWT token
  - Delete from Supabase
```

---

### 2. **Deleted Items Resurrect on Next Login**

**Location:** [app/page.tsx](app/page.tsx#L56-L77) - `load()` function

**Flow:**
```
User deletes item A from UI
         ↓
User logs out (item A still on server)
         ↓
User logs back in
         ↓
load() calls GET /api/wishlist
         ↓
Server returns all items including deleted A
         ↓
UI displays deleted item again 🔴
```

---

### 3. **Optimistic Update Without Rollback**

**Location:** [app/page.tsx](app/page.tsx#L156-L182) - `handleAdd` function

**Issue:**
```typescript
const handleAdd = useCallback(async (item: WishlistItem) => {
  // ✅ Optimistic add
  setItems((prev) => [item, ...prev]);
  setSelectedIds((prev) => new Set(prev).add(item.id));
  
  // Try to persist to server
  const res = await fetch("/api/wishlist", {
    method: "POST",
    // ...
    body: JSON.stringify({ item }),
  });
  if (!res.ok) {
    // ❌ NO ROLLBACK - item stays in UI
    console.warn("Failed to persist wishlist item:", data.error);
  }
}, []);
```

**Problem:**
1. Item added to UI optimistically ✅
2. Network request fails (offline, server error, etc.)
3. Item stays in UI but never persisted to server ❌
4. On next login, item is gone (only server data loaded)
5. User thinks item is saved, but it's lost 🔴

---

### 4. **Duplicate Items During Migration**

**Location:** [app/page.tsx](app/page.tsx#L81-L120) - `migrateGuestDataToServer()` function

**Issue:**
```typescript
async function migrateGuestDataToServer() {
  const guestItems = JSON.parse(stored);
  
  for (const item of guestItems) {
    await fetch("/api/wishlist", {
      method: "POST",
      body: JSON.stringify({ item }),
    });
  }
  localStorage.removeItem(LOCAL_WISHLIST_KEY);
}
```

**Problem:**
1. Migration starts, uploads items to server
2. Halfway through, network fails
3. Some items uploaded (IDs saved in DB), others not
4. User refreshes or migration runs again
5. Previously uploaded items attempted to insert again
6. Database doesn't prevent duplicate IDs → INSERT fails, or updates existing row

**Database Schema Check:**
```sql
CREATE TABLE wishlist (
  id text PRIMARY KEY,  -- ← Prevents duplicates
  user_id uuid,
  product jsonb,
  created_at timestamptz
);
```

**Good news:** PRIMARY KEY prevents duplicates, but:
- Migration fails silently for duplicates
- No warning to user that items weren't all migrated
- User loses trust in data

---

### 5. **Corrupted localStorage Data Causes Silent Failure**

**Location:** [app/page.tsx](app/page.tsx#L39-L46) - Load guest data

**Issue:**
```typescript
const stored = localStorage.getItem(LOCAL_WISHLIST_KEY);
if (stored) {
  try {
    const parsed = JSON.parse(stored) as WishlistItem[];
    setItems(parsed);
  } catch {
    localStorage.removeItem(LOCAL_WISHLIST_KEY); // ✅ Cleaned up
  }
}
```

**Good:** Corruption is caught and file removed

**But what causes corruption?**
1. Browser crashes while writing to localStorage
2. Browser storage limit exceeded (truncated write)
3. User copies over corrupt localStorage data
4. Third-party scripts modify localStorage key

**Result:** User loses entire wishlist with no warning 🔴

---

## ⚠️ MEDIUM Issues

### 6. **No Cross-Tab Wishlist Sync**

**Issue:**
```
Tab 1: Adds item A
         ↓
Tab 2: Shows old list (no item A) yet
```

**Why:**
- localStorage updating doesn't trigger reactivity in other tabs
- Must listen to `storage` event

**Solution:** Already done for income, need for items too

---

### 7. **localStorage Quota Not Handled**

**Location:** [app/page.tsx](app/page.tsx#L229-L237)

**Code:**
```typescript
useEffect(() => {
  if (user) return;
  try {
    localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(items));
  } catch {
    // ← Silently fails if quota exceeded
  }
}, [items, user]);
```

**Problem:**
1. User adds many items with large pricing data
2. localStorage quota exceeded (typically 5-10MB)
3. `setItem` throws QuotaExceededError
4. Silently caught, no warning to user
5. User thinks data is saved, but it's not 🔴

---

### 8. **Selection State Lost on Refresh**

**Note:** This is expected behavior, not a bug, but UX issue

```typescript
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
// ← Never persisted to localStorage
```

**User Flow:**
1. User selects items for comparison
2. Refreshes page
3. Selection cleared
4. User frustrated ⚠️

---

### 9. **No Offline Queue for Added Items**

**Issue:**
```
User offline, adds item
         ↓
Item in localStorage ✅
         ↓
User closes browser tab WITHOUT signing in
         ↓
localStorage cleared (or not synced)
         ↓
Item lost 🔴
```

**Currently WORKS IF:**
- User stays logged in (auto-saves to server)
- User stays on same browser tab (localStorage persists)

**BREAKS IF:**
- User is guest and closes tab immediately
- localStorage not fully written before tab closes

---

### 10. **No Retry Logic for Failed Migrations**

**Issue:**
```typescript
for (const item of guestItems) {
  await fetch("/api/wishlist", {
    method: "POST",
    // ...
  });
  // ❌ If fails, loops continues with next item
  // ❌ No retry, no pause, no exponential backoff
}
```

---

## 📋 Summary Table

| Issue | Severity | Impact | When | Where |
|-------|----------|--------|------|-------|
| **Deletion not synced** | 🔴 CRITICAL | Deleted items reappear on login | Logged-in users | handleRemove |
| **Optimistic add rollback** | 🔴 CRITICAL | Added items lost on network error | All users | handleAdd |
| **Migration duplicates** | 🔴 CRITICAL | Migration fails silently | Guest→Login | migrateGuestDataToServer |
| **Corrupted localStorage** | 🔴 CRITICAL | Entire wishlist lost | Corrupted data | load() |
| **No cross-tab sync** | ⚠️ MEDIUM | Items not visible in other tabs | Multi-tab | N/A |
| **Quota exceeded** | ⚠️ MEDIUM | Items not saved | Large lists | localStorage.setItem |
| **Selection lost** | ⚠️ MEDIUM | UX issue | Refresh | selectedIds |
| **No offline queue** | ⚠️ MEDIUM | Items lost if tab closes | Offline guests | handleAdd |
| **No retry logic** | ⚠️ MEDIUM | Partial migration fails | Guest→Login | migrateGuestDataToServer |

---

## 🔧 Priority Fixes

### Priority 1: IMPLEMENT NOW 🔴

1. **Add DELETE endpoint for wishlist**
   ```typescript
   // Add to app/api/wishlist/route.ts
   export async function DELETE(request: NextRequest) {
     const itemId = new URL(request.url).searchParams.get("id");
     // Delete by item ID and user_id
     // Verify JWT token
   }
   ```

2. **Sync delete to server in handleRemove**
   ```typescript
   const handleRemove = useCallback(async (id: string) => {
     setItems((prev) => prev.filter((i) => i.id !== id));
     
     // Delete from server if logged in
     const token = session?.access_token;
     if (token) {
       await fetch(`/api/wishlist?id=${id}`, {
         method: "DELETE",
         headers: { Authorization: `Bearer ${token}` },
       });
     }
   }, []);
   ```

3. **Add rollback to handleAdd on failure**
   ```typescript
   const handleAdd = useCallback(async (item: WishlistItem) => {
     const previousItems = items; // Save current state
     setItems((prev) => [item, ...prev]); // Optimistic
     
     const res = await fetch("/api/wishlist", { method: "POST" });
     if (!res.ok) {
       setItems(previousItems); // ← ROLLBACK
       // Show error toast
       return;
     }
   }, [items]);
   ```

4. **Add retry logic to migration**
   ```typescript
   async function uploadItemWithRetry(item: WishlistItem, token: string, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const res = await fetch("/api/wishlist", {
           method: "POST",
           headers: { Authorization: `Bearer ${token}` },
           body: JSON.stringify({ item }),
         });
         if (res.ok) return true;
       } catch (err) {
         if (i < maxRetries - 1) {
           await new Promise(r => setTimeout(r, Math.pow(2, i) * 100)); // Backoff
         }
       }
     }
     return false;
   }
   ```

5. **Add localStorage quota warning**
   ```typescript
   useEffect(() => {
     if (user) return;
     try {
       localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(items));
     } catch (err: any) {
       if (err.name === "QuotaExceededError") {
         // Show warning modal
         console.warn("⚠️ Storage full: some items may not be saved");
       }
     }
   }, [items, user]);
   ```

### Priority 2: ENHANCE 

6. **Add cross-tab wishlist sync**
   ```typescript
   useEffect(() => {
     const handleStorageChange = (e: StorageEvent) => {
       if (e.key === LOCAL_WISHLIST_KEY) {
         try {
           const updatedItems = JSON.parse(e.newValue) as WishlistItem[];
           setItems(updatedItems);
         } catch {
           // Corrupted data
        }
       }
     };
     window.addEventListener("storage", handleStorageChange);
     return () => window.removeEventListener("storage", handleStorageChange);
   }, []);
   ```

7. **Persist selection state**
   ```typescript
   const SELECTION_KEY = "borderless-buy-selection";
   useEffect(() => {
     localStorage.setItem(SELECTION_KEY, JSON.stringify([...selectedIds]));
   }, [selectedIds]);
   
   // On mount:
   const saved = JSON.parse(localStorage.getItem(SELECTION_KEY) || "[]");
   setSelectedIds(new Set(saved));
   ```

8. **Add error toast component**
   ```tsx
   // Show feedback for failed operations
   // "Item deleted from server"
   // "Failed to save item - retrying..."
   // "Storage full - clear some items"
   ```

---

## Testing Checklist

- [ ] Add item while logged in, delete, login again → item should be gone
- [ ] Add item to guest list, close tab, reopen → items persist
- [ ] Add item online, go offline, refresh → item stays
- [ ] Add item, network error → item reverts to previous state
- [ ] Migrate guest items, network failure halfway → warning shown
- [ ] Add 1000+ items → quota warning appears
- [ ] Add item in Tab 1, check Tab 2 → sees new item
- [ ] Delete item in Tab 1, check Tab 2 → sees deletion
- [ ] Select items, refresh → selection preserved
- [ ] Corrupted localStorage → app recovers gracefully

---

## Impact Assessment

**High Risk - Could Cause:**
- Data loss (deleted items reappearing or disappearing)
- Duplicates in user's wishlist  
- Misalignment between client and server
- Reduced user trust

**Estimated Fixes:** 4-6 hours

---

**Status:** Ready for implementation
