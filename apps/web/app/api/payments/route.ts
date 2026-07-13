import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    const { searchParams } = req.nextUrl;

    const backendResponse = await axios.get(`${BACKEND_URL}/api/v1/payments`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: Object.fromEntries(searchParams.entries()),
    });

    return NextResponse.json(backendResponse.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'Fetch payments failed';
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    const body = await req.json();

    const backendResponse = await axios.post(`${BACKEND_URL}/api/v1/payments`, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return NextResponse.json(backendResponse.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'Create payment failed';
    return NextResponse.json({ message }, { status });
  }
}
