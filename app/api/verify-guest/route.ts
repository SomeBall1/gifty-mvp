import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create a Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { guestId } = await request.json()

    console.log('=== VERIFY GUEST API CALLED ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Guest ID received:', guestId)

    if (!guestId) {
      console.error('ERROR: No guest ID provided')
      return NextResponse.json(
        { error: 'Guest ID is required' },
        { status: 400 }
      )
    }

    // Fetch the guest
    console.log('Querying database for guest...')
    const { data: guest, error: fetchError } = await supabaseAdmin
      .from('guests')
      .select('*')
      .eq('id', guestId)
      .single()

    if (fetchError) {
      console.error('Database fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Guest not found', details: fetchError.message },
        { status: 404 }
      )
    }

    if (!guest) {
      console.error('ERROR: Guest not found in database')
      console.log('Guest ID searched:', guestId)
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      )
    }

    console.log('Guest found:', {
      id: guest.id,
      name: guest.name,
      tier: guest.tier,
      status: guest.status,
      claimed_at: guest.claimed_at
    })

    // Check if already claimed
    if (guest.status === 'Claimed') {
      console.log('Guest already claimed at:', guest.claimed_at)
      return NextResponse.json(
        {
          error: 'Already claimed',
          name: guest.name,
          tier: guest.tier,
        },
        { status: 409 }
      )
    }

    console.log('Updating guest status to Claimed...')
    // Mark as claimed
    const { data: updatedGuest, error: updateError } = await supabaseAdmin
      .from('guests')
      .update({
        status: 'Claimed',
        claimed_at: new Date().toISOString(),
      })
      .eq('id', guestId)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: 'Error updating guest status', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('SUCCESS: Guest claimed successfully')
    console.log('Updated guest:', {
      id: updatedGuest.id,
      name: updatedGuest.name,
      tier: updatedGuest.tier,
      status: updatedGuest.status,
      claimed_at: updatedGuest.claimed_at
    })
    console.log('=== END ===\n')

    return NextResponse.json({
      success: true,
      name: updatedGuest.name,
      tier: updatedGuest.tier,
    })
  } catch (error) {
    console.error('FATAL ERROR in verify-guest API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
