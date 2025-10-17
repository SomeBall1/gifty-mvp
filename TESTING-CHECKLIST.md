# ✅ Quick Testing Checklist

Use this checklist to verify Gifty works perfectly before your first real event.

## 🚀 Basic Setup (5 minutes)

- [ ] Supabase project created
- [ ] Database schema applied (`supabase-schema.sql`)
- [ ] `.env.local` file configured
- [ ] Dependencies installed (`npm install`)
- [ ] Dev server running (`npm run dev`)

---

## 🔐 Authentication (2 minutes)

- [ ] Can access http://localhost:3000
- [ ] Signup page loads
- [ ] Created test account
- [ ] Logged in successfully
- [ ] Redirected to dashboard
- [ ] Can log out
- [ ] Can log back in

---

## 📅 Event Management (3 minutes)

- [ ] Dashboard shows "Create New Event" button
- [ ] Clicked "Create New Event"
- [ ] Modal opens
- [ ] Filled in event name
- [ ] Selected event date
- [ ] (Optional) Added scanner PIN
- [ ] Event created successfully
- [ ] Event appears in dashboard
- [ ] Can click event to view details

---

## 👥 Guest List Management (5 minutes)

- [ ] Event detail page loads
- [ ] "Upload CSV File" button visible
- [ ] Uploaded `sample-guests.csv`
- [ ] Success message appears
- [ ] 10 guests imported
- [ ] Guest list displays all guests
- [ ] Can see: Name, Email, Tier, Status
- [ ] All show "Not Claimed" status
- [ ] Search box works
- [ ] Can filter by name

---

## 📧 Email System (5 minutes - Optional)

**Only if you set up Resend:**

- [ ] Resend account created
- [ ] API key added to `.env.local`
- [ ] Dev server restarted
- [ ] "📧 Send Invitations" button visible
- [ ] Button shows correct count
- [ ] Clicked "Send Invitations"
- [ ] Confirmed in popup
- [ ] "Sending..." state shows
- [ ] Success message appears
- [ ] Email received in inbox
- [ ] Email looks professional
- [ ] QR code visible in email
- [ ] Event details correct

---

## 🎯 QR Code Generation (3 minutes)

- [ ] Can see "Download" link next to each guest
- [ ] Clicked "Download" for first guest
- [ ] QR code image downloaded
- [ ] Image is clear (600x600px)
- [ ] Can open image
- [ ] "Download All QR Codes" button visible
- [ ] (Optional) Downloaded all codes

---

## 📱 Scanner Access (2 minutes)

- [ ] "Open Scanner" button visible in green box
- [ ] Scanner PIN displayed (if set)
- [ ] Clicked "Open Scanner"
- [ ] Scanner opens in new tab
- [ ] Event name shows at top

**If PIN is set:**
- [ ] PIN entry screen appears
- [ ] Entered wrong PIN
- [ ] Error message shows
- [ ] Entered correct PIN
- [ ] Scanner becomes accessible

---

## 📷 QR Code Scanning (10 minutes)

### First Scan (Success)
- [ ] "SCAN GUEST" button visible
- [ ] Clicked "SCAN GUEST"
- [ ] Browser asks for camera permission
- [ ] Granted camera permission
- [ ] Camera view appears
- [ ] Scanning frame visible
- [ ] Pointed camera at downloaded QR code
- [ ] QR code detected (< 2 seconds)
- [ ] **GREEN SCREEN appears**
- [ ] Guest name shows (large text)
- [ ] Tier shows (e.g., "VIP Bag")
- [ ] "Scan Next" button appears

### Second Scan (Duplicate)
- [ ] Clicked "Scan Next"
- [ ] Scanner resets
- [ ] Scanned same QR code again
- [ ] **RED SCREEN appears**
- [ ] Guest name shows
- [ ] "ALREADY CLAIMED" shows
- [ ] "Scan Next" button appears

### Invalid Code Test
- [ ] Clicked "Scan Next"
- [ ] Scanned a random QR code (not from system)
- [ ] **ORANGE SCREEN appears**
- [ ] "INVALID CODE" shows
- [ ] "Scan Next" button appears

---

## ⚡ Real-Time Updates (5 minutes)

- [ ] Opened event page in browser
- [ ] Kept page open
- [ ] Opened scanner in another tab/device
- [ ] Scanned a new guest in scanner
- [ ] Green screen appeared
- [ ] Switched back to event page
- [ ] **Guest status updated to "Claimed"**
- [ ] **NO refresh needed!**
- [ ] Claimed count increased
- [ ] Real-time working!

