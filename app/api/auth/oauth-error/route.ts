// API route to store OAuth rejection info
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // This endpoint is called from client-side when OAuth fails
    // We can't directly set sessionStorage from server, so we return the email
    // and the client will store it
    return NextResponse.json({ email });
  } catch (error) {
    console.error('OAuth error route error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}
