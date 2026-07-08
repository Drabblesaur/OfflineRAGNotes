import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIndexStatus } from "@/hooks/useIndexStatus";
import { describeIndexStatus } from "@/lib/indexStatus";

export default function IndexStatusBadge() {
  const status = useIndexStatus();

  const { icon, label, tooltip } = describeIndexStatus(status);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-3 py-2 font-mono text-[11px] text-ink-500 select-none cursor-default">
          {icon}
          <span className="truncate">{label}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