---

## 🔍 Search & Filter (2 minutes)

- [ ] Back on event page
- [ ] Guest list shows all guests
- [ ] Typed name in search box
- [ ] Results filtered instantly
- [ ] Cleared search
- [ ] All guests visible again
- [ ] Searched by email
- [ ] Works correctly
- [ ] Searched by tier
- [ ] Works correctly

---

## 📊 Statistics (1 minute)

- [ ] Event page shows stats cards
- [ ] "Total Guests" shows correct number
- [ ] "Claimed" shows correct number
- [ ] "Not Claimed" shows correct number
- [ ] Numbers match guest list

---

## 🌐 Mobile Testing (10 minutes - Important!)

**Test on actual phone/tablet:**

### Setup for Mobile
- [ ] Found computer's IP address
- [ ] Updated `.env.local` with IP
- [ ] Restarted dev server
- [ ] Opened `http://192.168.x.x:3000` on phone
- [ ] Page loads on phone

### Scanner on Mobile
- [ ] Logged in on phone
- [ ] Navigated to event
- [ ] Clicked "Open Scanner"
- [ ] Scanner loads
- [ ] Camera access requested
- [ ] Camera view works
- [ ] Can scan QR codes
- [ ] Result screens visible
- [ ] Text readable
- [ ] Buttons tappable

---

## 🎨 UI/UX Check (3 minutes)

- [ ] All pages look professional
- [ ] No broken layouts
- [ ] Text is readable
- [ ] Buttons are clear
- [ ] Colors make sense (green=good, red=bad)
- [ ] Loading states show when needed
- [ ] Error messages are clear
- [ ] Success messages are positive
- [ ] Mobile-responsive
- [ ] No console errors (F12)

---

## 🚪 Logout & Security (2 minutes)

- [ ] Clicked logout
- [ ] Redirected to login page
- [ ] Can't access dashboard without login
- [ ] Can't access event pages without login
- [ ] Scanner works without login (correct!)
- [ ] Logged back in successfully

---

## Final Verification

### Core Flow Complete
- [ ] ✅ Signup works
- [ ] ✅ Login works
- [ ] ✅ Event creation works
- [ ] ✅ CSV upload works
- [ ] ✅ QR generation works
- [ ] ✅ Scanner works
- [ ] ✅ Verification works (green/red/orange)
- [ ] ✅ Real-time updates work
- [ ] ✅ Mobile works

### Optional Features
- [ ] ✅ Email sending works (if set up)
- [ ] ✅ Scanner PIN works (if set)

---

## 🎉 Success Criteria

If all checkboxes are checked, you have:

✅ **Fully functional system**  
✅ **Production-ready code**  
✅ **Tested end-to-end**  
✅ **Ready for real events**

---

## 🐛 If Something Doesn't Work

### Common Issues:

**Camera won't open:**
- Check browser permissions
- Ensure HTTPS (or localhost)
- Try different browser
- Check mobile phone settings

**QR codes don't scan:**
- Improve lighting
- Hold phone steady
- Make QR code larger
- Clean camera lens

**Real-time not working:**
- Check internet connection
- Verify Supabase is online
- Check browser console (F12)
- Try refreshing page

**Emails not sending:**
- Verify Resend API key
- Check `.env.local` file
- Restart dev server
- Check Resend dashboard

**Database errors:**
- Verify schema was applied
- Check Supabase connection
- Confirm `.env.local` correct
- Try re-running schema

---

## 📝 Notes

**Time to complete:** 30-60 minutes  
**Difficulty:** Easy  
**Prerequisites:** Followed QUICKSTART.md  
**Result:** Confidence system works perfectly

---

## What to Test at Real Event

Before going live, test at the actual venue:

- [ ] WiFi connection strength
- [ ] Camera works in venue lighting
- [ ] Scanner devices charged
- [ ] Backup printed list ready
- [ ] Hostesses trained
- [ ] Test scan before guests arrive

---

## 🎯 You're Ready!

Once this checklist is complete:
- ✅ System is verified
- ✅ You know how it works
- ✅ Ready to deploy
- ✅ Ready for real events

**Next step:** Deploy to production (see `DEPLOYMENT-CHECKLIST.md`)

---

**Happy Testing!** 🚀
