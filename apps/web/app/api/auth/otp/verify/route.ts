import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/verify-otp`, body);
    const { tokens, user } = backendResponse.data;
    const { accessToken, refreshToken } = tokens;

    const cookieStore = await cookies();

    // Clear any stale tokens from a previous session before setting new ones.
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');

    cookieStore.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60,
    });

    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'OTP verification failed';
    return NextResponse.json({ message }, { status });
  }
}
