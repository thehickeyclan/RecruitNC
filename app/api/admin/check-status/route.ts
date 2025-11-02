import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ isAdmin: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Error checking admin status:', profileError)
      return NextResponse.json({ isAdmin: false, error: 'Failed to check admin status' }, { status: 500 })
    }

    return NextResponse.json({ 
      isAdmin: profile?.is_admin || false,
      userId: user.id,
      email: user.email 
    })
    
  } catch (error) {
    console.error('Admin status check error:', error)
    return NextResponse.json({ isAdmin: false, error: 'Server error' }, { status: 500 })
  }
}
