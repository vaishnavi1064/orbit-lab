/** "Your call" answer box with live character count and Transmit. */

import { useId, type FormEvent, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import { MAX_ANSWER_CHARS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Button, Textarea } from '@/components/ui'

interface Props {
  text: string
  onTextChange: (text: string) => void
  onTransmit: (text: string) => void
  pending: boolean
  error: string | null
}

export function AnswerConsole({ text, onTextChange, onTransmit, pending, error }: Props) {
  const id = useId()
  const trimmed = text.trim()
  const over = text.length > MAX_ANSWER_CHARS
  const near = text.length > MAX_ANSWER_CHARS - 150
  const canSend = trimmed.length >= 20 && !over && !pending

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (canSend) onTransmit(trimmed)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <label htmlFor={id} className="label-mono text-foreground">
          Your call
        </label>
        <span
          id={`${id}-count`}
          className={cn(
            'font-mono text-xs tabular-nums',
            over ? 'text-destructive' : near ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {text.length} / {MAX_ANSWER_CHARS}
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <Textarea
          id={id}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MAX_ANSWER_CHARS}
          rows={7}
          disabled={pending}
          aria-describedby={`${id}-count ${id}-hint${error ? ` ${id}-error` : ''}`}
          aria-invalid={!!error || over}
          placeholder="What do you do first, and why? Walk through your reasoning like you are briefing the flight director."
          className="min-h-[11rem] resize-y bg-background text-base leading-relaxed"
        />
        {error && (
          <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            One transmission per mission. Ctrl+Enter to send.
          </p>
          <Button type="submit" size="lg" loading={pending} disabled={!canSend} data-testid="transmit-button">
            {!pending && <Send aria-hidden />}
            Transmit
          </Button>
        </div>
      </div>
    </form>
  )
}
