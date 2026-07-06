import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
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
  // Guards against double-resolution when closing animations race clicks. Kept
  // per-flow so a confirm and a prompt open at once settle independently (a
  // shared flag let settling one strand the other's promise forever).
  const settledConfirm = useRef(false)
  const settledPrompt = useRef(false)
  // Pending resolvers, so a new request can settle a superseded one instead of
  // leaving its promise to hang forever.
  const pendingConfirm = useRef<((value: boolean) => void) | null>(null)
  const pendingPrompt = useRef<((value: string | null) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    pendingConfirm.current?.(false) // supersede an unsettled previous confirm
    settledConfirm.current = false
    return new Promise<boolean>((resolve) => {
      pendingConfirm.current = resolve
      setConfirmState({ ...options, resolve })
    })
  }, [])

  const prompt = useCallback<PromptFn>((options) => {
    pendingPrompt.current?.(null) // supersede an unsettled previous prompt
    settledPrompt.current = false
    setPromptValue(options.initialValue ?? '')
    setPromptError(null)
    return new Promise<string | null>((resolve) => {
      pendingPrompt.current = resolve
      setPromptState({ ...options, resolve })
    })
  }, [])

  const settleConfirm = (value: boolean) => {
    if (!settledConfirm.current && confirmState) {
      settledConfirm.current = true
      confirmState.resolve(value)
    }
    pendingConfirm.current = null
    setConfirmState(null)
  }

  const settlePrompt = (value: string | null) => {
    if (!settledPrompt.current && promptState) {
      settledPrompt.current = true
      promptState.resolve(value)
    }
    pendingPrompt.current = null
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

  // confirm/prompt are stable useCallbacks; memoizing the wrapper keeps the
  // context value referentially stable so consumers (incl. per-row homework /
  // recording items) don't re-render on every keystroke while a prompt is open.
  const value = useMemo(() => ({ confirm, prompt }), [confirm, prompt])

  return (
    <ConfirmContext.Provider value={value}>
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
            <Button
              variant="ghost"
              onClick={() => settleConfirm(false)}
              autoFocus={confirmState.dangerous ?? false}
            >
              {confirmState.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={confirmState.dangerous ? 'destructive' : 'primary'}
              onClick={() => settleConfirm(true)}
              autoFocus={!confirmState.dangerous}
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
