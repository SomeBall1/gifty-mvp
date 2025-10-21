# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## User Overview

You communicate with Bubble. He is eager to follow along and has learned to make Github Desktop commits, navigate Vercel, VS Code, and installed Claude Code.
Bub is the person in the business branch whose idea this is. She will be testing it in the field.
Bub and Bubble both have zero prior experience with coding. Act accordingly, provide detailed instructions as needed.
They use Windows and Android.
Feel free to give multi-step instructions. Bubble will let you know when he's stuck.

## Git Commit Workflow

When you complete a feature, fix, or improvement:
1. Automatically create a git commit to main without asking for permission
2. Use clear, concise commit messages that describe the "why" not just the "what"
3. Follow the standard commit format with co-author attribution
4. Bubble will review commits in GitHub Desktop and can amend/revert if needed

## Project Overview

Gifty is a VIP goodie bag verification system for exclusive events. It enables event organizers to manage guest lists, generate QR codes, send email invitations, and verify guests in real-time using mobile scanners.

**Tech Stack:**
- Next.js 14 (App Router with React Server Components)
- Supabase (PostgreSQL database, authentication, and real-time subscriptions)
- TypeScript
- Tailwind CSS (custom deep charcoal + champagne gold color scheme)
- QR code scanning (jsQR for scanning, qrcode for generation)
- Bulk QR download (jszip for creating ZIP archives)
- Email delivery via Resend API

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Environment Setup

