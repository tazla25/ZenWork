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

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders })
    }

    const { team_id } = await request.json()

    // Verify user is manager of this team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', team_id)
      .eq('manager_id', user.id)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403, headers: corsHeaders })
    }

    // Get team averages using the secure RPC function
    const { data: averages, error: rpcError } = await supabase.rpc('get_team_health_stats', {
      team_uuid: team_id
    })

    if (rpcError) throw rpcError

    // Get anonymous burnout alerts
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: teamMemberIds } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', team_id)

    const userIds = teamMemberIds?.map(m => m.user_id) || []

    const { data: burnoutAlerts } = await supabase
      .from('daily_summaries')
      .select('user_id, summary_date, burnout_risk')
      .in('user_id', userIds)
      .gte('summary_date', sevenDaysAgo)
      .gt('burnout_risk', 0.6)

    // Get weekly trend (last 28 days)
    const { data: weeklyTrend } = await supabase
      .from('daily_summaries')
      .select('summary_date, productivity_score')
      .in('user_id', userIds)
      .gte('summary_date', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('summary_date', { ascending: true })

    return NextResponse.json({
      team_name: team.name,
      averages: averages?.[0] || {},
      burnout_alerts: (burnoutAlerts || []).length,
      burnout_details: (burnoutAlerts || []).map((a: any) => ({
        date: a.summary_date,
        risk_level: a.burnout_risk > 0.8 ? 'critical' : 'high'
      })),
      weekly_trend: weeklyTrend || []
    }, { headers: corsHeaders })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders })
  }
}
