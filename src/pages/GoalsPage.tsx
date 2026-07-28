import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Trash2, Target } from 'lucide-react'
import type { Goal } from '@/lib/supabase'

const METRIC_LABELS: Record<string, string> = {
  study_hours: 'Study Hours',
  questions: 'Questions Solved',
  lectures: 'Lectures Done',
  revisions: 'Revisions',
  mock_tests: 'Mock Tests'
}

const METRIC_ICONS: Record<string, string> = {
  study_hours: '⏱️',
  questions: '✍️',
  lectures: '📖',
  revisions: '🔄',
  mock_tests: '📝'
}

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('daily')
  const [form, setForm] = useState({
    goal_type: 'daily' as 'daily' | 'weekly' | 'monthly',
    metric: 'study_hours' as Goal['metric'],
    target_value: ''
  })

  useEffect(() => { fetchGoals() }, [])

  async function fetchGoals() {
    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false })
    if (data) setGoals(data)
  }

  async function addGoal() {
    if (!form.target_value) { toast.error('Target required'); return }

    const today = new Date()
    let periodStart = today.toISOString().split('T')[0]
    let periodEnd = periodStart

    if (form.goal_type === 'daily') {
      periodEnd = periodStart
    } else if (form.goal_type === 'weekly') {
      const start = new Date(today)
      start.setDate(today.getDate() - today.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      periodStart = start.toISOString().split('T')[0]
      periodEnd = end.toISOString().split('T')[0]
    } else {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      periodStart = start.toISOString().split('T')[0]
      periodEnd = end.toISOString().split('T')[0]
    }

    const { error } = await supabase.from('goals').insert({
      goal_type: form.goal_type,
      metric: form.metric,
      target_value: parseFloat(form.target_value),
      current_value: 0,
      period_start: periodStart,
      period_end: periodEnd,
      is_achieved: false
    })
    if (error) { toast.error('Failed'); return }
    toast.success('Goal added!')
    setAddOpen(false)
    setForm({ goal_type: 'daily', metric: 'study_hours', target_value: '' })
    fetchGoals()
  }

  async function updateProgress(goal: Goal, value: string) {
    const val = parseFloat(value) || 0
    const achieved = val >= goal.target_value
    await supabase.from('goals').update({
      current_value: val,
      is_achieved: achieved,
      updated_at: new Date().toISOString()
    }).eq('id', goal.id)

    if (achieved && !goal.is_achieved) toast.success(`Goal achieved: ${METRIC_LABELS[goal.metric]}! 🎉`)
    fetchGoals()
  }

  async function deleteGoal(id: string) {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
    toast.success('Deleted')
  }

  const filteredGoals = goals.filter(g => g.goal_type === activeTab)

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground text-sm">Set and track daily, weekly, and monthly targets</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Add Goal
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {['daily', 'weekly', 'monthly'].map(type => {
          const typeGoals = goals.filter(g => g.goal_type === type)
          const achieved = typeGoals.filter(g => g.is_achieved).length
          return (
            <Card key={type}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{achieved}/{typeGoals.length}</p>
                <p className="text-xs text-muted-foreground capitalize">{type}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="daily">Daily ({goals.filter(g => g.goal_type === 'daily').length})</TabsTrigger>
          <TabsTrigger value="weekly">Weekly ({goals.filter(g => g.goal_type === 'weekly').length})</TabsTrigger>
          <TabsTrigger value="monthly">Monthly ({goals.filter(g => g.goal_type === 'monthly').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="mt-3 space-y-3">
            {filteredGoals.length === 0 ? (
              <div className="border border-dashed rounded-xl p-10 text-center">
                <Target className="size-10 text-muted-foreground mx-auto mb-2" />
                <p className="font-medium">No {activeTab} goals yet</p>
                <p className="text-sm text-muted-foreground">Set targets to stay motivated</p>
              </div>
            ) : filteredGoals.map(goal => {
              const pct = Math.min(100, Math.round(goal.current_value / goal.target_value * 100))
              return (
                <Card key={goal.id} className={goal.is_achieved ? 'border-green-500/30 bg-green-50/20 dark:bg-green-950/10' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl">{METRIC_ICONS[goal.metric]}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{METRIC_LABELS[goal.metric]}</span>
                            {goal.is_achieved && (
                              <Badge className="bg-green-500 hover:bg-green-600 text-xs">Achieved!</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {goal.current_value} / {goal.target_value} {goal.metric === 'study_hours' ? 'hours' : goal.metric === 'questions' ? 'questions' : 'completed'}
                          </p>
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Progress</span>
                              <span className="font-medium">{pct}%</span>
                            </div>
                            <Progress value={pct} className="h-2" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          className="w-20 h-8 text-xs"
                          placeholder="Update"
                          onBlur={e => e.target.value && updateProgress(goal, e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && updateProgress(goal, (e.target as HTMLInputElement).value)}
                        />
                        <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteGoal(goal.id)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Goal</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.goal_type} onValueChange={v => setForm(f => ({ ...f, goal_type: v as Goal['goal_type'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Metric</Label>
              <Select value={form.metric} onValueChange={v => setForm(f => ({ ...f, metric: v as Goal['metric'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(METRIC_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Target Value</Label>
              <Input
                type="number" min="0" step="0.5"
                placeholder={form.metric === 'study_hours' ? 'e.g. 8' : 'e.g. 50'}
                value={form.target_value}
                onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addGoal}>Add Goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
