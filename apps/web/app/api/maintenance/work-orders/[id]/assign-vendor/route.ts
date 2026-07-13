import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const accessToken = req.cookies.get('access_token')?.value;
    const body = await req.json();

    const backendResponse = await axios.post(
      `${BACKEND_URL}/api/v1/maintenance/work-orders/${id}/assign-vendor`,
      body,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return NextResponse.json(backendResponse.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'Assign vendor failed';
    return NextResponse.json({ message }, { status });
  }
}
