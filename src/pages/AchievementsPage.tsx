import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Trophy, Lock, Unlock, Zap, Flame, Star, BookOpen, Target, Clock, CheckCircle, RefreshCw } from 'lucide-react'
import type { Achievement } from '@/lib/supabase'

const DEFAULT_ACHIEVEMENTS: Omit<Achievement, 'id' | 'created_at' | 'unlocked_at'>[] = [
  // Bronze
  { title: 'First Step', description: 'Log your first study session', tier: 'bronze', icon: 'Clock', condition_type: 'study_sessions', condition_value: 1, is_unlocked: false },
  { title: 'Question Starter', description: 'Solve 50 practice questions', tier: 'bronze', icon: 'Target', condition_type: 'questions_solved', condition_value: 50, is_unlocked: false },
  { title: 'Streak Beginner', description: 'Maintain a 3-day streak', tier: 'bronze', icon: 'Flame', condition_type: 'streak', condition_value: 3, is_unlocked: false },
  { title: 'Chapter Done', description: 'Complete 5 chapters', tier: 'bronze', icon: 'BookOpen', condition_type: 'chapters_completed', condition_value: 5, is_unlocked: false },
  { title: 'Test Taker', description: 'Appear in your first mock test', tier: 'bronze', icon: 'Zap', condition_type: 'tests_taken', condition_value: 1, is_unlocked: false },
  // Silver
  { title: 'Study Warrior', description: 'Log 50 hours of study', tier: 'silver', icon: 'Clock', condition_type: 'study_hours', condition_value: 50, is_unlocked: false },
  { title: 'Question Machine', description: 'Solve 500 practice questions', tier: 'silver', icon: 'Target', condition_type: 'questions_solved', condition_value: 500, is_unlocked: false },
  { title: 'On Fire', description: 'Maintain a 14-day streak', tier: 'silver', icon: 'Flame', condition_type: 'streak', condition_value: 14, is_unlocked: false },
  { title: 'Chapter Champion', description: 'Complete 30 chapters', tier: 'silver', icon: 'BookOpen', condition_type: 'chapters_completed', condition_value: 30, is_unlocked: false },
  { title: 'PYQ Explorer', description: 'Attempt 100 PYQs', tier: 'silver', icon: 'Star', condition_type: 'pyqs_attempted', condition_value: 100, is_unlocked: false },
  // Gold
  { title: 'Study Legend', description: 'Log 200 hours of study', tier: 'gold', icon: 'Clock', condition_type: 'study_hours', condition_value: 200, is_unlocked: false },
  { title: 'Question Master', description: 'Solve 2000 practice questions', tier: 'gold', icon: 'Target', condition_type: 'questions_solved', condition_value: 2000, is_unlocked: false },
  { title: 'Consistency King', description: 'Maintain a 30-day streak', tier: 'gold', icon: 'Flame', condition_type: 'streak', condition_value: 30, is_unlocked: false },
  { title: 'Syllabus Half Done', description: 'Complete 50% of all subjects', tier: 'gold', icon: 'BookOpen', condition_type: 'syllabus_percent', condition_value: 50, is_unlocked: false },
  { title: 'Mock Master', description: 'Score 70%+ in 5 mock tests', tier: 'gold', icon: 'Zap', condition_type: 'mock_70_plus', condition_value: 5, is_unlocked: false },
  // Diamond
  { title: 'GATE Ready', description: 'Log 500+ hours, solve 5000+ questions', tier: 'diamond', icon: 'Star', condition_type: 'study_hours', condition_value: 500, is_unlocked: false },
  { title: 'Unstoppable', description: 'Maintain a 100-day streak', tier: 'diamond', icon: 'Flame', condition_type: 'streak', condition_value: 100, is_unlocked: false },
  { title: 'Syllabus Complete', description: 'Complete 100% of all subjects', tier: 'diamond', icon: 'CheckCircle', condition_type: 'syllabus_percent', condition_value: 100, is_unlocked: false },
  { title: 'Mock Topper', description: 'Score 85%+ in any mock test', tier: 'diamond', icon: 'Trophy', condition_type: 'mock_85_plus', condition_value: 1, is_unlocked: false },
]

const TIER_COLORS = {
  bronze: 'border-orange-400 bg-orange-50 dark:bg-orange-950/20',
  silver: 'border-gray-400 bg-gray-50 dark:bg-gray-950/20',
  gold: 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20',
  diamond: 'border-blue-400 bg-blue-50 dark:bg-blue-950/20',
}

