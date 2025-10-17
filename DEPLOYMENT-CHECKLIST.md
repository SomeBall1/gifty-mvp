# 🚀 Deployment & Production Checklist

## Pre-Deployment (Test Locally First)

### ✅ Local Testing Complete
- [ ] Created account and logged in successfully
- [ ] Created at least one test event
- [ ] Uploaded CSV with test guests
- [ ] Downloaded QR codes
- [ ] Scanned QR codes successfully
- [ ] Verified green screen (success)
- [ ] Verified red screen (duplicate scan)
- [ ] Verified orange screen (invalid code)
- [ ] Tested on mobile device
- [ ] Checked guest list updates after scanning
- [ ] Tested search functionality

### ✅ Ready for Deployment
- [ ] All features working locally
- [ ] No console errors
- [ ] Database schema applied correctly
- [ ] Environment variables configured
- [ ] Code pushed to GitHub/GitLab

---

## Deployment to Vercel

### Step 1: Prepare Repository
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial Gifty MVP"

# Push to GitHub
git remote add origin https://github.com/yourusername/gifty-mvp.git
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: **./** (leave default)
   - Build Command: **next build** (leave default)
   - Output Directory: **.next** (leave default)

### Step 3: Add Environment Variables
In Vercel dashboard, add these:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Step 4: Deploy
- [ ] Click "Deploy"
- [ ] Wait for build to complete (~2 minutes)
- [ ] Test the production URL
- [ ] Update `NEXT_PUBLIC_APP_URL` if needed

### Step 5: Custom Domain (Optional)
- [ ] Add your domain in Vercel settings
- [ ] Update DNS records
- [ ] Update `NEXT_PUBLIC_APP_URL` to your domain
- [ ] Regenerate QR codes if needed

---

## Post-Deployment Testing

### ✅ Production Environment
- [ ] Can access the site at production URL
- [ ] SSL certificate is active (https://)
- [ ] Login works
- [ ] Can create events
- [ ] Can upload CSV
- [ ] QR codes generate with correct URL
- [ ] Scanner works on mobile
- [ ] Camera access granted (requires HTTPS)
- [ ] Verification works end-to-end
- [ ] No console errors

### ✅ Mobile Testing
- [ ] Tested on iOS Safari
- [ ] Tested on Android Chrome
- [ ] Camera works reliably
- [ ] QR scanning is fast
- [ ] Result screens display correctly
- [ ] Text is readable on small screens

---

## Production Hardening (Before Real Events)

### 🔒 Security Enhancements

#### 1. Scanner Protection
```typescript
// Add to scanner page
const [pin, setPin] = useState('')
const [authenticated, setAuthenticated] = useState(false)

// Store PIN in events table
// Verify PIN before showing scanner
```

#### 2. Rate Limiting
```typescript
// Add to verify-guest API
// Use Vercel Edge Config or Upstash Redis
// Limit: 100 verifications per IP per hour
```

#### 3. Audit Logging
```sql
-- Add audit log table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id UUID REFERENCES guests(id),
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. Tighten RLS Policies
```sql
-- Remove public policies on guests table
DROP POLICY "Public can read guests for verification" ON guests;
DROP POLICY "Public can update guest status for verification" ON guests;

-- Add time-limited access tokens instead
-- Or implement scanner authentication
```

### 📧 Email Integration (Resend)

#### 1. Sign Up & Configure
- [ ] Create account at [resend.com](https://resend.com)
- [ ] Verify your domain
- [ ] Get API key
- [ ] Add to environment variables

#### 2. Install Package
```bash
npm install resend
```

#### 3. Create Email Template
```typescript
// lib/email-template.ts
export const qrEmailTemplate = (name: string, qrUrl: string) => `
<!DOCTYPE html>
<html>
  <body>
    <h1>You're Invited!</h1>
    <p>Hi ${name},</p>
    <p>We're excited to have you at our event. Here's your exclusive QR code:</p>
    <img src="${qrUrl}" alt="Your QR Code" width="300" />
    <p>Simply show this at the event exit to receive your goodie bag.</p>
  </body>
</html>
`
```

#### 4. Send Emails
```typescript
// app/api/send-invitations/route.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const { eventId } = await request.json()
  
  // Fetch guests
  // Generate QR codes
  // Send emails
}
```

### ⚡ Real-Time Updates

#### 1. Enable Realtime in Supabase
```typescript
// In event detail page
useEffect(() => {
  const channel = supabase
    .channel('guests-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'guests',
        filter: `event_id=eq.${eventId}`
      },
      (payload) => {
        // Update local state
        fetchGuests()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [eventId])
```

### 📊 Analytics & Monitoring

#### 1. Add Vercel Analytics
```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

#### 2. Error Tracking (Sentry)
```bash
npm install @sentry/nextjs
```

#### 3. Uptime Monitoring
- [ ] Set up [Better Stack](https://betterstack.com) or similar
- [ ] Monitor scanner endpoint
- [ ] Alert if down > 5 minutes

---

## Pre-Event Checklist

### 1 Week Before
- [ ] Create event in system
- [ ] Upload final guest list
- [ ] Review tier assignments
- [ ] Test QR code generation
- [ ] Send test emails (if using auto-email)

### 3 Days Before
- [ ] Send QR codes to all guests
- [ ] Verify email delivery rates
- [ ] Print backup guest list
- [ ] Prepare scanner devices (tablets/phones)
- [ ] Test scanner on all devices

### Day Before
- [ ] Test scanner at venue (check WiFi)
- [ ] Charge all scanner devices
- [ ] Print emergency backup QR codes
- [ ] Brief hostesses on system
- [ ] Show them green/red/yellow screens

### Day Of Event
- [ ] Open scanner 30 minutes early
- [ ] Test with a dummy QR code
- [ ] Have backup printed list ready
- [ ] Assign 2-3 scanner stations at exit
- [ ] Keep laptop nearby for troubleshooting

---

## During Event Protocol

### For Hostesses
```
1. Smile and greet guest
2. Ask to see their QR code
3. Scan with device
4. Wait for result (1 second)

If GREEN:
  - "Perfect! Here's your [VIP/Press] bag"
  - Hand over appropriate bag
  - Click "Scan Next"

If RED:
  - "It looks like this was already claimed"
  - Check with supervisor
  - DO NOT give second bag

If ORANGE:
  - "Let me get my supervisor"
  - Check printed backup list
  - Manual verification
```

### For Event Manager
- [ ] Monitor dashboard every 30 minutes
- [ ] Check claim rate
- [ ] Spot check scanner operation
- [ ] Help with any issues
- [ ] Note any problems for post-event review

---

## Post-Event Checklist

### Immediately After
- [ ] Export final guest list
- [ ] Download claim statistics
- [ ] Identify unclaimed guests
- [ ] Thank and dismiss hostesses

### Within 24 Hours
- [ ] Send unclaimed bags via courier
- [ ] Email guests who missed pickup
- [ ] Document any issues
- [ ] Backup all data

### Within 1 Week
- [ ] Survey hostesses for feedback
- [ ] Review claim statistics
- [ ] Calculate ROI (bags saved vs stolen)
- [ ] Plan improvements for next event

---

## Troubleshooting Guide

### Issue: Camera won't open
**Solutions:**
- Check HTTPS is enabled
- Try different browser
- Reset browser permissions
- Use different device

### Issue: QR codes not scanning
**Solutions:**
- Improve lighting
- Clean camera lens
- Ensure QR code is large enough (5cm+)
- Try holding steadier
- Check if QR code URL is correct

### Issue: Verification fails
**Solutions:**
- Check internet connection
- Verify Supabase is online
- Check browser console for errors
- Fallback to manual list

### Issue: Guest claims lost QR
**Solutions:**
- Search guest in dashboard
- Download their QR code again
- Email immediately
- Or scan from dashboard directly

### Issue: Database errors
**Solutions:**
- Check Supabase dashboard
- Verify RLS policies
- Check connection limits
- Contact Supabase support

---

## Scaling Considerations

### For Large Events (500+ guests)

#### Database
- [ ] Upgrade to Supabase Pro if needed
- [ ] Add database indexes
- [ ] Consider read replicas
- [ ] Enable connection pooling

#### Scanner
- [ ] Deploy 5-10 scanner stations
- [ ] Use tablets instead of phones
- [ ] Have tech support on standby
- [ ] Multiple backup devices

#### Network
- [ ] Ensure venue has strong WiFi
- [ ] Have 4G/5G backup
- [ ] Test network capacity
- [ ] Consider offline mode

#### Support
- [ ] Tech person on-site
- [ ] Laptop for admin access
- [ ] Printed backup lists
- [ ] Walkie-talkies for coordination

---

## Cost Planning

### Small Events (<100 guests)
**Monthly Cost: €0**
- Supabase Free: 50,000 rows
- Vercel Free: 100GB bandwidth
- Resend Free: 3,000 emails

### Medium Events (100-500 guests)
**Monthly Cost: ~€20**
- Supabase Free (sufficient)
- Vercel Pro: €18/month
- Resend Free (sufficient)

### Large Events (500+ guests)
**Monthly Cost: ~€50**
- Supabase Pro: €20/month
- Vercel Pro: €18/month
- Resend Pro: €15/month

### Enterprise (Multiple events, White-label)
**Monthly Cost: ~€150+**
- Custom Supabase plan
- Vercel Team: €20/user
- Resend Pro: €15/month
- Custom domain
- Priority support

---

## Success Metrics

Track these to measure ROI:

### Operational Metrics
- **Scan time**: <2 seconds per guest
- **Error rate**: <1%
- **Claim rate**: >85%
- **Hostess satisfaction**: >4/5

### Business Metrics
- **Bags saved**: Compare to previous events
- **Guest satisfaction**: Survey post-event
- **Time saved**: vs. clipboard method
- **Cost per guest**: System cost / total guests

### Technical Metrics
- **Uptime**: >99.9%
- **API latency**: <500ms
- **Scanner load time**: <2s
- **Email delivery**: >95%

---

## Next Phase Features

Once MVP is validated, consider:

1. **Multi-language Support**
   - Translate UI to French, German, Italian
   - Localize date formats

2. **Advanced Analytics**
   - Peak scanning times
   - Hostess performance metrics
   - Claim patterns

3. **White-Label Options**
   - Client branding
   - Custom domains
   - Branded emails

4. **Mobile Apps**
   - Native iOS/Android scanner
   - Offline mode
   - Push notifications

5. **Integration Options**
   - Eventbrite sync
   - CRM integration
   - Mailchimp integration

---

## Support & Maintenance

### Regular Tasks
- **Weekly**: Check error logs
- **Monthly**: Review usage stats
- **Quarterly**: Update dependencies
- **Yearly**: Renew domains/services

### Emergency Contacts
- Supabase Status: status.supabase.com
- Vercel Status: vercel-status.com
- Your Support: [Add your contact]

---

**You're ready to go live!** 🎉

Start with a small test event, gather feedback, iterate, and scale up!
