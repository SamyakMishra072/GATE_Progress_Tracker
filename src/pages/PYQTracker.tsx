import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Plus, CheckCircle, XCircle, Trash2, Filter } from 'lucide-react'
import type { PYQAttempt, Subject } from '@/lib/supabase'

const YEARS = Array.from({ length: 15 }, (_, i) => 2024 - i)

export function PYQTracker() {
  const [attempts, setAttempts] = useState<PYQAttempt[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [form, setForm] = useState({
    subject_id: '', year: String(new Date().getFullYear()),
    question_number: '', topic: '', attempted: true, correct: false,
    marks_obtained: '', marks_possible: '', time: '', notes: ''
  })

  useEffect(() => {
    Promise.all([
      supabase.from('pyq_attempts').select('*').order('year', { ascending: false }),
      supabase.from('subjects').select('*').order('name')
    ]).then(([a, s]) => {
      if (a.data) setAttempts(a.data)
      if (s.data) setSubjects(s.data)
    })
  }, [])

  async function addAttempt() {
    const year = parseInt(form.year)
    if (!year) { toast.error('Year required'); return }
    const { error } = await supabase.from('pyq_attempts').insert({
      subject_id: form.subject_id || null,
      year,
      question_number: parseInt(form.question_number) || null,
      topic: form.topic || null,
      attempted: form.attempted,
      correct: form.correct,
      marks_obtained: parseFloat(form.marks_obtained) || null,
      marks_possible: parseFloat(form.marks_possible) || null,
      time_taken_minutes: parseInt(form.time) || null,
      notes: form.notes || null
    })
    if (error) { toast.error('Failed'); return }
    toast.success('PYQ attempt logged!')
    setAddOpen(false)
    setForm({ subject_id: '', year: String(new Date().getFullYear()), question_number: '', topic: '', attempted: true, correct: false, marks_obtained: '', marks_possible: '', time: '', notes: '' })
    const { data } = await supabase.from('pyq_attempts').select('*').order('year', { ascending: false })
    if (data) setAttempts(data)
  }

  async function toggleCorrect(attempt: PYQAttempt) {
    await supabase.from('pyq_attempts').update({ correct: !attempt.correct }).eq('id', attempt.id)
    setAttempts(prev => prev.map(a => a.id === attempt.id ? { ...a, correct: !a.correct } : a))
  }

  async function deleteAttempt(id: string) {
    await supabase.from('pyq_attempts').delete().eq('id', id)
    setAttempts(prev => prev.filter(a => a.id !== id))
    toast.success('Deleted')
  }

  const filtered = attempts.filter(a => {
    if (filterYear !== 'all' && String(a.year) !== filterYear) return false
    if (filterSubject !== 'all' && a.subject_id !== filterSubject) return false
    return true
  })

  const totalAttempted = filtered.filter(a => a.attempted).length
  const totalCorrect = filtered.filter(a => a.correct).length
  const acc = totalAttempted > 0 ? Math.round(totalCorrect / totalAttempted * 100) : 0

  const yearStats = YEARS.slice(0, 10).map(y => {
    const yearAttempts = attempts.filter(a => a.year === y)
    const correct = yearAttempts.filter(a => a.correct).length
    return {
      year: y,
      total: yearAttempts.length,
      correct,
      acc: yearAttempts.length > 0 ? Math.round(correct / yearAttempts.length * 100) : 0
    }
  }).filter(y => y.total > 0)

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PYQ Tracker</h1>
          <p className="text-muted-foreground text-sm">Track previous year question attempts</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Log PYQ
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{attempts.length}</p>
          <p className="text-xs text-muted-foreground">Total PYQs</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{totalCorrect}</p>
          <p className="text-xs text-muted-foreground">Correct</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{acc}%</p>
          <p className="text-xs text-muted-foreground">Accuracy</p>
        </CardContent></Card>
      </div>

      {/* Year Stats */}
      {yearStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Year-wise Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {yearStats.map(y => (
                <div key={y.year} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-10 shrink-0">{y.year}</span>
                  <Progress value={y.acc} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground w-16 text-right">{y.correct}/{y.total} ({y.acc}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter className="size-4 text-muted-foreground" />
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="w-44 h-8"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline">{filtered.length} records</Badge>
      </div>

      {/* Attempts List */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No PYQ attempts yet</p>
          ) : (
            <div className="divide-y">
              {filtered.map(a => {
                const subjectName = subjects.find(s => s.id === a.subject_id)?.name
                return (
                  <div key={a.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={!!a.correct}
                        onCheckedChange={() => toggleCorrect(a)}
                        className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{a.year}</Badge>
                          {a.question_number && <span className="text-sm">Q{a.question_number}</span>}
                          {subjectName && <Badge variant="secondary" className="text-xs">{subjectName.split(' ')[0]}</Badge>}
                          {a.topic && <span className="text-xs text-muted-foreground">{a.topic}</span>}
                        </div>
                        {a.marks_obtained != null && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Marks: {a.marks_obtained}/{a.marks_possible}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.correct
                        ? <CheckCircle className="size-4 text-green-500" />
                        : <XCircle className="size-4 text-red-400" />
                      }
                      <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteAttempt(a.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Log PYQ Attempt</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Year *</Label>
              <Select value={form.year} onValueChange={v => setForm(f => ({ ...f, year: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Q. Number</Label>
              <Input type="number" min="1" placeholder="e.g. 42" value={form.question_number} onChange={e => setForm(f => ({ ...f, question_number: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Subject</Label>
              <Select value={form.subject_id} onValueChange={v => setForm(f => ({ ...f, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Topic</Label>
              <Input placeholder="e.g. Sorting" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Marks Obtained</Label>
              <Input type="number" step="0.5" placeholder="2" value={form.marks_obtained} onChange={e => setForm(f => ({ ...f, marks_obtained: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Marks Possible</Label>
              <Input type="number" step="0.5" placeholder="2" value={form.marks_possible} onChange={e => setForm(f => ({ ...f, marks_possible: e.target.value }))} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Checkbox checked={form.correct} onCheckedChange={v => setForm(f => ({ ...f, correct: !!v }))} />
              <Label>Got it correct</Label>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addAttempt}>Log</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
