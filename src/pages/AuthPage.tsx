import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { GraduationCap, Loader2, Mail, Lock, User, ArrowRight, Sparkles, Target, TrendingUp } from 'lucide-react'

export function AuthPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [signupForm, setSignupForm] = useState({ fullName: '', email: '', password: '' })

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    if (!loginForm.email || !loginForm.password) { toast.error('Please fill in all fields'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message === 'Invalid login credentials'
        ? 'Invalid email or password'
        : error.message)
      return
    }
    toast.success('Welcome back!')
    navigate('/dashboard')
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault()
    if (!signupForm.fullName || !signupForm.email || !signupForm.password) {
      toast.error('Please fill in all fields')
      return
    }
    if (signupForm.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        data: { full_name: signupForm.fullName },
      },
    })
    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    if (data.user && !data.session) {
      toast.success('Account created! Please check your email to confirm your account, then log in.')
      return
    }

    toast.success(`Welcome, ${signupForm.fullName}! Your account is ready.`)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5 overflow-hidden relative">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/10 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-chart-2/10 blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-chart-3/5 blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
      </div>

      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left: Branding */}
        <div className="hidden lg:flex flex-col gap-6 p-8">
          <div className="flex items-center gap-3">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-2xl shadow-lg">
              G
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">GATE CSE 2027</h1>
              <p className="text-sm text-muted-foreground">Prep Tracker</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-bold leading-tight">
              Your complete GATE prep journey, <span className="text-primary">all in one place.</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Track subjects, chapters, practice, PYQs, mock tests, study streaks, and more.
              Built for Samyak Mishra and every GATE CSE 2027 aspirant.
            </p>
          </div>

          <div className="grid gap-3 pt-2">
            {[
              { icon: Target, title: 'Smart Tracking', desc: 'Subjects, chapters, syllabus, and goals' },
              { icon: TrendingUp, title: 'Deep Analytics', desc: 'Charts, accuracy trends, marks predictor' },
              { icon: Sparkles, title: 'Achievements', desc: 'Unlock badges as you hit milestones' },
            ].map(feature => (
              <div key={feature.title} className="flex items-center gap-3 p-3 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Auth Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-xl">
              G
            </div>
            <div>
              <h1 className="text-xl font-bold">GATE CSE 2027</h1>
              <p className="text-xs text-muted-foreground">Prep Tracker</p>
            </div>
          </div>

          <Card className="border-border/50 shadow-2xl backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center pb-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 mx-auto mb-2">
                <GraduationCap className="size-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Get Started</CardTitle>
              <CardDescription>Sign in or create your account to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                {/* LOGIN TAB */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-9"
                          value={loginForm.email}
                          onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-9"
                          value={loginForm.password}
                          onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <>Sign In <ArrowRight className="size-4 ml-2" /></>}
                    </Button>
                  </form>
                </TabsContent>

                {/* SIGNUP TAB */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="Samyak Mishra"
                          className="pl-9"
                          value={signupForm.fullName}
                          onChange={e => setSignupForm(f => ({ ...f, fullName: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="you@example.com"
                          className="pl-9"
                          value={signupForm.email}
                          onChange={e => setSignupForm(f => ({ ...f, email: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="At least 6 characters"
                          className="pl-9"
                          value={signupForm.password}
                          onChange={e => setSignupForm(f => ({ ...f, password: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <>Create Account <ArrowRight className="size-4 ml-2" /></>}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <Separator className="my-4" />
              <p className="text-xs text-center text-muted-foreground">
                By continuing, you agree to keep your prep data private to your account.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
