# Contributing to Epplicon Technologies

Thank you for your interest in contributing to Epplicon Technologies! This document provides guidelines and instructions for contributing.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)

## 📜 Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a positive environment

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/epplicon.git`
3. Create a branch: `git checkout -b feature/your-feature-name`

## 🛠️ Development Setup

1. **Set up Firebase Configuration**
   - Copy `config.example.js` to `config.js`
   - Add your Firebase credentials (see README.md)

2. **Set up Local Server**
   - Use a local web server (Python, Node.js, or any static server)
   - Example with Python: `python -m http.server 8000`
   - Example with Node.js: `npx http-server`

3. **Test Your Changes**
   - Test in multiple browsers
   - Verify Firebase integration works
   - Check console for errors

## ✏️ Making Changes

### Before You Start
- Check existing issues and pull requests
- Create an issue if you're planning a major change
- Keep changes focused and atomic

### Coding Standards

- **JavaScript**: Use ES6+ features, follow existing code style
- **HTML**: Use semantic HTML5, maintain accessibility
- **CSS**: Follow existing naming conventions, use CSS variables
- **Comments**: Add comments for complex logic
- **Console Logs**: Remove debug console.logs before committing

### File Naming
- Use kebab-case for files: `invoice-pdf-generator.js`
- Use descriptive names that indicate purpose

## 🔄 Pull Request Process

1. **Update Documentation**
   - Update README.md if needed
   - Add comments to code if introducing new features

2. **Test Thoroughly**
   - Test all affected features
   - Test in different browsers
   - Verify no console errors

3. **Commit Messages**
   - Use clear, descriptive commit messages
   - Format: `type: description`
   - Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`

4. **Create Pull Request**
   - Provide clear description of changes
   - Reference related issues
   - Add screenshots if UI changes

## 📝 Code Review

- All PRs require review before merging
- Address review comments promptly
- Be open to feedback and suggestions

## 🐛 Reporting Bugs

- Use the GitHub issue tracker
- Include:
  - Clear description
  - Steps to reproduce
  - Expected vs actual behavior
  - Browser/OS information
  - Screenshots if applicable

## 💡 Feature Requests

- Open an issue with the `enhancement` label
- Describe the feature and use case
- Consider implementation complexity

## ❓ Questions?

Feel free to open an issue for questions or reach out to the maintainers.

Thank you for contributing! 🎉

