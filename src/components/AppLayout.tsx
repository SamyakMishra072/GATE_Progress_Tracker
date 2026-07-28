import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider,
  SidebarTrigger, SidebarRail, SidebarInset
} from '@/components/ui/sidebar'
import {
  LayoutDashboard, BookOpen, List, PenTool, FileQuestion,
  BarChart3, TrendingUp, CalendarDays, Timer, Flame,
  Target, Calculator, BookMarked, Trophy, Zap
} from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth'
import { LogOut } from 'lucide-react'

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, group: 'Overview' },
  { title: 'Study Streak', url: '/streak', icon: Flame, group: 'Overview' },
  { title: 'Subjects', url: '/subjects', icon: BookOpen, group: 'Tracker' },
  { title: 'Chapters', url: '/chapters', icon: List, group: 'Tracker' },
  { title: 'Syllabus', url: '/syllabus', icon: BookMarked, group: 'Tracker' },
  { title: 'Practice', url: '/practice', icon: PenTool, group: 'Practice' },
  { title: 'PYQ Tracker', url: '/pyq', icon: FileQuestion, group: 'Practice' },
  { title: 'Test Series', url: '/tests', icon: Zap, group: 'Practice' },
  { title: 'Daily Planner', url: '/planner', icon: CalendarDays, group: 'Planning' },
  { title: 'Study Timer', url: '/timer', icon: Timer, group: 'Planning' },
  { title: 'Goals', url: '/goals', icon: Target, group: 'Planning' },
  { title: 'Analytics', url: '/analytics', icon: BarChart3, group: 'Insights' },
  { title: 'Marks Predictor', url: '/predictor', icon: Calculator, group: 'Insights' },
  { title: 'Achievements', url: '/achievements', icon: Trophy, group: 'Insights' },
]

const groups = ['Overview', 'Tracker', 'Practice', 'Planning', 'Insights']

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  const userName = profile?.full_name || 'User'
  const initials = userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const daysLeft = Math.ceil((new Date('2027-02-07').getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              G
            </div>
            <div className="group-data-[collapsible=icon]:hidden overflow-hidden">
              <p className="font-bold text-sm leading-tight truncate">GATE CSE 2027</p>
              <p className="text-xs text-muted-foreground leading-tight truncate">{userName}</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {groups.map(group => (
            <SidebarGroup key={group}>
              <SidebarGroupLabel>{group}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.filter(i => i.group === group).map(item => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        isActive={location.pathname === item.url}
                        tooltip={item.title}
                        onClick={() => navigate(item.url)}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-3">
          <div className="group-data-[collapsible=icon]:hidden rounded-lg bg-primary/10 p-3 text-center">
            <div className="flex items-center gap-1 justify-center text-primary">
              <TrendingUp className="size-4" />
              <span className="text-xs font-semibold">GATE 2027</span>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{daysLeft}</p>
            <p className="text-xs text-muted-foreground">days remaining</p>
          </div>
          <div className="group-data-[collapsible=icon]:flex hidden justify-center">
            <div className="rounded-lg bg-primary/10 p-1.5 text-center">
              <p className="text-xs font-bold text-primary">{daysLeft}d</p>
            </div>
          </div>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4 sticky top-0 z-20 bg-background/80 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex-1" />
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="size-8 rounded-full p-0">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{profile?.email || ''}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={async () => { await signOut(); navigate('/login') }}
              >
                <LogOut className="size-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
