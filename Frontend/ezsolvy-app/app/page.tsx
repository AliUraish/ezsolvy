"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight, Check } from "lucide-react"
import { useState, useEffect } from "react"

export default function HomePage() {
  const [displayedText, setDisplayedText] = useState("")
  const [scrollY, setScrollY] = useState(0)
  const fullText = "Understand\nany question\nwith visual\nexplanations"
  const typingSpeed = 50

  useEffect(() => {
    let currentIndex = 0
    const intervalId = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(intervalId)
      }
    }, typingSpeed)

    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const renderTypedText = () => {
    const lines = displayedText.split("\n")
    return (
      <>
        {lines[0] && (
          <>
            {lines[0]}
            <br />
          </>
        )}
        {lines[1] && (
          <>
            <span className="text-foreground/40">{lines[1]}</span>
            <br />
          </>
        )}
        {lines[2] && (
          <>
            {lines[2]}
            <br />
          </>
        )}
        {lines[3] && lines[3]}
      </>
    )
  }

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <svg className="absolute w-full h-full" style={{ opacity: Math.min(scrollY / 300, 0.7) }}>
          {/* Horizontal ruled lines like notebook paper */}
          <line
            x1="0"
            y1="150"
            x2="100%"
            y2="150"
            stroke="oklch(0.55 0.22 250)"
            strokeWidth="2"
            strokeDasharray="1200"
            strokeDashoffset={1200 - scrollY * 1.2}
            opacity="0.25"
          />
          <line
            x1="0"
            y1="250"
            x2="100%"
            y2="250"
            stroke="oklch(0.6 0.15 200)"
            strokeWidth="2"
            strokeDasharray="1200"
            strokeDashoffset={1200 - scrollY * 1.0}
            opacity="0.2"
          />
          <line
            x1="0"
            y1="400"
            x2="100%"
            y2="400"
            stroke="oklch(0.55 0.22 250)"
            strokeWidth="2"
            strokeDasharray="1200"
            strokeDashoffset={1200 - scrollY * 0.9}
            opacity="0.25"
          />
          <line
            x1="0"
            y1="550"
            x2="100%"
            y2="550"
            stroke="oklch(0.6 0.15 200)"
            strokeWidth="2"
            strokeDasharray="1200"
            strokeDashoffset={1200 - scrollY * 0.8}
            opacity="0.2"
          />
          <line
            x1="0"
            y1="700"
            x2="100%"
            y2="700"
            stroke="oklch(0.55 0.22 250)"
            strokeWidth="2"
            strokeDasharray="1200"
            strokeDashoffset={1200 - scrollY * 0.7}
            opacity="0.25"
          />

          {/* Wavy underlines */}
          <path
            d="M 100 200 Q 200 180, 300 200 T 500 200 T 700 200"
            stroke="oklch(0.55 0.22 250)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="600"
            strokeDashoffset={600 - scrollY * 0.8}
            opacity="0.3"
          />
          <path
            d="M 600 350 Q 700 330, 800 350 T 1000 350 T 1200 350"
            stroke="oklch(0.6 0.15 200)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="600"
            strokeDashoffset={600 - scrollY * 0.6}
            opacity="0.25"
          />

          {/* Circles and highlights */}
          <circle
            cx="200"
            cy="500"
            r="40"
            stroke="oklch(0.55 0.22 250)"
            strokeWidth="2.5"
            fill="none"
            strokeDasharray="251"
            strokeDashoffset={251 - scrollY * 0.5}
            opacity="0.3"
          />
          <circle
            cx="900"
            cy="450"
            r="35"
            stroke="oklch(0.6 0.15 200)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="220"
            strokeDashoffset={220 - scrollY * 0.45}
            opacity="0.25"
          />

          {/* Arrows */}
          <path
            d="M 800 600 L 900 650 L 850 700 M 900 650 L 920 630"
            stroke="oklch(0.6 0.15 200)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="250"
            strokeDashoffset={250 - scrollY * 0.4}
            opacity="0.3"
          />
          <path
            d="M 300 800 L 400 750 M 400 750 L 380 730 M 400 750 L 380 770"
            stroke="oklch(0.55 0.22 250)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="200"
            strokeDashoffset={200 - scrollY * 0.35}
            opacity="0.3"
          />

          {/* Stars and asterisks */}
          <path
            d="M 150 350 L 160 350 M 155 345 L 155 355 M 152 347 L 158 353 M 158 347 L 152 353"
            stroke="oklch(0.55 0.22 250)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="50"
            strokeDashoffset={50 - scrollY * 0.3}
            opacity="0.35"
          />
          <path
            d="M 750 250 L 760 250 M 755 245 L 755 255 M 752 247 L 758 253 M 758 247 L 752 253"
            stroke="oklch(0.6 0.15 200)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="50"
            strokeDashoffset={50 - scrollY * 0.28}
            opacity="0.3"
          />

          {/* Scribbles and doodles */}
          <path
            d="M 450 550 Q 460 540, 470 550 Q 480 560, 490 550 Q 500 540, 510 550"
            stroke="oklch(0.55 0.22 250)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="150"
            strokeDashoffset={150 - scrollY * 0.5}
            opacity="0.25"
          />
          <path
            d="M 100 650 C 120 630, 140 670, 160 650 C 180 630, 200 670, 220 650"
            stroke="oklch(0.6 0.15 200)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="200"
            strokeDashoffset={200 - scrollY * 0.45}
            opacity="0.25"
          />

          {/* Checkmarks */}
          <path
            d="M 550 300 L 560 310 L 580 285"
            stroke="oklch(0.55 0.22 250)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="50"
            strokeDashoffset={50 - scrollY * 0.4}
            opacity="0.35"
          />

          {/* Brackets and highlights */}
          <path
            d="M 350 450 Q 340 450, 340 460 L 340 490 Q 340 500, 350 500"
            stroke="oklch(0.6 0.15 200)"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="100"
            strokeDashoffset={100 - scrollY * 0.38}
            opacity="0.3"
          />

          {/* More diagonal lines for depth */}
          <line
            x1="50"
            y1="100"
            x2="300"
            y2="200"
            stroke="oklch(0.55 0.22 250)"
            strokeWidth="2"
            strokeDasharray="350"
            strokeDashoffset={350 - scrollY * 0.6}
            opacity="0.2"
          />
          <line
            x1="700"
            y1="150"
            x2="950"
            y2="250"
            stroke="oklch(0.6 0.15 200)"
            strokeWidth="2"
            strokeDasharray="350"
            strokeDashoffset={350 - scrollY * 0.55}
            opacity="0.2"
          />
        </svg>
      </div>

      <header className="border-b border-border/30 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between max-w-7xl">
          <Link href="/" className="text-xl font-bold text-foreground tracking-tight">
            ezsolvy
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6">
              Go to Dashboard
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
      </header>

      <section className="relative py-32 md:py-48">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="max-w-5xl">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black mb-8 text-foreground leading-[0.9] tracking-tight min-h-[400px] md:min-h-[500px]">
              {renderTypedText()}
              {displayedText.length < fullText.length && <span className="animate-pulse">|</span>}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
              Upload your questions and get AI-generated diagrams with step-by-step explanations on an interactive
              canvas.
            </p>
            <Link href="/dashboard">
              <Button
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-8 h-14 text-lg"
              >
                Start Now
                <ArrowRight className="ml-2 size-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/30">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="bg-card border border-border/50 rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="aspect-video bg-muted rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <div className="size-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ArrowRight className="size-10 text-primary" />
                </div>
                <p className="text-muted-foreground text-lg">Interactive Canvas Preview</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32">
        <div className="container mx-auto px-6 max-w-7xl">
          <h2 className="text-4xl md:text-6xl font-black mb-20 text-foreground max-w-3xl leading-tight">
            How ezsolvy helps you learn better
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="text-5xl font-black text-foreground/20">01</div>
              <h3 className="text-2xl font-bold text-foreground">AI Analysis</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Advanced AI understands your questions and plans the best way to explain complex concepts visually.
              </p>
            </div>
            <div className="space-y-4">
              <div className="text-5xl font-black text-foreground/20">02</div>
              <h3 className="text-2xl font-bold text-foreground">Interactive Canvas</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Watch as diagrams, equations, and visual aids are drawn in real-time on an interactive canvas.
              </p>
            </div>
            <div className="space-y-4">
              <div className="text-5xl font-black text-foreground/20">03</div>
              <h3 className="text-2xl font-bold text-foreground">Detailed Transcripts</h3>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Follow along with synchronized transcripts that explain every step of the solution process.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 border-t border-border/30">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6 text-foreground">Simple pricing plans.</h2>
            <p className="text-xl text-muted-foreground">Choose the plan that fits your learning needs</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <Card className="p-8 bg-card border-border/50 hover:border-foreground/20 transition-all">
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-foreground">Starter</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-foreground">$5</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="size-5 text-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">50 explanations/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="size-5 text-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Basic canvas features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="size-5 text-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">PDF & image upload</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full rounded-full border-2 bg-transparent">
                Start Now
              </Button>
            </Card>

            <Card className="p-8 bg-foreground text-background border-foreground relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-accent text-accent-foreground text-xs font-bold rounded-full">
                POPULAR
              </div>
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4">Pro</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black">$15</span>
                  <span className="opacity-70">/month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="size-5 shrink-0 mt-0.5" />
                  <span className="opacity-90">200 explanations/month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="size-5 shrink-0 mt-0.5" />
                  <span className="opacity-90">Advanced canvas tools</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="size-5 shrink-0 mt-0.5" />
                  <span className="opacity-90">Priority support</span>
                </li>
              </ul>
              <Button className="w-full rounded-full bg-background text-foreground hover:bg-background/90">
                Start Now
              </Button>
            </Card>

            <Card className="p-8 bg-card border-border/50 hover:border-foreground/20 transition-all">
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-foreground">Premium</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-foreground">$25</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="size-5 text-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Unlimited explanations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="size-5 text-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">All canvas features</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="size-5 text-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">24/7 priority support</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full rounded-full border-2 bg-transparent">
                Start Now
              </Button>
            </Card>

            <Card className="p-8 bg-card border-border/50 hover:border-foreground/20 transition-all">
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 text-foreground">Enterprise</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-foreground">$50</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <Check className="size-5 text-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Everything in Premium</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="size-5 text-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Team collaboration</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="size-5 text-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Dedicated support</span>
                </li>
              </ul>
              <Button variant="outline" className="w-full rounded-full border-2 bg-transparent">
                Contact Sales
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/30 py-12">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <span className="text-xl font-bold text-foreground">ezsolvy</span>
            <p className="text-sm text-muted-foreground">© 2025 ezsolvy. Making learning visual and interactive.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
