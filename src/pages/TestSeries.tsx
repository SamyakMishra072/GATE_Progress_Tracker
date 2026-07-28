import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { Test, Subject } from '@/lib/supabase'

export function TestSeries() {
  const [tests, setTests] = useState<Test[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [form, setForm] = useState({
    name: '', test_type: 'full_length' as 'chapter' | 'subject' | 'full_length',
    subject_id: '', test_date: new Date().toISOString().split('T')[0],
    total_marks: '', obtained_marks: '', total_questions: '',
    attempted_questions: '', correct_answers: '', time: '',
    rank: '', percentile: '', notes: ''
  })

  useEffect(() => {
    Promise.all([
      supabase.from('tests').select('*').order('test_date', { ascending: false }),
      supabase.from('subjects').select('*').order('name')
    ]).then(([t, s]) => {
      if (t.data) setTests(t.data)
      if (s.data) setSubjects(s.data)
    })
  }, [])

  async function addTest() {
    if (!form.name.trim()) { toast.error('Test name required'); return }
    const { error } = await supabase.from('tests').insert({
      name: form.name,
      test_type: form.test_type,
      subject_id: form.subject_id || null,
      test_date: form.test_date || null,
      total_marks: parseFloat(form.total_marks) || null,
      obtained_marks: parseFloat(form.obtained_marks) || null,
      total_questions: parseInt(form.total_questions) || null,
      attempted_questions: parseInt(form.attempted_questions) || null,
      correct_answers: parseInt(form.correct_answers) || null,
      time_taken_minutes: parseInt(form.time) || null,
      rank: parseInt(form.rank) || null,
      percentile: parseFloat(form.percentile) || null,
      notes: form.notes || null
    })
    if (error) { toast.error('Failed'); return }
    toast.success('Test recorded!')
    setAddOpen(false)
    setForm({ name: '', test_type: 'full_length', subject_id: '', test_date: new Date().toISOString().split('T')[0], total_marks: '', obtained_marks: '', total_questions: '', attempted_questions: '', correct_answers: '', time: '', rank: '', percentile: '', notes: '' })
    const { data } = await supabase.from('tests').select('*').order('test_date', { ascending: false })
    if (data) setTests(data)
  }

  async function deleteTest(id: string) {
    await supabase.from('tests').delete().eq('id', id)
    setTests(prev => prev.filter(t => t.id !== id))
    toast.success('Deleted')
  }

  const filtered = activeTab === 'all' ? tests : tests.filter(t => t.test_type === activeTab)
  const fullLengthTests = tests.filter(t => t.test_type === 'full_length' && t.total_marks && t.obtained_marks)
  const avgScore = fullLengthTests.length > 0
    ? Math.round(fullLengthTests.reduce((s, t) => s + (t.obtained_marks! / t.total_marks! * 100), 0) / fullLengthTests.length)
    : 0
  const bestScore = fullLengthTests.length > 0
    ? Math.max(...fullLengthTests.map(t => Math.round(t.obtained_marks! / t.total_marks! * 100)))
    : 0

  const chartData = fullLengthTests.slice().reverse().slice(-10).map(t => ({
    name: new Date(t.test_date!).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    score: Math.round(t.obtained_marks! / t.total_marks! * 100),
    percentile: t.percentile
  }))

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Test Series Tracker</h1>
          <p className="text-muted-foreground text-sm">Track chapter tests, subject tests, and full-length mock tests</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" /> Record Test
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{tests.length}</p>
          <p className="text-xs text-muted-foreground">Total Tests</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{fullLengthTests.length}</p>
          <p className="text-xs text-muted-foreground">Full-length Mocks</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-500">{avgScore}%</p>
          <p className="text-xs text-muted-foreground">Avg Score</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{bestScore}%</p>
          <p className="text-xs text-muted-foreground">Best Score</p>
        </CardContent></Card>
      </div>

      {/* Score Trend Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Mock Test Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ score: { label: 'Score %', color: 'var(--chart-1)' } }} className="min-h-[160px]">
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="score" stroke="var(--color-score)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Test List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({tests.length})</TabsTrigger>
          <TabsTrigger value="full_length">Full-length ({tests.filter(t => t.test_type === 'full_length').length})</TabsTrigger>
          <TabsTrigger value="subject">Subject ({tests.filter(t => t.test_type === 'subject').length})</TabsTrigger>
          <TabsTrigger value="chapter">Chapter ({tests.filter(t => t.test_type === 'chapter').length})</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <Card className="mt-3">
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No tests recorded</p>
              ) : (
                <div className="divide-y">
                  {filtered.map(t => {
                    const pct = t.total_marks && t.obtained_marks
                      ? Math.round(t.obtained_marks / t.total_marks * 100) : null
                    const subjectName = subjects.find(s => s.id === t.subject_id)?.name

                    return (
                      <div key={t.id} className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{t.name}</span>
                              <Badge variant="outline" className="capitalize text-xs">
                                {t.test_type.replace('_', ' ')}
                              </Badge>
                              {subjectName && <Badge variant="secondary" className="text-xs">{subjectName.split(' ')[0]}</Badge>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                              {t.test_date && <span>{new Date(t.test_date).toLocaleDateString()}</span>}
                              {pct !== null && (
                                <span className="flex items-center gap-1">
                                  {pct >= avgScore ? <TrendingUp className="size-3 text-green-500" /> : <TrendingDown className="size-3 text-red-500" />}
                                  {t.obtained_marks}/{t.total_marks} ({pct}%)
                                </span>
                              )}
                              {t.percentile && <span>Percentile: {t.percentile}%</span>}
                              {t.rank && <span>Rank: {t.rank}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {pct !== null && (
                              <div className="text-right hidden sm:block">
                                <p className="text-lg font-bold">{pct}%</p>
                                <Progress value={pct} className="w-16 h-1" />
                              </div>
                            )}
                            <Button variant="ghost" size="icon" className="size-7 text-destructive hover:text-destructive" onClick={() => deleteTest(t.id)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Record Test</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[70vh] overflow-y-auto">
            <div className="col-span-2 space-y-1.5">
              <Label>Test Name *</Label>
              <Input placeholder="e.g. MADE Easy Full Mock 1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Type *</Label>
              <Select value={form.test_type} onValueChange={v => setForm(f => ({ ...f, test_type: v as 'chapter' | 'subject' | 'full_length' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chapter">Chapter Test</SelectItem>
                  <SelectItem value="subject">Subject Test</SelectItem>
                  <SelectItem value="full_length">Full Length</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.test_date} onChange={e => setForm(f => ({ ...f, test_date: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Subject (for chapter/subject tests)</Label>
              <Select value={form.subject_id} onValueChange={v => setForm(f => ({ ...f, subject_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Total Marks</Label>
              <Input type="number" placeholder="100" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Obtained Marks</Label>
              <Input type="number" placeholder="72" value={form.obtained_marks} onChange={e => setForm(f => ({ ...f, obtained_marks: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Questions</Label>
              <Input type="number" placeholder="65" value={form.total_questions} onChange={e => setForm(f => ({ ...f, total_questions: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Attempted</Label>
              <Input type="number" placeholder="60" value={form.attempted_questions} onChange={e => setForm(f => ({ ...f, attempted_questions: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Percentile</Label>
              <Input type="number" step="0.1" placeholder="85.5" value={form.percentile} onChange={e => setForm(f => ({ ...f, percentile: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Rank</Label>
              <Input type="number" placeholder="1234" value={form.rank} onChange={e => setForm(f => ({ ...f, rank: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Weak areas, observations..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addTest}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
