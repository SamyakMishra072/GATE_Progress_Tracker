import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Plus, BookOpen, CheckCircle2, Circle, Trash2, RefreshCw } from 'lucide-react'
import type { Subject, Chapter } from '@/lib/supabase'
import { SUBJECT_BG_COLORS, SUBJECT_TEXT_COLORS } from '@/lib/constants'

const CHECKBOXES: { key: keyof Chapter; label: string }[] = [
  { key: 'lecture_done', label: 'Lecture' },
  { key: 'notes_done', label: 'Notes' },
  { key: 'pyqs_done', label: 'PYQs' },
  { key: 'dpp_done', label: 'DPP' },
  { key: 'revision_done', label: 'Revision' },
  { key: 'formula_sheet_ready', label: 'Formula Sheet' },
]

export function ChapterTracker() {
  const { subjectSlug } = useParams()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [newChapterName, setNewChapterName] = useState('')

  useEffect(() => {
    supabase.from('subjects').select('*').order('name').then(({ data }) => {
      if (data) {
        setSubjects(data)
        if (subjectSlug) {
          const found = data.find(s => s.slug === subjectSlug)
          if (found) setSelectedSubjectId(found.id)
          else if (data.length > 0) setSelectedSubjectId(data[0].id)
        } else if (data.length > 0) {
          setSelectedSubjectId(data[0].id)
        }
      }
      setLoading(false)
    })
  }, [subjectSlug])

  useEffect(() => {
    if (selectedSubjectId) fetchChapters()
  }, [selectedSubjectId])

  async function fetchChapters() {
    const { data } = await supabase
      .from('chapters').select('*')
      .eq('subject_id', selectedSubjectId)
      .order('order_index')
    if (data) setChapters(data)
  }

  async function addChapter() {
    if (!newChapterName.trim()) { toast.error('Chapter name required'); return }
    const { error } = await supabase.from('chapters').insert({
      subject_id: selectedSubjectId,
      name: newChapterName.trim(),
      order_index: chapters.length + 1
    })
    if (error) { toast.error('Failed to add chapter'); return }
    toast.success('Chapter added!')
    setNewChapterName('')
    setAddOpen(false)
    await fetchChapters()
    await updateSubjectCompletedCount()
  }

  async function toggleCheck(chapter: Chapter, field: keyof Chapter) {
    const update = { [field]: !chapter[field], updated_at: new Date().toISOString() }
    await supabase.from('chapters').update(update).eq('id', chapter.id)
    await fetchChapters()
    await updateSubjectCompletedCount()
  }

  async function deleteChapter(id: string) {
    await supabase.from('chapters').delete().eq('id', id)
    toast.success('Chapter deleted')
    await fetchChapters()
    await updateSubjectCompletedCount()
  }

  async function updateSubjectCompletedCount() {
    const { data } = await supabase.from('chapters')
      .select('id, lecture_done, notes_done, pyqs_done, revision_done')
      .eq('subject_id', selectedSubjectId)
    if (!data) return
    const completed = data.filter(c => c.lecture_done && c.revision_done).length
    await supabase.from('subjects')
      .update({ total_chapters: data.length, completed_chapters: completed })
      .eq('id', selectedSubjectId)
  }

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId)
  const completedChapters = chapters.filter(c => CHECKBOXES.every(cb => c[cb.key])).length
  const progressPct = chapters.length > 0 ? Math.round(completedChapters / chapters.length * 100) : 0
  const color = selectedSubject?.color || 'blue'

  if (loading) return (
    <div className="p-6 space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
    </div>
  )

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chapter Tracker</h1>
          <p className="text-muted-foreground text-sm">Track lecture, notes, PYQs, DPP, revision & formula sheet</p>
        </div>
        <Button onClick={() => setAddOpen(true)} disabled={!selectedSubjectId}>
          <Plus className="size-4" /> Add Chapter
        </Button>
      </div>

      {/* Subject Selector */}
      <div className="flex items-center gap-3">
        <Label className="shrink-0">Subject:</Label>
        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSubject && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex size-10 items-center justify-center rounded-lg ${SUBJECT_BG_COLORS[color]} ${SUBJECT_TEXT_COLORS[color]} text-lg font-bold`}>
                {selectedSubject.icon}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{selectedSubject.name}</p>
                <p className="text-xs text-muted-foreground">{completedChapters}/{chapters.length} chapters fully done</p>
              </div>
              <Badge variant={progressPct === 100 ? 'default' : 'secondary'}>{progressPct}%</Badge>
            </div>
            <Progress value={progressPct} className="h-2" />
          </CardContent>
        </Card>
      )}

      {chapters.length === 0 ? (
        <div className="border border-dashed rounded-xl p-12 text-center">
          <BookOpen className="size-10 text-muted-foreground mx-auto mb-2" />
          <p className="font-medium">No chapters yet</p>
          <p className="text-sm text-muted-foreground">Add chapters to start tracking your progress</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header Row */}
          <div className="hidden md:grid grid-cols-[2fr_repeat(6,_1fr)_auto] gap-2 px-4 text-xs text-muted-foreground font-medium">
            <span>Chapter</span>
            {CHECKBOXES.map(cb => <span key={cb.key} className="text-center">{cb.label}</span>)}
            <span></span>
          </div>

          {chapters.map((ch, idx) => {
            const allDone = CHECKBOXES.every(cb => ch[cb.key])
            return (
              <Card key={ch.id} className={allDone ? 'border-green-500/30 bg-green-50/30 dark:bg-green-950/10' : ''}>
                <CardContent className="p-3">
                  <div className="flex flex-col md:grid md:grid-cols-[2fr_repeat(6,_1fr)_auto] gap-3 md:gap-2 items-start md:items-center">
                    <div className="flex items-center gap-2">
                      {allDone
                        ? <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                        : <Circle className="size-4 text-muted-foreground shrink-0" />
                      }
                      <span className="text-sm font-medium">
                        {idx + 1}. {ch.name}
                      </span>
                      {ch.revision_count > 0 && (
                        <Badge variant="outline" className="text-xs ml-auto md:ml-0">
                          <RefreshCw className="size-2.5 mr-1" />{ch.revision_count}
                        </Badge>
                      )}
                    </div>

                    <div className="flex md:contents gap-4 flex-wrap">
                      {CHECKBOXES.map(cb => (
                        <div key={cb.key} className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground md:hidden">{cb.label}</span>
                          <Checkbox
                            checked={!!ch[cb.key]}
                            onCheckedChange={() => toggleCheck(ch, cb.key)}
                            className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                          />
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="ghost" size="icon"
                      className="size-7 text-destructive hover:text-destructive ml-auto"
                      onClick={() => deleteChapter(ch.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Chapter</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label>Chapter Name</Label>
              <Input
                placeholder="e.g. Arrays and Sorting"
                value={newChapterName}
                onChange={e => setNewChapterName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addChapter()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addChapter}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
