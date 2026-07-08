export default function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 72 72" className="w-[20px] h-[20px] fill-accent">
        <path d="M24 0h24v24H24zm24 24h24v24H48zM0 48h24v24H0zm24 0h24v24H24zm24 0h24v24H48z" />
      </svg>
      <span className="font-hand font-bold text-[22px] leading-none text-ink-900">
        jot
      </span>
    </span>
  );
}
