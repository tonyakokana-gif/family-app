'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarX } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns'
import { ja } from 'date-fns/locale/ja'
import type { CalendarEvent } from '@/types'

const WEEK_DAYS = ['日', '月', '火', '水', '木', '金', '土']

function getEventStartDate(event: CalendarEvent): Date | null {
  try {
    const str = event.start.dateTime ?? event.start.date
    if (!str) return null
    return parseISO(str)
  } catch {
    return null
  }
}

function formatEventTime(event: CalendarEvent): string {
  if (event.start.date && !event.start.dateTime) return '終日'
  if (event.start.dateTime) {
    return format(parseISO(event.start.dateTime), 'H:mm')
  }
  return ''
}

// イベントカラー（Google Calendar の colorId に対応）
const EVENT_COLORS: Record<string, string> = {
  '1': '#7986CB', '2': '#33B679', '3': '#8E24AA',
  '4': '#E67C73', '5': '#F6BF26', '6': '#F4511E',
  '7': '#039BE5', '8': '#616161', '9': '#3F51B5',
  '10': '#0B8043', '11': '#D50000',
}

function eventColor(event: CalendarEvent): string {
  return event.colorId ? EVENT_COLORS[event.colorId] ?? '#6366F1' : '#6366F1'
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const res = await fetch(`/api/calendar?year=${year}&month=${month}`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      setEvents(data.events ?? [])
      setConfigured(data.configured !== false)
    } catch {
      setError('カレンダーを読み込めませんでした')
    } finally {
      setLoading(false)
    }
  }, [currentDate])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startOffset = getDay(monthStart)

  const getEventsForDay = (day: Date) =>
    events.filter(e => {
      const d = getEventStartDate(e)
      return d ? isSameDay(d, day) : false
    })

  const selectedEvents = getEventsForDay(selectedDate).sort((a, b) => {
    const aTime = a.start.dateTime ? parseISO(a.start.dateTime).getTime() : 0
    const bTime = b.start.dateTime ? parseISO(b.start.dateTime).getTime() : 0
    return aTime - bTime
  })

  return (
    <div>
      {/* ヘッダー */}
      <div
        className="bg-white border-b border-gray-100"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        {/* 月ナビ */}
        <div className="flex items-center justify-between px-4 pb-3">
          <button
            onClick={() => setCurrentDate(d => subMonths(d, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100"
          >
            <ChevronLeft size={20} className="text-gray-500" />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-900">
              {format(currentDate, 'yyyy年M月', { locale: ja })}
            </h1>
          </div>
          <button
            onClick={() => setCurrentDate(d => addMonths(d, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100"
          >
            <ChevronRight size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 px-2">
          {WEEK_DAYS.map((day, i) => (
            <div
              key={day}
              className={`text-center text-xs font-semibold py-1 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 px-2 pb-3">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(day => {
            const dayEvents = getEventsForDay(day)
            const isSelected = isSameDay(day, selectedDate)
            const isDayToday = isToday(day)
            const dow = getDay(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className="flex flex-col items-center py-0.5"
              >
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : isDayToday
                      ? 'bg-indigo-100 text-indigo-700 font-bold'
                      : dow === 0
                      ? 'text-red-400'
                      : dow === 6
                      ? 'text-blue-400'
                      : 'text-gray-700'
                  }`}
                >
                  {format(day, 'd')}
                </span>
                {/* イベントドット（最大3個） */}
                <div className="flex gap-0.5 h-1.5 items-center mt-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: isSelected ? 'white' : eventColor(e) }}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 選択日のイベント一覧 */}
      <div className="px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-500 mb-3">
          {format(selectedDate, 'M月d日（E）', { locale: ja })}の予定
        </h2>

        {!configured && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-xs text-amber-700">
            Google Calendar が未設定です。<br />
            <code>.env.local</code> に API キーを設定してください。
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <CalendarX size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">{error}</p>
            <button
              onClick={fetchEvents}
              className="mt-2 text-xs text-indigo-500 underline"
            >
              再試行
            </button>
          </div>
        ) : selectedEvents.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">予定はありません</p>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map(event => (
              <div
                key={event.id}
                className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex gap-3"
              >
                <div
                  className="w-1 self-stretch rounded-full flex-shrink-0"
                  style={{ backgroundColor: eventColor(event) }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-snug">
                    {event.summary}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatEventTime(event)}</p>
                  {event.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
