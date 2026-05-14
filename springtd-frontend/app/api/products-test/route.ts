import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ success: true, message: 'Products test route works!' });
}

export async function POST() {
    return NextResponse.json({ success: true, message: 'Products test POST works!' });
}
