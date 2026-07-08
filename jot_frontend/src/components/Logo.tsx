export default function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-[26px] h-[26px] rounded-lg bg-accent text-paper-card flex items-center justify-center shrink-0">
        <svg viewBox="0 0 72 72" className="w-[14px] h-[14px] fill-current">
          <path d="M24 0h24v24H24zm24 24h24v24H48zM0 48h24v24H0zm24 0h24v24H24zm24 0h24v24H48z" />
        </svg>
      </span>
      <span className="font-hand font-bold text-[22px] leading-none text-ink-900">
        jot
      </span>
    </span>
  );
}
