import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const accessToken = req.cookies.get('access_token')?.value;

    const response = await fetch(`${BACKEND_URL}/api/v1/documents/${id}/stream`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return NextResponse.json({ message: 'Failed to fetch document stream' }, { status: response.status });
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/pdf',
        'Content-Disposition': response.headers.get('Content-Disposition') || `inline; filename="document.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ message: 'Stream failed' }, { status: 500 });
  }
}
