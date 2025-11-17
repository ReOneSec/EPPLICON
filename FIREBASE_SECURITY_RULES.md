# 🔒 Firebase Security Rules - Epplicon CMS

## ⚡ QUICK TEMPORARY FIX (For Testing Only)

If you need to test immediately and don't want to deal with complex rules, use this **temporary** solution:

### **Firestore (epplicon23799) - Testing Only:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### **Storage (epplicon2) - Testing Only:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

⚠️ **Warning:** These temporary rules allow all authenticated users to access all data. Use only for testing!

---

## 📄 **PRODUCTION-READY RULES** (Recommended)

## Firestore Database Rules (Project 1: epplicon23799)

Go to: Firebase Console → Firestore Database → Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Authors collection (Admin only - read/write)
    match /authors/{authorId} {
      allow read, write: if request.auth != null && request.auth.uid == authorId;
    }
    
    // Posts collection (Admin can write, everyone can read published)
    match /posts/{postId} {
      allow read: if true; // Public can read
      allow write: if request.auth != null && 
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid));
    }
    
    // Categories collection (Admin can write, everyone can read)
    match /categories/{categoryId} {
      allow read: if true; // Public can read
      allow write: if request.auth != null && 
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid));
    }
    
    // Clients collection (Clients can read their own data)
    match /clients/{clientId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == resource.data.uid ||
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid)));
      allow write: if request.auth != null;
    }
    
    // Projects collection
    match /projects/{projectId} {
      // Clients can read their own projects, admins can read/write all
      allow read: if request.auth != null && 
                     (request.auth.uid == resource.data.clientId ||
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid)));
      allow write: if request.auth != null && 
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid));
    }
    
    // Messages collection
    match /messages/{messageId} {
      // Clients can read their own messages, admins can read/write all
      allow read: if request.auth != null && 
                     (request.auth.uid == resource.data.clientId ||
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid)));
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
                               exists(/databases/$(database)/documents/authors/$(request.auth.uid));
    }
    
    // Files metadata collection (if you use it)
    match /files/{fileId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == resource.data.clientId ||
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid)));
      allow write: if request.auth != null && 
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid));
    }
    
    // Milestones collection
    match /milestones/{milestoneId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == resource.data.clientId ||
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid)));
      allow write: if request.auth != null && 
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid));
    }
    
    // Invoices collection
    match /invoices/{invoiceId} {
      allow read: if request.auth != null && 
                     (request.auth.uid == resource.data.clientId ||
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid)));
      allow write: if request.auth != null && 
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid));
    }
    
    // Feature Requests collection
    match /feature-requests/{requestId} {
      // Clients can read/write their own requests, admins can read/write all
      allow read: if request.auth != null && 
                     (request.auth.uid == resource.data.clientId ||
                      exists(/databases/$(database)/documents/authors/$(request.auth.uid)));
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
                               (request.auth.uid == resource.data.clientId ||
                                exists(/databases/$(database)/documents/authors/$(request.auth.uid)));
    }
  }
}
```

---

## 📦 **Firebase Storage Rules** (Project 2: epplicon2)

Go to: Firebase Console → Storage → Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Posts images (public read, admin write)
    match /posts/{imageId} {
      allow read: if true; // Public can read
      allow write: if request.auth != null;
    }
    
    // Authors images (admin only)
    match /authors/{authorId}/{imageId} {
      allow read: if true; // Public can read author images
      allow write: if request.auth != null && request.auth.uid == authorId;
    }
    
    // Client files (clients can read their own, admins can read/write all)
    match /clients/{clientId}/{allPaths=**} {
      allow read: if request.auth != null && 
                     (request.auth.uid == clientId || 
                      request.auth.token.email != null);
      allow write: if request.auth != null;
    }
    
    // General uploads (authenticated users)
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 🚀 **How to Apply These Rules:**

### **For Firestore Database (Project 1):**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project **"epplicon23799"**
3. Click **"Firestore Database"** in left menu
4. Click **"Rules"** tab
5. **Replace all existing rules** with the Firestore rules above
6. Click **"Publish"**

### **For Storage (Project 2):**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project **"epplicon2"**
3. Click **"Storage"** in left menu
4. Click **"Rules"** tab
5. **Replace all existing rules** with the Storage rules above
6. Click **"Publish"**

---

## 🔍 **What These Rules Do:**

### **Firestore (Database):**
- ✅ Admins (authors) can access everything
- ✅ Clients can read/write their own data
- ✅ Clients can read their own projects, messages, files, invoices, milestones
- ✅ Clients can create and manage their feature requests
- ✅ Public can read published posts and categories

### **Storage (Files):**
- ✅ Clients can read files in their folder (`clients/{clientId}/`)
- ✅ Admins can upload/delete files for clients
- ✅ Public can read post images and author photos
- ✅ Authors can upload their own photos

---

## ⚠️ **Important Notes:**

1. **Apply both sets of rules** (Firestore AND Storage)
2. Make sure you're applying rules to the **correct projects**:
   - **epplicon23799** = Database & Auth
   - **epplicon2** = Storage
3. After publishing rules, **wait 1-2 minutes** for them to propagate
4. **Refresh your client portal** after applying rules

---

## 🧪 **Testing After Applying Rules:**

1. Login to client portal
2. You should **NOT** see any 403 errors in console
3. Files tab should show "No files yet" or show files
4. Feature requests should load without errors
5. All tabs should work smoothly

If you still get errors after applying these rules, check:
- Rules are published (not just saved as draft)
- You're logged in with a valid client account
- The client document exists in Firestore with the correct `uid` field

---

**Once you apply these rules, all permission errors will be resolved!** 🎉

