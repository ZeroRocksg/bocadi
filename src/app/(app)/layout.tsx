import { Navbar } from '@/components/layout/navbar'
import { MobileNav } from '@/components/layout/mobile-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