const TIER_ICON_COLORS = {
  bronze: 'text-orange-500',
  silver: 'text-gray-400',
  gold: 'text-yellow-500',
  diamond: 'text-blue-500',
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Clock, Target, Flame, BookOpen, Zap, Star, CheckCircle, Trophy, RefreshCw
}

export function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTier, setSelectedTier] = useState<string>('all')

  useEffect(() => {
    fetchOrInitAchievements()
  }, [])

  async function fetchOrInitAchievements() {
    const { data } = await supabase.from('achievements').select('*').order('tier').order('title')
    if (data && data.length > 0) {
      setAchievements(data)
    } else {
      await supabase.from('achievements').insert(DEFAULT_ACHIEVEMENTS)
      const { data: newData } = await supabase.from('achievements').select('*').order('tier').order('title')
      if (newData) setAchievements(newData)
    }
    setLoading(false)
  }

  async function toggleAchievement(achievement: Achievement) {
    const now = new Date().toISOString()
    const update = achievement.is_unlocked
      ? { is_unlocked: false, unlocked_at: null }
      : { is_unlocked: true, unlocked_at: now }

    await supabase.from('achievements').update(update).eq('id', achievement.id)

    if (!achievement.is_unlocked) {
      toast.success(`Achievement unlocked: ${achievement.title}! 🏆`)
    }
    setAchievements(prev => prev.map(a =>
      a.id === achievement.id ? { ...a, ...update } : a
    ))
  }

  const filtered = selectedTier === 'all'
    ? achievements
    : achievements.filter(a => a.tier === selectedTier)

  const unlockedCount = achievements.filter(a => a.is_unlocked).length
  const tierCounts = {
    bronze: achievements.filter(a => a.tier === 'bronze').length,
    silver: achievements.filter(a => a.tier === 'silver').length,
    gold: achievements.filter(a => a.tier === 'gold').length,
    diamond: achievements.filter(a => a.tier === 'diamond').length,
  }
  const tierUnlocked = {
    bronze: achievements.filter(a => a.tier === 'bronze' && a.is_unlocked).length,
    silver: achievements.filter(a => a.tier === 'silver' && a.is_unlocked).length,
    gold: achievements.filter(a => a.tier === 'gold' && a.is_unlocked).length,
    diamond: achievements.filter(a => a.tier === 'diamond' && a.is_unlocked).length,
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Achievements</h1>
        <p className="text-muted-foreground text-sm">Unlock badges by hitting milestones in your GATE prep</p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <Trophy className="size-10 text-yellow-500" />
          <div className="flex-1">
            <p className="font-bold text-lg">{unlockedCount} / {achievements.length} Achievements</p>
            <div className="flex gap-3 mt-1 flex-wrap">
              {(Object.entries(tierUnlocked) as [keyof typeof tierUnlocked, number][]).map(([tier, count]) => (
                <span key={tier} className={`text-xs font-medium ${TIER_ICON_COLORS[tier]}`}>
                  {tier}: {count}/{tierCounts[tier]}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'bronze', 'silver', 'gold', 'diamond'].map(tier => (
          <Button
            key={tier}
            variant={selectedTier === tier ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTier(tier)}
            className="capitalize"
          >
            {tier === 'all' ? 'All' : (
              <span className={TIER_ICON_COLORS[tier as keyof typeof TIER_ICON_COLORS]}>{tier}</span>
            )}
          </Button>
        ))}
      </div>

      {/* Achievements Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(9)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(achievement => {
            const Icon = ICON_MAP[achievement.icon || 'Trophy'] || Trophy
            return (
              <Card
                key={achievement.id}
                className={`relative cursor-pointer transition-all hover:shadow-md ${achievement.is_unlocked ? TIER_COLORS[achievement.tier] : 'opacity-60'}`}
                onClick={() => toggleAchievement(achievement)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl border-2 ${achievement.is_unlocked ? TIER_COLORS[achievement.tier] : 'bg-muted border-muted'}`}>
                      {achievement.is_unlocked
                        ? <Icon className={`size-6 ${TIER_ICON_COLORS[achievement.tier]}`} />
                        : <Lock className="size-5 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-sm">{achievement.title}</p>
                        {achievement.is_unlocked && (
                          <Unlock className="size-3 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
                      <Badge
                        variant="outline"
                        className={`mt-1.5 text-xs capitalize ${TIER_ICON_COLORS[achievement.tier]}`}
                      >
                        {achievement.tier}
                      </Badge>
                    </div>
                  </div>
                  {achievement.is_unlocked && achievement.unlocked_at && (
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                      Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
