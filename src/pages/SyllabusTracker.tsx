import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, BookMarked } from 'lucide-react'
import type { Subject, SyllabusTopic } from '@/lib/supabase'
import { GATE_SYLLABUS } from '@/lib/constants'

const WEIGHTAGE_COLORS = {
  high: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
}

const DIFFICULTY_COLORS = {
  hard: 'destructive',
  medium: 'secondary',
  easy: 'outline',
} as const

export function SyllabusTracker() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<SyllabusTopic[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    topic_name: '', subtopic: '',
    weightage: 'medium' as SyllabusTopic['weightage'],
    difficulty: 'medium' as SyllabusTopic['difficulty'],
    priority: 'medium' as SyllabusTopic['priority']
  })

  useEffect(() => {
    supabase.from('subjects').select('*').order('name').then(({ data }) => {
      if (data) {
        setSubjects(data)
        if (data.length > 0) setSelectedSubjectId(data[0].id)
      }
    })
  }, [])

  useEffect(() => {
    if (selectedSubjectId) fetchTopics()
  }, [selectedSubjectId])

  async function fetchTopics() {
    const { data } = await supabase.from('syllabus_topics').select('*')
      .eq('subject_id', selectedSubjectId).order('order_index')
    if (data) setTopics(data)
  }

  async function initializeTopics() {
    const subject = subjects.find(s => s.id === selectedSubjectId)
    if (!subject) return

    const defaultTopics = GATE_SYLLABUS[subject.slug] || []
    if (defaultTopics.length === 0) {
      toast.info('No default topics found for this subject. Add manually.')
      return
    }

    const { data: existing } = await supabase.from('syllabus_topics')
      .select('topic_name').eq('subject_id', selectedSubjectId)
    const existingNames = new Set(existing?.map(t => t.topic_name) || [])

    const toInsert = defaultTopics
      .filter(t => !existingNames.has(t))
      .map((topic, idx) => ({
        subject_id: selectedSubjectId,
        topic_name: topic,
        order_index: (existing?.length || 0) + idx,
        weightage: 'medium' as const,
        difficulty: 'medium' as const,
        priority: 'medium' as const,
      }))

    if (toInsert.length === 0) { toast.info('All topics already added!'); return }
    await supabase.from('syllabus_topics').insert(toInsert)
    toast.success(`Added ${toInsert.length} topics!`)
    fetchTopics()
  }

  async function toggleTopic(topic: SyllabusTopic) {
    await supabase.from('syllabus_topics').update({
      is_completed: !topic.is_completed,
      progress_percent: topic.is_completed ? 0 : 100,
      updated_at: new Date().toISOString()
    }).eq('id', topic.id)
    fetchTopics()
  }

  async function updateProgress(id: string, value: number) {
    await supabase.from('syllabus_topics').update({
      progress_percent: value,
      is_completed: value === 100,
      updated_at: new Date().toISOString()
    }).eq('id', id)
    fetchTopics()
  }

  async function addTopic() {
    if (!form.topic_name.trim()) { toast.error('Topic name required'); return }
    const { error } = await supabase.from('syllabus_topics').insert({
      subject_id: selectedSubjectId,
      topic_name: form.topic_name,
      subtopic: form.subtopic || null,
      weightage: form.weightage,
      difficulty: form.difficulty,
      priority: form.priority,
      order_index: topics.length
    })
    if (error) { toast.error('Failed'); return }
    toast.success('Topic added!')
    setAddOpen(false)
    setForm({ topic_name: '', subtopic: '', weightage: 'medium', difficulty: 'medium', priority: 'medium' })
    fetchTopics()
  }

  const completedTopics = topics.filter(t => t.is_completed).length
  const progressPct = topics.length > 0 ? Math.round(completedTopics / topics.length * 100) : 0
  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Syllabus Tracker</h1>
          <p className="text-muted-foreground text-sm">Track GATE CSE syllabus coverage topic by topic</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={initializeTopics} disabled={!selectedSubjectId}>
            Auto-fill Syllabus
          </Button>
          <Button onClick={() => setAddOpen(true)} disabled={!selectedSubjectId}>
            <Plus className="size-4" /> Add Topic
          </Button>
        </div>
      </div>

      {/* Subject Selector + Progress */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
          <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Select subject" /></SelectTrigger>
          <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
        {topics.length > 0 && (
          <div className="flex items-center gap-3 flex-1">
            <Progress value={progressPct} className="flex-1 h-2.5" />
            <span className="text-sm font-medium whitespace-nowrap">{completedTopics}/{topics.length} ({progressPct}%)</span>
          </div>
        )}
      </div>

      {/* Overall subject progress summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {subjects.slice(0, 8).map(s => {
          const subTopics = topics.filter(t => t.subject_id === s.id)
          const done = subTopics.filter(t => t.is_completed).length
          const pct = subTopics.length > 0 ? Math.round(done / subTopics.length * 100) : 0
          return (
            <button
              key={s.id}
              className={`text-left p-2 rounded-lg border text-xs transition-colors ${selectedSubjectId === s.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}
              onClick={() => setSelectedSubjectId(s.id)}
            >
              <p className="font-medium truncate">{s.name.split(' ')[0]}</p>
              <Progress value={pct} className="h-1 mt-1" />
              <p className="text-muted-foreground mt-0.5">{pct}%</p>
            </button>
          )
        })}
      </div>

      {/* Topics List */}
      {topics.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center">
          <BookMarked className="size-10 text-muted-foreground mx-auto mb-2" />
          <p className="font-medium">No topics yet</p>
          <p className="text-sm text-muted-foreground">Click "Auto-fill Syllabus" to load GATE syllabus topics</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topics.map(topic => (
            <Card key={topic.id} className={topic.is_completed ? 'border-green-500/20 bg-green-50/20 dark:bg-green-950/10' : ''}>
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={topic.is_completed}
                    onCheckedChange={() => toggleTopic(topic)}
                    className="mt-0.5 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${topic.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                        {topic.topic_name}
                      </span>
                      {topic.subtopic && <span className="text-xs text-muted-foreground">— {topic.subtopic}</span>}
                      {topic.weightage && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${WEIGHTAGE_COLORS[topic.weightage]}`}>
                          {topic.weightage} wt.
                        </span>
                      )}
                      {topic.difficulty && (
                        <Badge variant={DIFFICULTY_COLORS[topic.difficulty]} className="text-xs">
                          {topic.difficulty}
                        </Badge>
                      )}
                      {topic.priority === 'high' && (
                        <Badge variant="destructive" className="text-xs">High Priority</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={topic.progress_percent} className="flex-1 h-1.5" />
                      <span className="text-xs text-muted-foreground w-8">{topic.progress_percent}%</span>
                      <div className="flex gap-1">
                        {[0, 25, 50, 75, 100].map(pct => (
                          <button
                            key={pct}
                            className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${topic.progress_percent === pct ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                            onClick={() => updateProgress(topic.id, pct)}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Syllabus Topic</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Topic Name *</Label>
              <Input placeholder="e.g. Dynamic Programming" value={form.topic_name} onChange={e => setForm(f => ({ ...f, topic_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Subtopic</Label>
              <Input placeholder="e.g. Knapsack Problem" value={form.subtopic} onChange={e => setForm(f => ({ ...f, subtopic: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Weightage</Label>
                <Select value={form.weightage || ''} onValueChange={v => setForm(f => ({ ...f, weightage: v as SyllabusTopic['weightage'] }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Difficulty</Label>
                <Select value={form.difficulty || ''} onValueChange={v => setForm(f => ({ ...f, difficulty: v as SyllabusTopic['difficulty'] }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority || ''} onValueChange={v => setForm(f => ({ ...f, priority: v as SyllabusTopic['priority'] }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addTopic}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
