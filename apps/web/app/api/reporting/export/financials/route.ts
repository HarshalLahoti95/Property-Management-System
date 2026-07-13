import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.cookies.get('access_token')?.value;

    const backendResponse = await axios.get(
      `${BACKEND_URL}/api/v1/reporting/export/financials`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        responseType: 'text',
      }
    );

    return new NextResponse(backendResponse.data, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': backendResponse.headers['content-disposition'] || 'attachment; filename=financials-report.csv',
      },
    });
  } catch (err: any) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message || 'Export financials failed';
    return NextResponse.json({ message }, { status });
  }
}
