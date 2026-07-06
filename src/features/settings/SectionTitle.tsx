/** Uppercase micro-heading used to group settings sections. */
export function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="mt-6 mb-2 text-[13px] font-semibold tracking-[0.5px] text-ink-faint uppercase first:mt-0">
      {children}
    </h3>
  )
}
