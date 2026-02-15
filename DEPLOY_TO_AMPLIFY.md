# 🚀 Deploy KidTrackerApp to AWS Amplify

## Quick Deploy Guide

Your app is ready to deploy! Follow these steps to deploy to AWS Amplify.

---

## Option 1: Manual Deploy (Recommended - Fastest)

### Step 1: Build Complete ✅
The production build is already done! Files are in the `dist/` folder.

### Step 2: Create Deployment Zip

Using PowerShell or Command Prompt:

```bash
cd "c:/Users/thoma/Downloads/KidTracker-main/KidTracker-main"
```

Then run the deployment script:
```bash
node create-deploy-zip.cjs
```

This will create a `kidtracker-deploy.zip` file with your built app.

### Step 3: Deploy to Amplify Console

1. **Go to AWS Amplify Console:**
   - https://console.aws.amazon.com/amplify/home
   - Your app ID: `d2nbsjhv8lzch9`

2. **Select Your App** (or create new one)

3. **Deploy Without Git:**
   - Choose "Deploy without Git provider"
   - Drag and drop the `kidtracker-deploy.zip` file
   - Or use "Browse files" to select it

4. **Wait for Deployment** (usually 2-3 minutes)

5. **Get Your URL:**
   - Your app will be live at: `https://dev.d2nbsjhv8lzch9.amplifyapp.com`
   - Or check the Amplify Console for the exact URL

---

## Option 2: Git-Based Deploy (Continuous Deployment)

### Prerequisites
```bash
# Install Amplify CLI (if not already installed)
npm install -g @aws-amplify/cli
```

### Steps

1. **Configure Amplify CLI:**
```bash
amplify configure
```
Follow the prompts to set up AWS credentials.

2. **Initialize Amplify (if needed):**
```bash
cd "c:/Users/thoma/Downloads/KidTracker-main/KidTracker-main"
amplify init
```

3. **Publish to Amplify:**
```bash
amplify publish --yes
```

---

## Build Configuration for Amplify

If you're setting up a new Amplify app, use these build settings:

### Build Settings (amplify.yml)
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

### Environment Variables (if needed)
```
NODE_ENV=production
```

---

## Deployment Checklist

- [x] ✅ Code committed to git
- [x] ✅ Production build created (`npm run build`)
- [x] ✅ Build output in `dist/` folder
- [ ] ⏳ Upload to Amplify Console OR run `amplify publish`
- [ ] ⏳ Verify deployment at Amplify URL
- [ ] ⏳ Test super admin login
- [ ] ⏳ Test daycare login

---

## Important Notes

### Paths & Backslashes
✅ **This guide uses forward slashes (/) throughout** to avoid Windows path issues

### Custom Domain (Optional)
After deployment, you can add a custom domain:
1. Go to Amplify Console → Domain Management
2. Add your domain (e.g., kidtracker.gdidigitalsolutions.com)
3. Follow DNS configuration steps

### SSL Certificate
✅ Amplify automatically provides SSL (HTTPS) for all deployments

### Rewrites Configuration
✅ Already configured in `amplify-rules.json` for single-page app routing

---

## Post-Deployment Testing

### Test Super Admin Login:
```
URL: https://your-app.amplifyapp.com
Username: superadmin
Password: admin123
```

### Test Daycare Login:
```
URL: https://your-app.amplifyapp.com
Daycare Code: [from database]
Username: [daycare username]
Password: [daycare password]
```

---

## Troubleshooting

### Build Fails
- Check Node version: `node --version` (should be 18+)
- Clear node_modules: `rm -rf node_modules && npm install`
- Try build locally: `npm run build`

### Routing Issues (404 on refresh)
- Verify `amplify-rules.json` is deployed
- Check Amplify Console → Rewrites and redirects

### API Connection Issues
- Verify API Gateway URL in `src/lib/api.ts`
- Check CORS settings on API Gateway
- Verify Lambda function is running

---

## Quick Deploy Command

For fastest deployment, run this in PowerShell:

```powershell
cd "c:/Users/thoma/Downloads/KidTracker-main/KidTracker-main"
node create-deploy-zip.cjs
```

Then drag `kidtracker-deploy.zip` to Amplify Console!

---

## Your Amplify App Info

- **App ID:** d2nbsjhv8lzch9
- **Region:** us-east-1
- **Environment:** dev
- **Expected URL:** https://dev.d2nbsjhv8lzch9.amplifyapp.com

---

## 🎉 That's It!

Your KidTrackerApp is ready to deploy. Choose either:
1. **Manual Deploy** - Drag & drop ZIP file (fastest)
2. **Git Deploy** - Use Amplify CLI (continuous deployment)

**Need help?** Check the AWS Amplify documentation at https://docs.amplify.aws/

---

**Deployed by GDI Digital Solutions** 🚀
