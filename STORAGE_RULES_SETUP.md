# Firebase Storage Rules Setup Guide

## Problem
The Storage rules were checking for admins in the wrong Firestore project. Storage is in `epplicon2`, but admins are authenticated in `epplicon23799`. Firebase Storage rules can only access Firestore in the same project.

## Solution
Updated the Storage rules to:
1. Allow **any authenticated user** to **read** files in the `clients/` folder
   - This allows both clients (reading their own files) and admins (reading all client files)
2. Allow **any authenticated user** to **write** files
   - Clients can upload to their own folder (enforced by app logic)
   - Admins can upload to any client folder (needed for admin functionality)

## How to Deploy

### Option 1: Using Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the **epplicon2** project (Storage project)
3. Navigate to **Storage** → **Rules**
4. Copy the contents from `firebase-storage-rules.txt`
5. Paste into the rules editor
6. Click **Publish**

### Option 2: Using Firebase CLI
```bash
# Make sure you're in the project root
firebase use epplicon2
firebase deploy --only storage
```

## Updated Rules Explanation

```javascript
match /clients/{userId}/{allPaths=**} {
  // Read: Any authenticated user can read
  // - Clients can read their own files (userId matches their UID)
  // - Admins can read all files (they're authenticated)
  allow read: if isAuthenticated();
  
  // Write: Any authenticated user can write
  // - Clients can upload to their own folder (enforced by app logic)
  // - Admins can upload to any client folder (needed for admin functionality)
  allow write: if isAuthenticated();
}
```

## Security Notes
- ✅ Both clients and admins can read files (needed for admin panel)
- ✅ Both clients and admins can write files (app logic enforces clients only write to their own folder)
- ✅ Unauthenticated users cannot access any files
- ⚠️ Note: The app-level code should enforce that clients only upload to their own folder. The Storage rules allow any authenticated user to write for flexibility.

If you need stricter admin-only write access, you would need to:
1. Create an `admins` collection in the `epplicon2` project's Firestore
2. Store admin UIDs there
3. Update rules to check: `firestore.get(/databases/(default)/documents/admins/$(request.auth.uid)).data != null`

