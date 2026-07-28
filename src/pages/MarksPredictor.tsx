import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Calculator, TrendingUp, Info } from 'lucide-react'

const GATE_SUBJECTS_MARKS: Record<string, { name: string; maxMarks: number; questions: number; weightage: number }> = {
  'engg-math': { name: 'Engineering Mathematics', maxMarks: 13, questions: 9, weightage: 13 },
  'general-aptitude': { name: 'General Aptitude', maxMarks: 15, questions: 10, weightage: 15 },
  'coa': { name: 'Comp. Org. & Arch.', maxMarks: 5, questions: 4, weightage: 5 },
  'algorithms': { name: 'Algorithms', maxMarks: 7, questions: 5, weightage: 7 },
  'pds': { name: 'Prog. & Data Structures', maxMarks: 6, questions: 5, weightage: 6 },
  'toc': { name: 'Theory of Computation', maxMarks: 7, questions: 5, weightage: 7 },
  'compiler': { name: 'Compiler Design', maxMarks: 5, questions: 4, weightage: 5 },
  'os': { name: 'Operating Systems', maxMarks: 9, questions: 7, weightage: 9 },
  'dbms': { name: 'Databases', maxMarks: 7, questions: 5, weightage: 7 },
  'cn': { name: 'Computer Networks', maxMarks: 7, questions: 6, weightage: 7 },
  'digital-logic': { name: 'Digital Logic', maxMarks: 5, questions: 4, weightage: 5 },
}

export function MarksPredictor() {
  const [subjectScores, setSubjectScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    Object.keys(GATE_SUBJECTS_MARKS).forEach(k => { initial[k] = 0 })
    return initial
  })

  const updateScore = (slug: string, value: number) => {
    setSubjectScores(prev => ({ ...prev, [slug]: value }))
  }

  const totalPredicted = Object.entries(subjectScores).reduce((sum, [slug, score]) => {
    const subject = GATE_SUBJECTS_MARKS[slug]
    if (!subject) return sum
    return sum + (score / 100) * subject.maxMarks
  }, 0)

  const roundedTotal = Math.round(totalPredicted * 100) / 100
  const predictRank = (marks: number): string => {
    if (marks >= 85) return '< 100'
    if (marks >= 75) return '100 – 500'
    if (marks >= 65) return '500 – 1,500'
    if (marks >= 55) return '1,500 – 5,000'
    if (marks >= 45) return '5,000 – 15,000'
    if (marks >= 35) return '15,000 – 30,000'
    return '> 30,000'
  }

  const predictPercentile = (marks: number): string => {
    if (marks >= 85) return '> 99.5'
    if (marks >= 75) return '99 – 99.5'
    if (marks >= 65) return '97 – 99'
    if (marks >= 55) return '93 – 97'
    if (marks >= 45) return '80 – 93'
    if (marks >= 35) return '60 – 80'
    return '< 60'
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500'
    if (score >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marks Predictor</h1>
        <p className="text-muted-foreground text-sm">Estimate your GATE score based on subject-wise preparation levels</p>
      </div>

      {/* Score Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 bg-primary text-primary-foreground">
          <CardContent className="p-6 text-center space-y-3">
            <Calculator className="size-8 mx-auto opacity-80" />
            <div>
              <p className="text-5xl font-black">{roundedTotal}</p>
              <p className="text-primary-foreground/70 text-sm">/ 100 marks</p>
            </div>
            <Separator className="bg-primary-foreground/20" />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-primary-foreground/70 text-xs">Est. Rank</p>
                <p className="font-bold text-sm">{predictRank(roundedTotal)}</p>
              </div>
              <div>
                <p className="text-primary-foreground/70 text-xs">Percentile</p>
                <p className="font-bold text-sm">{predictPercentile(roundedTotal)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Admission Eligibility Estimate</CardTitle>
            <CardDescription>Based on historical GATE cutoffs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'IIT (Top 10 programs)', cutoff: 75, desc: 'IIT Bombay, Delhi, Madras, etc.' },
              { label: 'IIT (Other programs)', cutoff: 65, desc: 'NIT Trichy, Warangal, etc.' },
              { label: 'NIT / IIIT (Top)', cutoff: 55, desc: 'NIT Trichy, Surathkal, etc.' },
              { label: 'PSU Jobs (e.g. BHEL, DRDO)', cutoff: 45, desc: 'Government job eligibility' },
              { label: 'NIT / Other colleges', cutoff: 35, desc: 'Lower NIT branches' },
            ].map(item => {
              const eligible = roundedTotal >= item.cutoff
              return (
                <div key={item.label} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc} | Cutoff ~{item.cutoff}</p>
                  </div>
                  <Badge variant={eligible ? 'default' : 'outline'} className={eligible ? 'bg-green-500 hover:bg-green-600' : ''}>
                    {eligible ? 'Eligible' : 'Need ' + (item.cutoff - roundedTotal).toFixed(1) + ' more'}
                  </Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Subject-wise Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="size-4" /> Subject-wise Expected Score (%)
          </CardTitle>
          <CardDescription className="flex items-center gap-1 text-xs">
            <Info className="size-3" /> Set your expected accuracy for each subject. This estimates your GATE marks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {Object.entries(GATE_SUBJECTS_MARKS).map(([slug, info]) => {
              const score = subjectScores[slug] || 0
              const estMarks = Math.round(score / 100 * info.maxMarks * 10) / 10
              return (
                <div key={slug} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">{info.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({info.maxMarks} marks, {info.questions} questions)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}%</span>
                      <span className="text-xs text-muted-foreground">≈ {estMarks}/{info.maxMarks}</span>
                    </div>
                  </div>
                  <Slider
                    min={0} max={100} step={5}
                    value={[score]}
                    onValueChange={([v]) => updateScore(slug, v)}
                    className="w-full"
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">Study Tips for Score Improvement</p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>• Engineering Mathematics and General Aptitude together = 28 marks. Prioritize these!</li>
            <li>• Focus on PYQs — 60-70% questions repeat concepts from previous years.</li>
            <li>• Algorithms, OS, DBMS, CN, TOC together account for ~37 marks.</li>
            <li>• Never attempt a question you're unsure about (1/3 negative marking).</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
