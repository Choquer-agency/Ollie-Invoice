<!-- 38b4900f-b9f2-4bc7-9a09-02dd7a5b027f 409f3870-a79e-4ee2-b0f9-8ae825cfc60c -->
# Fix Logo Storage and Signup Data Persistence

## Problem Analysis

### Issue 1: Logo Not Displaying (404 Error)

**Current behavior:** Logo URL is stored as `/objects/private/uploads/...` (relative path)
**Expected:** Should be full Supabase URL like `https://...supabase.co/storage/v1/object/public/Logos/private/uploads/...`

**Root cause:** The `trySetObjectEntityAclPolicy` function in [`server/objectStorage.ts`](server/objectStorage.ts) is normalizing URLs by stripping the domain, returning only the path portion.

### Issue 2: Currency and Other Step 2 Data Not Saved

**Current behavior:** Currency reverts to USD even when user selects CAD during signup
**Expected:** All step 2 data (currency, phone, address, tax types) should persist

**Root cause:** Need to verify the signup step 2 submission in [`client/src/pages/Login.tsx`](client/src/pages/Login.tsx) is correctly passing all data to the backend endpoint.

## Implementation Plan

### 1. Fix Logo URL Storage (Priority: High)

**Update [`server/objectStorage.ts`](server/objectStorage.ts):**

- Modify `trySetObjectEntityAclPolicy` to return the full public URL instead of just the path
- Keep the domain: `https://PROJECT_ID.supabase.co/storage/v1/object/public/BUCKET/path`
- Handle both full URLs and relative paths as input

**Expected result:** Logo URLs stored as full public URLs that browsers can load directly

### 2. Fix Settings Page Logo Display

**Update [`client/src/pages/Settings.tsx`](client/src/pages/Settings.tsx):**

- Ensure the image src uses the full URL from `business.logoUrl`
- Remove any path manipulation that might break full URLs
- The rectangular container display is already correct from previous fixes

### 3. Verify and Fix Signup Step 2 Data Persistence

**Check [`client/src/pages/Login.tsx`](client/src/pages/Login.tsx) `handleStep2Submit`:**

- Verify currency field is included in the API request body
- Verify phone and address fields are included
- Check that the `/api/auth/signup-complete` endpoint receives all step 2 data

**Check [`server/routes.ts`](server/routes.ts) `/api/auth/signup-complete` endpoint:**

- Verify it's saving currency to the business record
- Verify it's saving phone and address
- Add console logging to confirm data is received and saved

### 4. Add Debugging and Logging

**Add console logs:**

- Log the logo URL before and after transformation
- Log the business data being saved in step 2
- Log what currency value is being saved to database

## Files to Modify

1. [`server/objectStorage.ts`](server/objectStorage.ts) - Fix URL storage
2. [`client/src/pages/Settings.tsx`](client/src/pages/Settings.tsx) - Ensure proper URL display
3. [`client/src/pages/Login.tsx`](client/src/pages/Login.tsx) - Verify step 2 data submission
4. [`server/routes.ts`](server/routes.ts) - Verify step 2 data is saved

## Testing Checklist

After fixes:

- [ ] Create new account with logo upload
- [ ] Verify logo displays in Settings immediately after signup
- [ ] Upload new logo in Settings, verify it displays
- [ ] Select CAD currency in signup, verify it persists in Settings
- [ ] Add phone/address in signup, verify they appear in Settings

### To-dos

- [ ] Update objectStorage.ts to return full public URLs instead of relative paths
- [ ] Ensure Settings page properly displays logos using full URLs
- [ ] Check and fix signup step 2 data (currency, phone, address) submission
- [ ] Verify backend properly saves all step 2 data to database
- [ ] Test complete signup flow with logo and currency to verify all fixes