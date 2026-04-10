import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth()))

  // 環境変数が未設定の場合はデモ用の空データを返す
  if (
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !process.env.GOOGLE_PRIVATE_KEY ||
    !process.env.GOOGLE_CALENDAR_ID
  ) {
    return NextResponse.json({ events: [], configured: false })
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })

    const calendar = google.calendar({ version: 'v3', auth })

    // 月の前後1日バッファを持たせてJSTのズレを吸収
    const timeMin = new Date(Date.UTC(year, month, 1) - 86400000).toISOString()
    const timeMax = new Date(Date.UTC(year, month + 1, 1) + 86400000).toISOString()

    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    })

    return NextResponse.json({ events: response.data.items ?? [], configured: true })
  } catch (error) {
    console.error('Google Calendar API error:', error)
    return NextResponse.json(
      { events: [], error: 'カレンダーの取得に失敗しました' },
      { status: 500 }
    )
  }
}
