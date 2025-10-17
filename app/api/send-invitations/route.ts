import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import QRCode from 'qrcode'
import { qrInvitationTemplate } from '@/lib/email/templates'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export async function POST(request: Request) {
  try {
    const { eventId, fromEmail = 'onboarding@resend.dev' } = await request.json()

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Fetch all unclaimed guests for this event
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .eq('status', 'Not Claimed')

    if (guestsError) {
      return NextResponse.json(
        { error: 'Error fetching guests' },
        { status: 500 }
      )
    }

    if (!guests || guests.length === 0) {
      return NextResponse.json(
        { message: 'No unclaimed guests to send invitations to', sent: 0 },
        { status: 200 }
      )
    }

    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Send email to each guest
    for (const guest of guests) {
      try {
        // Generate QR code as data URL
        const qrUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan/${eventId}?guest_id=${guest.id}`
        const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
          width: 600,
          margin: 2,
        })

        // Format date nicely
        const eventDate = new Date(event.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        // Generate email HTML
        const html = qrInvitationTemplate({
          guestName: guest.name,
          eventName: event.name,
          eventDate,
          qrCodeDataUrl,
          tier: guest.tier
        })

// Send email via Resend (only if configured)
        if (!resend) {
          throw new Error('Resend API key not configured')
        }
        
        const { error: sendError } = await resend.emails.send({
          from: fromEmail,
          to: guest.email,
          subject: `Your Invitation to ${event.name}`,
          html,
        })

        if (sendError) {
          failedCount++
          errors.push(`${guest.name} (${guest.email}): ${sendError.message}`)
        } else {
          sentCount++
        }
      } catch (error: any) {
        failedCount++
        errors.push(`${guest.name} (${guest.email}): ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: failedCount,
      total: guests.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error: any) {
    console.error('Error in send-invitations API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
