# 📊 Gifty System Flow

## The Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                      BEFORE THE EVENT                        │
└─────────────────────────────────────────────────────────────┘

Step 1: EVENT ORGANIZER (You)
↓
Create Account → Login
↓
Create Event (Name + Date)
↓
Upload Guest List CSV
   (name, email, tier)
↓
Download QR Codes
   - Individual: Click "Download" per guest
   - Bulk: Click "Download All QR Codes"
↓
Distribute QR Codes
   [MVP: Email manually or print]
   [Future: Auto-email via Resend]


┌─────────────────────────────────────────────────────────────┐
│                      DURING THE EVENT                        │
└─────────────────────────────────────────────────────────────┘

Step 2: HOSTESS AT EXIT
↓
Open Scanner Link
   (from event page: "Open Scanner" button)
↓
Allow Camera Access
↓
┌────────────────────────────────────┐
│         SCAN GUEST LOOP            │
│                                    │
│  1. Guest shows QR code            │
│  2. Hostess scans with camera      │
│  3. System verifies guest_id       │
│  4. Database checks status         │
│  5. Screen shows result:           │
│                                    │
│     🟢 GREEN = Success!            │
│        "Ana Horvat - VIP Bag"      │
│        Hand over bag               │
│                                    │
│     🔴 RED = Already Claimed       │
│        "Ana Horvat - ALREADY..."   │
│        Don't give bag              │
│                                    │
│     🟠 ORANGE = Invalid            │
│        "INVALID CODE"              │
│        Don't give bag              │
│                                    │
│  6. Click "Scan Next"              │
│  7. Repeat                         │
└────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                      AFTER THE EVENT                         │
└─────────────────────────────────────────────────────────────┘

Step 3: EVENT ORGANIZER (You)
↓
View Event Dashboard
↓
Check Statistics:
   - Total Guests: 150
   - Claimed: 142
   - Not Claimed: 8
↓
Export Not Claimed List
↓
Courier Delivery Follow-up
   (Send bags to offices)
```

## Database Flow

```
┌──────────────────────────────────────────────────────┐
│                   GUEST RECORD                        │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Initial State (After CSV Upload):                   │
│  ┌──────────────────────────────────────┐           │
│  │ id: uuid-1234                        │           │
│  │ name: "Ana Horvat"                   │           │
│  │ email: "ana@example.com"             │           │
│  │ tier: "VIP"                          │           │
│  │ status: "Not Claimed"      ← Start   │           │
│  │ claimed_at: null                     │           │
│  └──────────────────────────────────────┘           │
│                                                       │
│                      ↓                                │
│              [QR Code Scanned]                       │
│                      ↓                                │
│                                                       │
│  After Successful Scan:                              │
│  ┌──────────────────────────────────────┐           │
│  │ id: uuid-1234                        │           │
│  │ name: "Ana Horvat"                   │           │
│  │ email: "ana@example.com"             │           │
│  │ tier: "VIP"                          │           │
│  │ status: "Claimed"          ← Updated │           │
│  │ claimed_at: 2025-10-17T...  ← Updated│           │
│  └──────────────────────────────────────┘           │
│                                                       │
│                      ↓                                │
│          [Second Scan Attempt]                       │
│                      ↓                                │
│                                                       │
│  Status Check:                                       │
│  ┌──────────────────────────────────────┐           │
│  │ IF status == "Claimed"               │           │
│  │ THEN return 409 Conflict             │           │
│  │ SHOW: Red "Already Claimed" screen   │           │
│  └──────────────────────────────────────┘           │
└──────────────────────────────────────────────────────┘
```

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  (Next.js 14 + React + Tailwind CSS)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   Login    │  │ Dashboard  │  │Event Detail│           │
│  │  /login    │  │/dashboard  │  │/event/[id] │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                              │
│  ┌────────────┐  ┌────────────────────────────┐           │
│  │  Scanner   │  │    CSV Upload              │           │
│  │/scan/[id]  │  │    QR Generator            │           │
│  └────────────┘  └────────────────────────────┘           │
│                                                              │
│                          ↕                                   │
│                  API Routes                                  │
│                          ↕                                   │
├─────────────────────────────────────────────────────────────┤
│                      BACKEND                                 │
│            (Supabase + PostgreSQL)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tables:                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ profiles   │  │   events   │  │   guests   │           │
│  ├────────────┤  ├────────────┤  ├────────────┤           │
│  │ id         │  │ id         │  │ id         │           │
│  │ email      │  │ user_id    │  │ event_id   │           │
│  └────────────┘  │ name       │  │ name       │           │
│                  │ date       │  │ email      │           │
│                  └────────────┘  │ tier       │           │
│                                  │ status     │           │
│                                  │ claimed_at │           │
│                                  └────────────┘           │
│                                                              │
│  Row Level Security (RLS):                                  │
│  - Users can only see their own events                      │
│  - Users can only manage guests for their events            │
│  - Scanner has public read/update for verification          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

```
POST /api/verify-guest
├─ Input:  { guestId: "uuid" }
├─ Logic:
│  1. Find guest in database
│  2. Check if status is "Claimed"
│  3. If yes → Return 409 + guest data
│  4. If no → Update status to "Claimed"
│  5. Return 200 + guest data
└─ Output:
   Success (200):     { name, tier }
   Already (409):     { name, tier, error }
   Not Found (404):   { error }
