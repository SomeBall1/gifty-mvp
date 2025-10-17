import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Create a Supabase client with the service role key for bypassing RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { guestId } = await request.json()

    if (!guestId) {
      return NextResponse.json(
        { error: 'Guest ID is required' },
        { status: 400 }
      )
    }

    // Fetch the guest
    const { data: guest, error: fetchError } = await supabaseAdmin
      .from('guests')
      .select('*')
      .eq('id', guestId)
      .single()

    if (fetchError || !guest) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      )
    }

    // Check if already claimed
    if (guest.status === 'Claimed') {
      return NextResponse.json(
        {
          error: 'Already claimed',
          name: guest.name,
          tier: guest.tier,
        },
        { status: 409 }
      )
    }

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
      return NextResponse.json(
        { error: 'Error updating guest status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      name: updatedGuest.name,
      tier: updatedGuest.tier,
    })
  } catch (error) {
    console.error('Error in verify-guest API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
