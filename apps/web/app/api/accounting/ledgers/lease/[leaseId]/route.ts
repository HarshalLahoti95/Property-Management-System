import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function GET(req: NextRequest, { params }: { params: Promise<{ leaseId: string }> }) {
  try {
    const { leaseId } = await params;
    const accessToken = req.cookies.get('access_token')?.value;

    const backendResponse = await axios.get(`${BACKEND_URL}/api/v1/accounting/ledgers/lease/${leaseId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return NextResponse.json(backendResponse.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'Fetch ledgers failed';
    return NextResponse.json({ message }, { status });
  }
}
