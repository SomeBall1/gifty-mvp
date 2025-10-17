# 🚀 Quick Start Guide - Get Running in 5 Minutes

## Step 1: Supabase Setup (2 minutes)

1. Go to **https://supabase.com** → Sign up (free)
2. Click **"New Project"**
3. Fill in:
   - Name: `gifty-mvp`
   - Password: (create a strong one)
   - Region: (choose closest to you)
4. Wait 2 minutes for project to initialize

## Step 2: Run the Database Script (1 minute)

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New Query"**
3. Open the `supabase-schema.sql` file from this project
4. Copy ALL the contents
5. Paste into Supabase SQL Editor
6. Click **"Run"** (bottom right)
7. You should see "Success. No rows returned"

## Step 3: Get Your API Keys (30 seconds)

1. In Supabase, click **"Settings"** (gear icon in left sidebar)
2. Click **"API"**
3. Copy these two values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## Step 4: Configure Your App (1 minute)

1. In this project folder, create a file called `.env.local`
2. Add these lines (replace with YOUR values):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 5: Run the App (30 seconds)

```bash
npm install
npm run dev
```

## Step 6: Test It! (1 minute)

1. Open http://localhost:3000
2. Click "Sign Up"
3. Create an account
4. Create an event
5. Upload `sample-guests.csv`
6. Download a QR code
7. Click "Open Scanner"
8. Scan the QR code you downloaded
9. 🎉 GREEN SCREEN!

---

## 📱 Test on Your Phone

1. Find your computer's IP address:
   - **Mac**: System Settings → Network → Your connection → IP Address
   - **Windows**: Open Command Prompt → type `ipconfig` → look for IPv4 Address

2. Update `.env.local`:
   ```
   NEXT_PUBLIC_APP_URL=http://192.168.1.XXX:3000
   ```
   (Replace XXX with your IP)

3. Restart the dev server (Ctrl+C then `npm run dev`)

4. On your phone, go to: `http://192.168.1.XXX:3000`

---

## ⚡ That's It!

You now have a fully working goodie bag verification system.

**Next**: Read the main README.md for deployment and customization options.
