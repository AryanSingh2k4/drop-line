import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter: IP -> timestamps array
const rateLimitMap = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MIN = 5;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: NextRequest) {
  // Get IP address from headers or connection
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Filter out timestamps older than 1 minute
  const validTimestamps = timestamps.filter((time) => now - time < WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_MIN) {
    return NextResponse.json(
      { error: 'Too many room creation requests. Please wait a minute before trying again.' },
      { status: 429 }
    );
  }

  // Update timestamps
  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);

  // Generate valid 6-digit code matching /^[A-Z0-9]{6}$/
  let code = generateRoomCode();
  const isValid = /^[A-Z0-9]{6}$/.test(code);

  while (!isValid) {
    code = generateRoomCode();
  }

  return NextResponse.json({ code });
}
