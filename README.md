# Epplicon Technologies - Client Portal & Admin Panel

A comprehensive web application featuring a client portal, admin panel, blog system, and invoice management with PDF generation capabilities.

## 🚀 Features

### Client Portal
- **Dashboard**: Overview of projects, invoices, and communications
- **Project Management**: Track project progress and milestones
- **Invoice Management**: View and download invoices as PDF
- **File Sharing**: Secure file upload and download
- **Messaging**: Direct communication with the team
- **Feature Requests**: Submit and track feature requests

### Admin Panel
- **Client Management**: Add, edit, and manage clients
- **Invoice Generation**: Create and manage invoices with PDF export
- **Project Management**: Oversee all client projects
- **Blog Management**: Create and manage blog posts with rich text editor
- **Analytics**: Dashboard with statistics and charts
- **File Management**: Organize and manage client files

### Invoice PDF Generator
- **Premium Design**: Modern, clean, and professional invoice templates
- **A4 Format**: Standard A4 size (210mm × 297mm) PDF generation
- **Dynamic Data**: Automatically fetches client and biller information
- **Single Page**: Optimized to fit on one page
- **Clickable Links**: Email and website links are clickable in PDF

## 📋 Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase account with two projects:
  - Project 1: For Database and Authentication
  - Project 2: For File Storage

## ⚡ Quick Start

1. **Clone and configure**
   ```bash
   git clone https://github.com/yourusername/epplicon.git
   cd epplicon
   cp config.example.js config.js
   # Edit config.js with your Firebase credentials
   ```

2. **Follow the detailed setup guide**
   - See [SETUP.md](SETUP.md) for complete installation instructions
   - Includes Firebase setup, collections, and security rules

## 🛠️ Installation

For detailed installation instructions, please see [SETUP.md](SETUP.md).

**Quick Summary:**
1. Clone the repository
2. Copy `config.example.js` to `config.js` and add your Firebase credentials
3. Set up Firebase projects (2 projects needed)
4. Create Firestore collections
5. Apply security rules
6. Create admin user
7. Deploy to your preferred hosting service

## 📁 Project Structure

```
epplicon/
├── assets/
│   ├── css/          # Stylesheets
│   └── js/           # JavaScript modules
│       ├── invoice-pdf-generator.js  # PDF generation module
│       ├── admin-client-portal.js   # Admin portal logic
│       └── client-portal.js          # Client portal logic
├── img/              # Images
├── admin.html        # Admin panel
├── client-portal.html # Client portal
├── index.html        # Main website
├── config.js         # Firebase configuration (not in repo)
├── config.example.js # Configuration template
└── README.md         # This file
```

## 🔐 Security

- **Never commit `config.js`** - It contains sensitive Firebase credentials
- The `.gitignore` file is configured to exclude sensitive files
- Always use environment variables or secure configuration management in production
- Review and apply Firebase Security Rules before deploying

## 📝 Usage

### For Clients
1. Navigate to `client-portal.html`
2. Register or login with your credentials
3. Access your dashboard, projects, invoices, and files
4. Download invoices as PDF directly from the portal

### For Admins
1. Navigate to `admin.html`
2. Login with admin credentials
3. Manage clients, create invoices, and oversee projects
4. Generate and download invoice PDFs

### Invoice PDF Generation
The invoice PDF generator (`assets/js/invoice-pdf-generator.js`) provides:
- Automatic client data fetching from Firestore
- Biller information retrieval from admin profiles
- Premium A4 invoice template
- Single-page PDF output
- Clickable email and website links

## 🛡️ Firebase Security Rules

See `FIREBASE_SECURITY_RULES.md` for detailed Firestore security rules. Key points:
- Clients can only access their own data
- Admins have full access
- Invoices are accessible by both clients and admins
- Proper authentication is required for all operations

## 🧪 Testing

1. **Test Client Portal**:
   - Register a new client account
   - Login and verify dashboard loads
   - Check invoice PDF generation

2. **Test Admin Panel**:
   - Login with admin credentials
   - Create a new client
   - Generate an invoice
   - Download invoice PDF

3. **Test PDF Generation**:
   - Generate invoice from admin panel
   - Generate invoice from client portal
   - Verify PDF contains all information
   - Check that PDF is single page

## 📚 Technologies Used

- **HTML5** - Structure
- **CSS3** - Styling with modern features
- **JavaScript (ES6+)** - Client-side logic
- **Firebase** - Backend services:
  - Firestore - Database
  - Authentication - User management
  - Storage - File storage
- **html2pdf.js** - PDF generation
- **Poppins Font** - Typography

## 📖 Documentation

- **[PROJECT_REPORT.md](PROJECT_REPORT.md)** ⭐ - **Comprehensive project report with all features highlighted**
- **[SETUP.md](SETUP.md)** - Complete setup guide with step-by-step instructions
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Guidelines for contributing to the project
- **[FIREBASE_SECURITY_RULES.md](FIREBASE_SECURITY_RULES.md)** - Firebase security rules documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Authors

- **Epplicon Technologies** - Initial work

## 🙏 Acknowledgments

- Firebase for backend services
- html2pdf.js for PDF generation
- Poppins font by Google Fonts

## 📞 Support

For support, email info@epplicon.net or visit [www.epplicon.net](https://www.epplicon.net)

---

**Note**: Make sure to set up your Firebase configuration in `config.js` before running the application. Never commit `config.js` to version control.