```

## QR Code Format

```
┌─────────────────────────────────────────┐
│         What's in the QR Code           │
├─────────────────────────────────────────┤
│                                         │
│  URL Format:                            │
│  https://your-app.com/scan/[eventId]    │
│    ?guest_id=[unique-uuid]              │
│                                         │
│  Example:                               │
│  https://gifty.vercel.app/scan/         │
│    abc-123-def-456?guest_id=            │
│    xyz-789-uvw-012                      │
│                                         │
│  When Scanned:                          │
│  1. Opens scanner page                  │
│  2. Extracts guest_id from URL          │
│  3. Calls /api/verify-guest             │
│  4. Shows result screen                 │
│                                         │
└─────────────────────────────────────────┘
```

## Scanner State Machine

```
┌───────────────────────────────────────────────────┐
│              SCANNER STATES                       │
└───────────────────────────────────────────────────┘

     ┌──────────────┐
     │   INITIAL    │
     │ "SCAN GUEST" │
     │    Button    │
     └──────┬───────┘
            │
            │ [Button Click]
            ↓
     ┌──────────────┐
     │   SCANNING   │
     │  Camera On   │
     │  QR Viewer   │
     └──────┬───────┘
            │
            │ [QR Detected]
            ↓
     ┌──────────────┐
     │  VERIFYING   │
     │ API Call...  │
     └──────┬───────┘
            │
            ├──[200 OK]──→ ┌──────────────┐
            │              │   SUCCESS    │
            │              │ Green Screen │
            │              └──────┬───────┘
            │                     │
            ├──[409]──────→ ┌──────────────┐
            │              │   CLAIMED    │
            │              │  Red Screen  │
            │              └──────┬───────┘
            │                     │
            └──[404]──────→ ┌──────────────┐
                           │   INVALID    │
                           │Orange Screen │
                           └──────┬───────┘
                                  │
                      [All paths lead to]
                                  ↓
                           ┌──────────────┐
                           │ "SCAN NEXT"  │
                           │    Button    │
                           └──────┬───────┘
                                  │
                                  │ [Click]
                                  ↓
                           Back to INITIAL
```

## Security Model (MVP)

```
┌─────────────────────────────────────────────────────┐
│               AUTHENTICATION LAYERS                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Layer 1: Admin Dashboard                           │
│  ┌────────────────────────────────────────┐        │
│  │ ✅ Requires: Supabase Auth              │        │
│  │ ✅ Protected: All event management      │        │
│  │ ✅ Secured: RLS policies                │        │
│  └────────────────────────────────────────┘        │
│                                                      │
│  Layer 2: Scanner                                   │
│  ┌────────────────────────────────────────┐        │
│  │ ⚠️  Public: Anyone with link            │        │
│  │ ✅ Secure: Can only verify guests       │        │
│  │ ❌ Future: Add PIN protection           │        │
│  └────────────────────────────────────────┘        │
│                                                      │
│  Layer 3: Verification API                          │
│  ┌────────────────────────────────────────┐        │
│  │ ✅ Read-only: Can't delete guests       │        │
│  │ ✅ One-way: Can't unclaim               │        │
│  │ ⚠️  Public: No rate limiting (yet)      │        │
│  └────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘

MVP is SAFE FOR TESTING but needs:
- Scanner authentication for production
- Rate limiting on API
- Audit logging
- IP whitelisting (optional)
```

## Performance Characteristics

```
Operation              Speed        Notes
─────────────────────────────────────────────
Login                 ~500ms       Supabase Auth
Create Event          ~300ms       Single DB insert
CSV Upload (100)      ~2s          Batch insert
QR Generation         ~100ms       Client-side
Scanner Open          ~1s          Camera permission
QR Scan + Verify      ~500ms       End-to-end
Database Query        ~50ms        With indexes
Page Load             ~1s          First load

Bottlenecks (MVP):
- CSV parsing (client-side, blocks UI)
- Bulk QR download (sequential, slow)

Future Optimizations:
- Server-side CSV processing
- Parallel QR generation
- WebSocket for real-time updates
- CDN for static assets
```

---

This flow shows exactly how every piece connects!
