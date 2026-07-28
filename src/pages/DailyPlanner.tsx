import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Trash2, CalendarDays } from 'lucide-react'
import type { DailyPlan, PlanTask, Subject } from '@/lib/supabase'

export function DailyPlanner() {
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [tasks, setTasks] = useState<PlanTask[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [taskForm, setTaskForm] = useState({
    task_text: '', hour_slot: '', subject_id: '', duration_minutes: ''
  })

  useEffect(() => {
    supabase.from('subjects').select('*').order('name').then(({ data }) => {
      if (data) setSubjects(data)
    })
  }, [])

  useEffect(() => {
    loadPlan()
  }, [currentDate])

  async function loadPlan() {
    setLoading(true)
    const { data: planData } = await supabase
      .from('daily_plans').select('*').eq('plan_date', currentDate).maybeSingle()

    if (planData) {
      setPlan(planData)
      const { data: taskData } = await supabase
        .from('plan_tasks').select('*').eq('plan_id', planData.id).order('hour_slot')
      setTasks(taskData || [])
    } else {
      setPlan(null)
      setTasks([])
    }
    setLoading(false)
  }

  async function createPlan(options?: Partial<DailyPlan>) {
    const { data, error } = await supabase.from('daily_plans').insert({
      plan_date: currentDate,
      is_holiday: options?.is_holiday || false,
      is_mock_day: options?.is_mock_day || false,
      is_revision_day: options?.is_revision_day || false,
    }).select().single()
    if (error) { toast.error('Failed to create plan'); return null }
    setPlan(data)
    return data
  }

  async function togglePlanFlag(flag: 'is_holiday' | 'is_mock_day' | 'is_revision_day') {
    if (!plan) return
    const update = { [flag]: !plan[flag] }
    await supabase.from('daily_plans').update(update).eq('id', plan.id)
    setPlan(prev => prev ? { ...prev, [flag]: !prev[flag] } : null)
  }

  async function addTask() {
    if (!taskForm.task_text.trim()) { toast.error('Task text required'); return }

    let currentPlan = plan
    if (!currentPlan) {
      currentPlan = await createPlan()
      if (!currentPlan) return
    }

    const { error } = await supabase.from('plan_tasks').insert({
      plan_id: currentPlan.id,
      task_text: taskForm.task_text,
      hour_slot: parseInt(taskForm.hour_slot) || null,
      subject_id: taskForm.subject_id || null,
      duration_minutes: parseInt(taskForm.duration_minutes) || null,
      is_completed: false
    })
    if (error) { toast.error('Failed'); return }
    toast.success('Task added!')
    setAddTaskOpen(false)
    setTaskForm({ task_text: '', hour_slot: '', subject_id: '', duration_minutes: '' })
    await loadPlan()
  }

  async function toggleTask(task: PlanTask) {
    await supabase.from('plan_tasks').update({ is_completed: !task.is_completed }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_completed: !t.is_completed } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('plan_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function changeDate(delta: number) {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + delta)
    setCurrentDate(d.toISOString().split('T')[0])
  }

  const completedTasks = tasks.filter(t => t.is_completed).length
  const progressPct = tasks.length > 0 ? Math.round(completedTasks / tasks.length * 100) : 0
  const isToday = currentDate === new Date().toISOString().split('T')[0]

  const displayDate = new Date(currentDate + 'T00:00:00').toLocaleDateString('en', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const tasksByHour = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    label: i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`,
    tasks: tasks.filter(t => t.hour_slot === i)
  })).filter(h => h.tasks.length > 0 || [6, 8, 9, 12, 14, 16, 18, 20, 22].includes(h.hour))

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Planner</h1>
          <p className="text-muted-foreground text-sm">Plan your daily study schedule hour by hour</p>
        </div>
        <Button onClick={() => setAddTaskOpen(true)}>
          <Plus className="size-4" /> Add Task
        </Button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex-1 text-center">
          <p className="font-semibold">{displayDate}</p>
          {isToday && <Badge variant="default" className="text-xs mt-0.5">Today</Badge>}
        </div>
        <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Plan Flags */}
      {plan && (
        <div className="flex gap-2 flex-wrap">
          {[
            { flag: 'is_holiday' as const, label: 'Holiday', color: 'destructive' },
            { flag: 'is_mock_day' as const, label: 'Mock Day', color: 'secondary' },
            { flag: 'is_revision_day' as const, label: 'Revision Day', color: 'outline' },
          ].map(item => (
            <Badge
              key={item.flag}
              variant={plan[item.flag] ? (item.color as 'default' | 'destructive' | 'secondary' | 'outline') : 'outline'}
              className="cursor-pointer"
              onClick={() => togglePlanFlag(item.flag)}
            >
              {item.label}
            </Badge>
          ))}
        </div>
      )}

      {/* Progress */}
      {tasks.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Today's Progress</span>
              <span className="text-muted-foreground">{completedTasks}/{tasks.length} tasks</span>
            </div>
            <Progress value={progressPct} className="h-2.5" />
            {progressPct === 100 && (
              <p className="text-xs text-green-500 font-medium mt-2 text-center">
                All tasks completed! Great work today! 🎉
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Schedule */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasksByHour.map(({ hour, label, tasks: hourTasks }) => (
            <div key={hour} className="flex gap-3">
              <div className="w-16 shrink-0 text-xs text-muted-foreground pt-3 text-right font-medium">{label}</div>
              <div className="flex-1 min-h-[3rem] border-l border-border pl-4 space-y-1.5 py-1.5">
                {hourTasks.map(task => {
                  const subject = subjects.find(s => s.id === task.subject_id)
                  return (
                    <div key={task.id} className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${task.is_completed ? 'bg-green-50/50 dark:bg-green-950/20 border-green-500/20' : 'bg-card hover:bg-muted/30'}`}>
                      <Checkbox
                        checked={task.is_completed}
                        onCheckedChange={() => toggleTask(task)}
                        className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                      />
                      <span className={`flex-1 text-sm ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                        {task.task_text}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {subject && <Badge variant="outline" className="text-xs">{subject.name.split(' ')[0]}</Badge>}
                        {task.duration_minutes && <span className="text-xs text-muted-foreground">{task.duration_minutes}m</span>}
                        <Button variant="ghost" size="icon" className="size-6 text-destructive hover:text-destructive" onClick={() => deleteTask(task.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {hourTasks.length === 0 && (
                  <div className="h-7 rounded border border-dashed border-transparent hover:border-border/50 transition-colors" />
                )}
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="border border-dashed rounded-xl p-12 text-center">
              <CalendarDays className="size-10 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium">No tasks planned</p>
              <p className="text-sm text-muted-foreground">Add tasks to plan your day</p>
            </div>
          )}
        </div>
      )}

      {/* Add Task Dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Task *</Label>
              <Input placeholder="e.g. Study Trees Chapter" value={taskForm.task_text} onChange={e => setTaskForm(f => ({ ...f, task_text: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hour Slot (0–23)</Label>
                <Input type="number" min="0" max="23" placeholder="9" value={taskForm.hour_slot} onChange={e => setTaskForm(f => ({ ...f, hour_slot: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (mins)</Label>
                <Input type="number" min="0" placeholder="60" value={taskForm.duration_minutes} onChange={e => setTaskForm(f => ({ ...f, duration_minutes: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select value={taskForm.subject_id} onValueChange={v => setTaskForm(f => ({ ...f, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskOpen(false)}>Cancel</Button>
            <Button onClick={addTask}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
