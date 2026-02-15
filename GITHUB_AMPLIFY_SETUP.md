# 🚀 Deploy KidTrackerApp via GitHub to AWS Amplify

## Complete Setup Guide

---

## Step 1: Create GitHub Repository ✅

**I've opened GitHub for you. Now:**

1. On the GitHub page that opened:
   - **Repository name:** `kidtracker-app`
   - **Visibility:** Private (recommended)
   - **Don't check any boxes** (README, .gitignore, license)
   - Click **"Create repository"**

2. After creating, GitHub shows you a URL like:
   ```
   https://github.com/YOUR_USERNAME/kidtracker-app.git
   ```
   **Copy this URL!** You'll need it next.

---

## Step 2: Push Code to GitHub

### Option A: Using Git Bash (Recommended)

Open Git Bash in your project folder and run:

```bash
cd "c:/Users/thoma/Downloads/KidTracker-main/KidTracker-main"

# Add your GitHub repo (replace YOUR_USERNAME with your actual username)
git remote add origin https://github.com/YOUR_USERNAME/kidtracker-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Option B: Using PowerShell

Open PowerShell and run:

```powershell
cd "c:/Users/thoma/Downloads/KidTracker-main/KidTracker-main"

git remote add origin https://github.com/YOUR_USERNAME/kidtracker-app.git
git branch -M main
git push -u origin main
```

### Authentication

When prompted:
- **Username:** Your GitHub username
- **Password:** Use a **Personal Access Token**, NOT your password
  - Get token at: https://github.com/settings/tokens
  - Click "Generate new token (classic)"
  - Select scopes: `repo` (full control)
  - Copy the token and use it as password

---

## Step 3: Connect GitHub to AWS Amplify

### 3A: Open AWS Amplify Console

Go to: https://console.aws.amazon.com/amplify/home?region=us-east-1

### 3B: Create New App from GitHub

1. Click **"New app"** → **"Host web app"**

2. **Select GitHub** as the repository service
   - Click **"Connect branch"**
   - Authorize AWS Amplify to access your GitHub (if first time)

3. **Select Repository:**
   - Choose: `kidtracker-app` (your repo name)
   - Branch: `main`
   - Click **"Next"**

### 3C: Configure Build Settings

Amplify should auto-detect Vite. Use these settings:

**Build settings (amplify.yml):**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

**Build image settings:**
- **Build image:** `Amazon Linux:2023` (or latest)
- **Node version:** Auto-detect (will use 18+)

Click **"Next"**

### 3D: Review and Deploy

1. **Review all settings**
2. Click **"Save and deploy"**
3. Wait 5-10 minutes for first deployment

---

## Step 4: Get Your Live URL

After deployment:
- Your app will be live at: `https://main.XXXXX.amplifyapp.com`
- Amplify shows the URL in the console
- Every push to `main` branch auto-deploys! 🎉

---

## Step 5: Test Your App

**Super Admin Login:**
```
URL: https://main.XXXXX.amplifyapp.com
Username: superadmin
Password: admin123
```

Look for the blue **Settings** button!

---

## 🎯 Future Updates - Auto Deploy!

Now whenever you make changes:

```bash
# Make your changes, then:
git add .
git commit -m "Your update message"
git push

# AWS Amplify automatically deploys! 🚀
```

---

## 📋 Quick Reference

### Your GitHub Repo
After creating: `https://github.com/YOUR_USERNAME/kidtracker-app`

### AWS Amplify Console
https://console.aws.amazon.com/amplify/home?region=us-east-1

### Personal Access Token
https://github.com/settings/tokens

---

## 🔧 Troubleshooting

### Build Fails

**Check build logs in Amplify Console:**
1. Go to your app in Amplify
2. Click on the build (e.g., "main branch")
3. View the build logs
4. Common issues:
   - Node version: Ensure Node 18+ is used
   - Build command: Should be `npm run build`
   - Output directory: Should be `dist`

### Fix Build Settings

If auto-detect doesn't work:
1. In Amplify Console → App Settings → Build settings
2. Click "Edit"
3. Paste the YAML config from above
4. Save and redeploy

### Git Push Authentication Failed

Create a Personal Access Token:
1. Go to: https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scope: `repo`
4. Copy token
5. Use token as password when pushing

---

## ✅ Success Checklist

- [ ] Created GitHub repository
- [ ] Pushed code to GitHub
- [ ] Connected GitHub to AWS Amplify
- [ ] Build completed successfully
- [ ] App is live at Amplify URL
- [ ] Tested super admin login
- [ ] Verified Settings button works

---

**All set! Your app now deploys automatically on every push!** 🎉

**Powered by GDI Digital Solutions** 🚀
