import { createClient } from '@/lib/supabase/server'
import {
  LandingNav,
  Hero,
  FeatureGrid,
  PricingSection,
  Footer,
} from '@/features/marketing/components'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white">
      <LandingNav isAuthenticated={!!user} />
      <main>
        <Hero />
        <FeatureGrid />
        <PricingSection />
      </main>
      <Footer />
    </div>
  )
}
