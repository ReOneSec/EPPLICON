# Setup Guide - Epplicon Technologies

This guide will walk you through setting up the Epplicon Technologies project from scratch.

## 📋 Prerequisites

- A modern web browser
- A Firebase account (free tier is sufficient)
- Basic knowledge of HTML, CSS, and JavaScript
- A code editor (VS Code recommended)

## 🔥 Firebase Setup

### Step 1: Create Firebase Projects

You need **two Firebase projects**:

1. **Project 1** - For Database and Authentication
2. **Project 2** - For File Storage (to avoid CORS issues)

#### Create Project 1:
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name it (e.g., "epplicon-main")
4. Enable Google Analytics (optional)
5. Click "Create project"

#### Create Project 2:
1. Click "Add project" again
2. Name it (e.g., "epplicon-storage")
3. Enable Google Analytics (optional)
4. Click "Create project"

### Step 2: Enable Firebase Services

#### For Project 1 (Main):
1. Go to **Authentication** → Enable "Email/Password"
2. Go to **Firestore Database** → Create database → Start in test mode
3. Go to **Storage** → Get started → Start in test mode

#### For Project 2 (Storage):
1. Go to **Storage** → Get started → Start in test mode

### Step 3: Get Firebase Configuration

#### For Project 1:
1. Go to Project Settings (gear icon)
2. Scroll to "Your apps"
3. Click the web icon (`</>`)
4. Register app (name it "Web")
5. Copy the configuration object

#### For Project 2:
1. Switch to Project 2
2. Repeat the same steps
3. Copy the configuration object

### Step 4: Configure the Application

1. Copy `config.example.js` to `config.js`:
   ```bash
   cp config.example.js config.js
   ```

2. Open `config.js` and paste your Firebase configurations:
   ```javascript
   export const firebaseConfig_DB_AUTH = {
     // Paste Project 1 config here
   };

   export const firebaseConfig_STORAGE = {
     // Paste Project 2 config here
   };
   ```

## 🗄️ Firestore Collections Setup

Create these collections in **Project 1's Firestore**:

### 1. `clients` Collection
Structure:
```
clients/
  {clientId}/
    - name: string
    - email: string
    - uid: string (Firebase Auth UID)
    - whatsappNumber: string
    - countryCode: string
    - address: string
    - createdAt: timestamp
```

### 2. `authors` Collection
Structure:
```
authors/
  {authorId}/
    - name: string
    - email: string
    - displayName: string
    - whatsappNumber: string (optional)
    - phone: string (optional)
    - createdAt: timestamp
```

### 3. `invoices` Collection
Structure:
```
invoices/
  {invoiceId}/
    - invoiceNumber: string
    - clientId: string
    - amount: number
    - date: timestamp
    - dueDate: timestamp
    - status: string ("PENDING" | "PAID" | "OVERDUE")
    - projectName: string
    - notes: string
    - items: array
    - createdAt: timestamp
```

### 4. `projects` Collection
Structure:
```
projects/
  {projectId}/
    - clientId: string
    - name: string
    - description: string
    - status: string
    - createdAt: timestamp
```

### 5. `posts` Collection (for blog)
Structure:
```
posts/
  {postId}/
    - title: string
    - content: string
    - authorId: string
    - categoryId: string
    - published: boolean
    - createdAt: timestamp
```

### 6. `categories` Collection (for blog)
Structure:
```
categories/
  {categoryId}/
    - name: string
    - slug: string
    - createdAt: timestamp
```

## 🔒 Security Rules Setup

### Firestore Rules (Project 1)

1. Go to **Firestore Database** → **Rules**
2. Copy rules from `FIREBASE_SECURITY_RULES.md`
3. Paste and publish

### Storage Rules (Project 2)

1. Go to **Storage** → **Rules**
2. Copy rules from `firebase-storage-rules.txt`
3. Paste and publish

**Important**: Review and customize rules based on your security requirements.

## 👤 Create Admin User

### Method 1: Through Firebase Console
1. Go to **Authentication** in Project 1
2. Click "Add user"
3. Enter email and password
4. Note the UID

### Method 2: Through Application
1. Run the application
2. Register a user through the admin panel
3. Note the UID

### Add to Authors Collection
1. Go to **Firestore** → `authors` collection
2. Create a document with the UID as document ID
3. Add fields:
   ```json
   {
     "name": "Admin Name",
     "email": "admin@example.com",
     "displayName": "Admin Name"
   }
   ```

## 🚀 Running the Application

### Option 1: Local Web Server

**Python:**
```bash
python -m http.server 8000
```

**Node.js:**
```bash
npx http-server
```

**PHP:**
```bash
php -S localhost:8000
```

### Option 2: VS Code Live Server
1. Install "Live Server" extension
2. Right-click `index.html`
3. Select "Open with Live Server"

### Option 3: Firebase Hosting
```bash
firebase init hosting
firebase deploy
```

## ✅ Verification Checklist

- [ ] Firebase projects created
- [ ] Services enabled (Auth, Firestore, Storage)
- [ ] `config.js` file created with credentials
- [ ] Firestore collections created
- [ ] Security rules applied
- [ ] Admin user created and added to `authors` collection
- [ ] Application runs locally
- [ ] Can login to admin panel
- [ ] Can create a client
- [ ] Can generate an invoice PDF

## 🐛 Troubleshooting

### Issue: "Firebase: Error (auth/unauthorized-domain)"
- Add your domain to Firebase Authentication → Settings → Authorized domains

### Issue: "Permission denied" in Firestore
- Check security rules
- Verify user is authenticated
- Check user has proper permissions

### Issue: PDF generation fails
- Check browser console for errors
- Verify html2pdf.js library loads
- Check CORS settings for images

### Issue: Files not uploading
- Check Storage rules
- Verify Project 2 configuration
- Check file size limits

## 📚 Next Steps

- Read `README.md` for feature documentation
- Review `FIREBASE_SECURITY_RULES.md` for security best practices
- Check `CONTRIBUTING.md` if you want to contribute

## 🆘 Need Help?

- Check existing GitHub issues
- Review Firebase documentation
- Contact: info@epplicon.net

---

**Important**: Never commit `config.js` to version control. It contains sensitive credentials.

