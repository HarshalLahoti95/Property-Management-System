import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    const { searchParams } = req.nextUrl;

    const backendResponse = await axios.get(`${BACKEND_URL}/api/v1/maintenance/work-orders`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: Object.fromEntries(searchParams.entries()),
    });

    return NextResponse.json(backendResponse.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'Fetch work orders failed';
    return NextResponse.json({ message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;
    const body = await req.json();

    const backendResponse = await axios.post(`${BACKEND_URL}/api/v1/maintenance/work-orders`, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return NextResponse.json(backendResponse.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'Create work order failed';
    return NextResponse.json({ message }, { status });
  }
}
