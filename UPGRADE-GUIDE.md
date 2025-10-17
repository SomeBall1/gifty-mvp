# 🔄 Upgrade Guide: 80% → 100%

## If You Already Have the 80% MVP Running

This guide will help you upgrade to the complete 100% version with all new features.

---

## What's New in 100%

1. 📧 **Auto-email sending** via Resend
2. ⚡ **Real-time dashboard updates**
3. 🔒 **Scanner PIN protection**
4. 🎨 **Professional email templates**

---

## Upgrade Steps

### Step 1: Backup Your Current Code

```bash
# If you've made custom changes, back them up
cp -r your-gifty-folder your-gifty-folder-backup
```

### Step 2: Update Database Schema

Run this in your Supabase SQL Editor (only if you haven't already):

```sql
-- Add scanner_pin column to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS scanner_pin TEXT;
```

That's it! The real-time features don't need any schema changes.

### Step 3: Update Environment Variables

Add to your `.env.local`:

```bash
# New: Resend API Key for email sending
RESEND_API_KEY=re_your_api_key_here
```

**To get your Resend API key:**
1. Sign up at [resend.com](https://resend.com) (free)
2. Go to API Keys
3. Create new key
4. Copy and paste into `.env.local`

### Step 4: Replace Updated Files

Copy these new/updated files from the 100% version:

**New Files:**
- `/lib/email/templates.ts` - Email template
- `/app/api/send-invitations/route.ts` - Email sending API

**Updated Files:**
- `/app/dashboard/page.tsx` - Now has PIN field
- `/app/event/[id]/page.tsx` - Now has real-time + send emails
- `/app/scan/[eventId]/page.tsx` - Now has PIN protection
- `/.env.local.example` - Has Resend key
- `/package.json` - Has Resend dependency

### Step 5: Install New Dependencies

```bash
npm install
# This will install the 'resend' package
```

### Step 6: Restart Your Dev Server

```bash
# Stop the old server (Ctrl+C)
npm run dev
```

### Step 7: Test New Features

1. **Test PIN Protection:**
   - Create a new event
   - Set a Scanner PIN (e.g., "1234")
   - Open scanner link
   - Enter PIN to access

2. **Test Real-Time Updates:**
   - Open event page on computer
   - Open scanner on phone
   - Scan a QR code
   - Watch computer update automatically!

3. **Test Email Sending:**
   - Make sure Resend API key is set
   - Upload a guest list with YOUR email
   - Click "Send Invitations"
   - Check your inbox!

---

## Migration Checklist

- [ ] Backed up current code
- [ ] Updated database schema (added scanner_pin column)
- [ ] Added Resend API key to .env.local
- [ ] Copied new email template files
- [ ] Updated event detail page
- [ ] Updated scanner page
- [ ] Updated dashboard page
- [ ] Ran npm install
- [ ] Restarted dev server
- [ ] Tested PIN protection
- [ ] Tested real-time updates
- [ ] Tested email sending
- [ ] All features working!

---

## If You're Starting Fresh

Don't follow this guide! Just:
1. Download the 100% version
2. Follow [QUICKSTART.md](./QUICKSTART.md)
3. You're done!

---

## Compatibility

**Database:** 
- ✅ Fully backward compatible
- ✅ Old events work fine
- ✅ Just add scanner_pin column

**Existing Events:**
- ✅ Will continue to work
- ✅ Scanner will work without PIN (like before)
- ✅ Can add PIN to existing events later

**Existing Guests:**
- ✅ No changes needed
- ✅ Real-time will work immediately
- ✅ Can send emails to existing guests

---

## Common Issues

### "Module not found: 'resend'"
**Solution:** Run `npm install`

### "RESEND_API_KEY is not defined"
**Solution:** Add it to `.env.local` and restart server

### Real-time updates not working
**Solution:** 
1. Check Supabase Realtime is enabled
2. Refresh the page
3. Check browser console for errors

### Emails not sending
**Solutions:**
1. Verify Resend API key is correct
2. Check you have credits in Resend
3. Check browser console for errors
4. Try with test email first

---

## Rolling Back

If you need to go back to 80%:

```bash
# Restore your backup
rm -rf your-gifty-folder
mv your-gifty-folder-backup your-gifty-folder

# Remove Resend from .env.local
# Remove the RESEND_API_KEY line

# Restart
npm run dev
```

---

## Need Help?

1. Check [WHATS-NEW.md](./WHATS-NEW.md) for detailed feature docs
2. Check [README.md](./README.md) for troubleshooting
3. Check browser console for errors
4. Make sure all environment variables are set

---

## After Upgrade

You can now:
- ✨ Send automated email invitations
- ⚡ Watch dashboard update in real-time
- 🔒 Protect your scanner with PIN
- 🎨 Impress guests with beautiful emails
- 🎉 Use at production events!

**Welcome to Gifty 100%!** 🎊
