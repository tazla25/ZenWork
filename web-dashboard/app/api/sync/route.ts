import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '../../../lib/supabase'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders, status: 204 })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Extract JWT from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify user with token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const { events } = await request.json()

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'No events provided' }, { status: 400, headers: corsHeaders })
    }

    // Validate and enrich events
    const enrichedEvents = events.map(event => ({
      user_id: user.id,
      domain: event.domain,
      category: event.category || 'neutral',
      duration_seconds: Math.min(event.duration_seconds || 0, 3600),
      start_time: event.start_time || new Date().toISOString(),
      end_time: event.end_time || new Date().toISOString(),
      work_date: new Date().toISOString().split('T')[0]
    }))

    // Insert in batch
    const { error } = await supabase
      .from('activity_logs')
      .insert(enrichedEvents)

    if (error) throw error

    return NextResponse.json({ 
      success: true, 
      synced: enrichedEvents.length 
    }, { headers: corsHeaders })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
  }
}
