/** A past transmission in the flight record. */

import { Link } from 'react-router-dom'
import { ArrowBigUp, ArrowRight } from 'lucide-react'
import { getTrack, missionLabel } from '@/lib/tracks'
import type { AnswerData, ScenarioData } from '@/lib/types'

interface Props {
  scenarioId: string
  answer: AnswerData
  scenario?: ScenarioData
  createdAt: string
}

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

export function PastAnswerRow({ scenarioId, answer, scenario, createdAt }: Props) {
  const track = getTrack(answer.track)
  return (
    <li>
      <Link
        to={`/scenario/${scenarioId}`}
        data-testid="past-answer"
        className="group block px-5 py-4 transition-colors hover:bg-accent"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="label-mono text-muted-foreground">
            {scenario ? missionLabel(scenario.number) : 'MISSION'} // {track?.callsign ?? answer.track}
          </span>
          <span className="label-mono ml-auto text-muted-foreground">{dateFmt.format(new Date(createdAt))}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-4">
          <span className="min-w-0 flex-1 truncate font-medium text-foreground group-hover:text-primary">
            {scenario?.title ?? 'Archived mission'}
          </span>
          <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground" title="Upvotes received">
            <ArrowBigUp className="h-4 w-4" aria-hidden />
            <span className="sr-only">Upvotes:</span>
            {answer.upvoteCount ?? 0}
          </span>
          <span className="label-mono rounded-sm bg-secondary px-2 py-1 text-foreground">{answer.score}/10</span>
          <ArrowRight className="hidden h-4 w-4 text-muted-foreground group-hover:text-primary sm:block" aria-hidden />
        </div>
        <p className="mt-1.5 line-clamp-1 text-sm text-muted-foreground">{answer.text}</p>
      </Link>
    </li>
  )
}
