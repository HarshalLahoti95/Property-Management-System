import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendResponse = await axios.post(`${BACKEND_URL}/api/v1/auth/request-otp`, body);
    return NextResponse.json(backendResponse.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'OTP request failed';
    return NextResponse.json({ message }, { status });
  }
}
