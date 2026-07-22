export function Frozen({ when, children }: { when: boolean; children: React.ReactNode }) {
  if (!when) return <>{children}</>;
  return (
    <fieldset disabled className="m-0 min-w-0 border-0 p-0 opacity-70">
      {children}
    </fieldset>
  );
}