Required environment variables (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `NEXT_PUBLIC_APP_URL` - Application URL (for QR code generation - **MUST match deployment URL**)
- `RESEND_API_KEY` - Resend API key for email sending (optional)
- `RESEND_FROM_EMAIL` - Sender email address (optional)

**CRITICAL:** `NEXT_PUBLIC_APP_URL` must match actual deployment URL. After any deployment URL change, regenerate all QR codes from the event detail page.

## Database Schema

The database schema is defined in `supabase-schema.sql`. Key tables:

1. **profiles** - User accounts (auto-created via trigger on signup)
2. **events** - Events with optional `scanner_pin` for PIN protection
3. **guests** - Guest records with `status` tracking ("Not Claimed" → "Claimed")

The schema uses Row Level Security (RLS) policies - users can only access their own events/guests, but scanner verification has public policies (lines 104-109) for unauthenticated scanning.

## Architecture

### Supabase Client Pattern

Two distinct client creation patterns:

1. **Client-side** (`lib/supabase-client.ts`): Use `createClient()` for client components
2. **Server-side** (`lib/supabase-server.ts`): Use `createServerSupabaseClient()` for API routes

### Real-Time Updates

The event detail page (`app/event/[id]/page.tsx`) uses Supabase real-time subscriptions:
- Automatically updates guest list when status changes via scanner
- Multiple scanners can operate simultaneously
- No manual refresh needed

```javascript
useEffect(() => {
  const channel = supabase.channel('guests-channel')
    .on('postgres_changes', { event: 'UPDATE', table: 'guests', filter: `event_id=eq.${params.id}` }, ...)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}, [params.id])
```

### QR Code Flow

1. **Generation** (`app/event/[id]/page.tsx`):
   - QR codes encode: `${NEXT_PUBLIC_APP_URL}/scan/${eventId}?guest_id=${guestId}`
   - Individual PNG downloads or bulk ZIP download
   - ZIP filename: `${eventName}_QR_Codes.zip`
   - Individual filename: `${guestName}_${tier}.png`

2. **Scanning** (`app/scan/[eventId]/page.tsx`):
   - Uses device camera with `jsQR` library
   - Extracts `guest_id` from scanned URL
   - Calls `/api/verify-guest`

3. **Verification** (`app/api/verify-guest/route.ts`):
   - Validates guest exists
   - Checks claim status (returns 409 if already claimed)
   - Updates status to "Claimed" with timestamp
   - Returns guest name/tier for result screen

### Scanner PIN Protection

Events have optional `scanner_pin` field:
- If set, scanner requires PIN entry before camera access
- If null/empty, scanner immediately accessible
- PIN verification happens client-side against database

### Email System

- Resend API for delivery (`app/api/send-invitations/route.ts`)
- HTML templates in `lib/email/templates.ts`
- QR codes embedded as base64 data URLs
- Only sends to guests with status "Not Claimed"

## Key Design Patterns

### Color Scheme

Deep charcoal + champagne gold theme used consistently:

```javascript
const colors = {
  bg: '#0f0f0f',
  cardBg: '#1a1a1a',
  gold: '#c9a961',
  text: '#f5f5f0',
  textMuted: '#a8a8a0',
  border: '#2a2a2a',
  success: '#4a7c59',    // muted sage (not bright green)
  error: '#8b7474',      // muted rose (not harsh red)
  warning: '#9b8b74'     // muted amber
}
```

**Design Philosophy:** No harsh colors, professional VIP aesthetic, works in dim lighting, mobile-first.

### Scanner Result Screens

Three full-screen feedback states:
- **Success** (soft gold/green): Shows guest name + tier, crown icon for VIP
- **Already Claimed** (rich grey): Shows polite messaging with claim timestamp
- **Invalid** (soft amber): Gentle error with retry option

Each auto-stops camera and shows clear call-to-action button.

### Route Organization

```
app/
├── page.tsx                    # Home/landing
├── login/page.tsx              # Login
├── signup/page.tsx             # Signup
├── dashboard/page.tsx          # Events list with countdown
├── event/[id]/page.tsx         # Event detail, CSV upload, guest list, QR downloads
├── scan/[eventId]/page.tsx     # QR scanner with PIN protection
└── api/
    ├── verify-guest/route.ts   # Verification endpoint
    ├── send-invitations/route.ts
    └── delete-event/route.ts
```

## CSV Import Format

Must have exactly 3 columns with header row:

```csv
name,email,tier
Ana Horvat,ana.horvat@example.com,VIP
Marco Rossi,marco.rossi@example.com,Press
Sarah Chen,sarah.chen@example.com,Standard
```

Tiers are freeform text (VIP, Press, Standard, Gold, Platinum, etc.). System displays crown icons for "VIP" tier.

## Common Issues and Solutions

### QR Code Not Recognized

**Cause:** QR codes generated with wrong URL (localhost or old deployment URL)

**Solution:**
1. Verify `NEXT_PUBLIC_APP_URL` matches current deployment
2. Go to event detail page
3. Re-download QR codes (old ones are now invalid)

### TypeScript Build Errors

Common fix for webkit properties:
```typescript
// ❌ Incorrect (causes errors)
e.currentTarget.style.WebkitTextFillColor = 'transparent'

// ✅ Correct
e.currentTarget.style.webkitTextFillColor = 'transparent'
```

### Camera Permission Issues

- Camera requires HTTPS or localhost
- Use "Try Again" button to re-request permissions
- Test on actual mobile devices, not just desktop
- Check browser settings if previously denied

### Database Connection Issues

1. Verify Vercel environment variables are set
2. Check Supabase project is active
3. Test locally with `npm run dev`
4. Verify RLS policies applied in Supabase SQL editor

## Testing Notes

### Local Mobile Testing

1. Update `NEXT_PUBLIC_APP_URL` to local IP: `http://192.168.1.xxx:3000`
2. Restart dev server
3. Access from mobile on same network
4. **Important:** QR codes with local IP won't work in production

### Debugging

The verify-guest API includes detailed console logging. Check browser console (F12) while scanning to see:
- Guest ID received
- Database query results
- Error details

## Production Deployment

**Vercel (recommended):**
1. Auto-deploys from Git
2. Set environment variables in Vercel dashboard
3. Update `NEXT_PUBLIC_APP_URL` to production domain (e.g., `https://gifty-mvp.vercel.app`)
4. **Regenerate all QR codes** after deployment with new URL

## Security Considerations

Current MVP uses public RLS policies for scanner (lines 104-109 in `supabase-schema.sql`):

```sql
CREATE POLICY "Public can read guests for verification" ON guests
  FOR SELECT USING (true);

CREATE POLICY "Public can update guest status for verification" ON guests
  FOR UPDATE USING (true) WITH CHECK (true);
```

**For production, consider:**
- Rate limiting on `/api/verify-guest`
- Time-limited tokens instead of permanent guest IDs
- IP whitelisting for scanner endpoints
- Audit logging

## Known Limitations

- **No undo claim** - Once claimed, permanent (by design)
- **No guest editing** - Must re-upload CSV to correct data
- **No offline mode** - Requires internet for verification
- **Email requires Resend** - Not included in basic setup
