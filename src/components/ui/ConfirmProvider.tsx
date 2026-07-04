import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Dialog, DialogActions } from './Dialog'
import { Button } from './Button'
import { Field, Input } from './Field'

/**
 * Promise-based confirm/prompt dialogs — the accessible replacement for the
 * legacy showConfirmDialog/showPromptDialog. Used for all destructive actions.
 */

export interface ConfirmOptions {
  title: string
  message: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  dangerous?: boolean
}

export interface PromptOptions {
  title: string
  label: string
  message?: string
  initialValue?: string
  placeholder?: string
  saveLabel?: string
  validate?: (value: string) => string | null
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>
type PromptFn = (options: PromptOptions) => Promise<string | null>

const ConfirmContext = createContext<{ confirm: ConfirmFn; prompt: PromptFn } | null>(null)

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

interface PromptState extends PromptOptions {
  resolve: (value: string | null) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [promptState, setPromptState] = useState<PromptState | null>(null)
  const [promptValue, setPromptValue] = useState('')
  const [promptError, setPromptError] = useState<string | null>(null)
  // Guards against double-resolution when closing animations race clicks.
  const settled = useRef(false)

  const confirm = useCallback<ConfirmFn>((options) => {
    settled.current = false
    return new Promise<boolean>((resolve) => setConfirmState({ ...options, resolve }))
  }, [])

  const prompt = useCallback<PromptFn>((options) => {
    settled.current = false
    setPromptValue(options.initialValue ?? '')
    setPromptError(null)
    return new Promise<string | null>((resolve) => setPromptState({ ...options, resolve }))
  }, [])

  const settleConfirm = (value: boolean) => {
    if (!settled.current && confirmState) {
      settled.current = true
      confirmState.resolve(value)
    }
    setConfirmState(null)
  }

  const settlePrompt = (value: string | null) => {
    if (!settled.current && promptState) {
      settled.current = true
      promptState.resolve(value)
    }
    setPromptState(null)
  }

  const submitPrompt = () => {
    if (!promptState) return
    const error = promptState.validate?.(promptValue) ?? null
    if (error !== null) {
      setPromptError(error)
      return
    }
    settlePrompt(promptValue)
  }

  return (
    <ConfirmContext.Provider value={{ confirm, prompt }}>
      {children}

      {confirmState ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) settleConfirm(false)
          }}
          title={confirmState.title}
        >
          <p className="text-sm text-ink">{confirmState.message}</p>
          {confirmState.description ? (
            <p className="mt-2 text-xs text-ink-muted">{confirmState.description}</p>
          ) : null}
          <DialogActions>
            <Button variant="ghost" onClick={() => settleConfirm(false)}>
              {confirmState.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={confirmState.dangerous ? 'danger' : 'primary'}
              onClick={() => settleConfirm(true)}
              autoFocus
            >
              {confirmState.confirmLabel ?? 'Confirm'}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}

      {promptState ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) settlePrompt(null)
          }}
          title={promptState.title}
        >
          {promptState.message ? (
            <p className="mb-3 text-sm text-ink-muted">{promptState.message}</p>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitPrompt()
            }}
          >
            <Field label={promptState.label} error={promptError}>
              {(id) => (
                <Input
                  id={id}
                  value={promptValue}
                  placeholder={promptState.placeholder}
                  autoFocus
                  onChange={(e) => {
                    setPromptValue(e.target.value)
                    setPromptError(null)
                  }}
                />
              )}
            </Field>
            <DialogActions>
              <Button variant="ghost" onClick={() => settlePrompt(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {promptState.saveLabel ?? 'Save'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
      ) : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (ctx === null) throw new Error('useConfirm must be used inside a ConfirmProvider')
  return ctx.confirm
}

export function usePrompt(): PromptFn {
  const ctx = useContext(ConfirmContext)
  if (ctx === null) throw new Error('usePrompt must be used inside a ConfirmProvider')
  return ctx.prompt
}
