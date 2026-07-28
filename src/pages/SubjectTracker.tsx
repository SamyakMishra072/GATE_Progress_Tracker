import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { GATE_SUBJECTS, SUBJECT_TEXT_COLORS, SUBJECT_BG_COLORS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, ChevronRight, BookOpen, Clock, RefreshCw } from 'lucide-react'
import type { Subject } from '@/lib/supabase'

export function SubjectTracker() {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [editSubject, setEditSubject] = useState<Subject | null>(null)
  const [form, setForm] = useState({ total_chapters: '' })

  useEffect(() => { fetchSubjects() }, [])

  async function fetchSubjects() {
    setLoading(true)
    const { data } = await supabase.from('subjects').select('*').order('name')
    if (data) setSubjects(data)
    setLoading(false)
  }

  async function initializeSubjects() {
    const existing = await supabase.from('subjects').select('slug')
    const existingSlugs = new Set(existing.data?.map(s => s.slug) ?? [])

    const toInsert = GATE_SUBJECTS.filter(s => !existingSlugs.has(s.slug)).map(s => ({
      name: s.name, slug: s.slug, icon: s.icon, color: s.color,
      total_chapters: 0, completed_chapters: 0
    }))

    if (toInsert.length > 0) {
      const { error } = await supabase.from('subjects').insert(toInsert)
      if (error) { toast.error('Failed to initialize subjects'); return }
    }
    toast.success('Subjects initialized!')
    fetchSubjects()
  }

  async function updateChapters() {
    if (!editSubject) return
    const total = parseInt(form.total_chapters)
    if (isNaN(total) || total < 0) { toast.error('Invalid chapter count'); return }
    const { error } = await supabase
      .from('subjects')
      .update({ total_chapters: total, updated_at: new Date().toISOString() })
      .eq('id', editSubject.id)
    if (error) { toast.error('Update failed'); return }
    toast.success('Updated!')
    setEditSubject(null)
    fetchSubjects()
  }

  async function markRevision(subject: Subject) {
    await supabase.from('subjects')
      .update({ revision_count: subject.revision_count + 1, updated_at: new Date().toISOString() })
      .eq('id', subject.id)
    toast.success(`Revision recorded for ${subject.name}`)
    fetchSubjects()
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subject Tracker</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track your progress across all 12 GATE CSE subjects</p>
        </div>
        <div className="flex gap-2">
          {subjects.length === 0 && (
            <Button onClick={initializeSubjects} variant="outline">
              <Plus className="size-4" /> Initialize All Subjects
            </Button>
          )}
          <Button onClick={() => { setAddOpen(true) }}>
            <Plus className="size-4" /> Add Subject
          </Button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center">
          <BookOpen className="size-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">No subjects yet</p>
          <p className="text-sm text-muted-foreground">Click "Initialize All Subjects" to add all 12 GATE CSE subjects</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(subject => {
            const pct = subject.total_chapters > 0
              ? Math.round(subject.completed_chapters / subject.total_chapters * 100) : 0
            const color = subject.color || 'blue'
            return (
              <Card key={subject.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${SUBJECT_BG_COLORS[color]} ${SUBJECT_TEXT_COLORS[color]} text-lg font-bold`}>
                        {subject.icon}
                      </div>
                      <div>
                        <CardTitle className="text-sm leading-tight">{subject.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {subject.completed_chapters}/{subject.total_chapters} chapters
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={pct >= 100 ? 'default' : pct >= 50 ? 'secondary' : 'outline'}
                      className="shrink-0"
                    >
                      {pct}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={pct} className="h-2" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> {subject.study_hours}h studied
                    </span>
                    <span className="flex items-center gap-1">
                      <RefreshCw className="size-3" /> {subject.revision_count} revisions
                    </span>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm" variant="outline" className="flex-1 text-xs"
                      onClick={() => navigate(`/chapters/${subject.slug}`)}
                    >
                      Chapters <ChevronRight className="size-3" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="text-xs"
                      onClick={() => { setEditSubject(subject); setForm({ total_chapters: String(subject.total_chapters) }) }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="text-xs"
                      onClick={() => markRevision(subject)}
                    >
                      <RefreshCw className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editSubject} onOpenChange={v => !v && setEditSubject(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit {editSubject?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Total Chapters</Label>
              <Input
                type="number" min="0" placeholder="e.g. 10"
                value={form.total_chapters}
                onChange={e => setForm({ total_chapters: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSubject(null)}>Cancel</Button>
            <Button onClick={updateChapters}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subject Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Custom Subject</DialogTitle>
          </DialogHeader>
          <AddSubjectForm onSuccess={() => { setAddOpen(false); fetchSubjects() }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddSubjectForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('')
  const [chapters, setChapters] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim()) { toast.error('Name required'); return }
    setSaving(true)
    const { error } = await supabase.from('subjects').insert({
      name: name.trim(),
      slug: name.toLowerCase().replace(/\s+/g, '-').slice(0, 30),
      icon: '📚', color: 'blue',
      total_chapters: parseInt(chapters) || 0,
      completed_chapters: 0
    })
    setSaving(false)
    if (error) { toast.error('Failed'); return }
    toast.success('Subject added!')
    onSuccess()
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Subject Name</Label>
        <Input placeholder="e.g. Discrete Math" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Total Chapters</Label>
        <Input type="number" min="0" placeholder="0" value={chapters} onChange={e => setChapters(e.target.value)} />
      </div>
      <DialogFooter>
        <Button onClick={save} disabled={saving}>Add Subject</Button>
      </DialogFooter>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  )
}
