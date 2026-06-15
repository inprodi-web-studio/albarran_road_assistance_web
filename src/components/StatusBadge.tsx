import { Badge } from "@/components/ui/badge";
import type { OrderStage, RequestStatus } from "@/lib/types";
import { orderStageLabels, requestStatusLabels } from "@/lib/utils";

type Props =
  | {
      kind: "request";
      value: Exclude<RequestStatus, "all">;
    }
  | {
      kind: "order";
      value: Exclude<OrderStage, "all">;
    };

export const StatusBadge = (props: Props) => {
  if (props.kind === "request") {
    const variants = {
      pending: "warning",
      approved: "success",
      converted: "accent",
      rejected: "danger",
    } as const;

    return (
      <Badge variant={variants[props.value]}>
        {requestStatusLabels[props.value]}
      </Badge>
    );
  }

  const variants = {
    opened: "accent",
    completed: "success",
    cancelled: "danger",
  } as const;

  return (
    <Badge variant={variants[props.value]}>{orderStageLabels[props.value]}</Badge>
  );
};
