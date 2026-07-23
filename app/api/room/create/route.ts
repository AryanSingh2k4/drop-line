import { NextResponse } from 'next/server';

// Simple in-memory rate limiting (works per isolated Vercel instance, perfectly fine for this scale)
const ipRequests = new Map<string, { count: number; lastReset: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();

  const record = ipRequests.get(ip);
  if (!record || now - record.lastReset > 60000) {
    // Reset or initialize record every minute
    ipRequests.set(ip, { count: 1, lastReset: now });
  } else {
    record.count++;
    if (record.count > 5) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in a minute.' }, { status: 429 });
    }
  }

  // Generate a strictly 6-character uppercase alphanumeric code
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  return NextResponse.json({ code });
}
