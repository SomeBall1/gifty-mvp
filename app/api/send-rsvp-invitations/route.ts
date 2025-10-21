import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { rsvpInvitationTemplate } from '@/lib/email/templates'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient()

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { eventId, fromEmail = 'onboarding@resend.dev' } = await request.json()

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    // Fetch event details (RLS ensures user owns this event)
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

    // Fetch all pending RSVP guests for this event
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .eq('rsvp_status', 'Pending')

    if (guestsError) {
      return NextResponse.json(
        { error: 'Error fetching guests' },
        { status: 500 }
      )
    }

    if (!guests || guests.length === 0) {
      return NextResponse.json(
        { message: 'No pending RSVP guests to send invitations to', sent: 0 },
        { status: 200 }
      )
    }

    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Send email to each guest
    for (const guest of guests) {
      try {
        // Generate RSVP URLs
        const rsvpYesUrl = `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${eventId}?guest_id=${guest.id}&response=yes`
        const rsvpNoUrl = `${process.env.NEXT_PUBLIC_APP_URL}/rsvp/${eventId}?guest_id=${guest.id}&response=no`

        // Format date nicely
        const eventDate = new Date(event.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

        // Generate email HTML
        const html = rsvpInvitationTemplate({
          guestName: guest.name,
          eventName: event.name,
          eventDate,
          eventLocation: event.location || undefined,
          tier: guest.tier,
          rsvpYesUrl,
          rsvpNoUrl
        })

        // Send email via Resend (only if configured)
        if (!resend) {
          throw new Error('Resend API key not configured')
        }

        const { error: sendError } = await resend.emails.send({
          from: fromEmail,
          to: guest.email,
          subject: `You're Invited to ${event.name} - Please RSVP`,
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
    console.error('Error in send-rsvp-invitations API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
