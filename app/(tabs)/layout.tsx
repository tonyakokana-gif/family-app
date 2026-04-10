import TabNav from '@/components/TabNav'

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* タブナビ分の下部余白 */}
      <div style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }}>
        {children}
      </div>
      <TabNav />
    </>
  )
}
