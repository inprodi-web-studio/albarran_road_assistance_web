import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import type { AgentPhoto } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type AgentAvatarProps = {
  className?: string;
  name?: string;
  photo?: Pick<AgentPhoto, "url" | "alternativeText"> | null;
};

export const AgentAvatar = ({ className, name, photo }: AgentAvatarProps) => {
  const source = resolveMediaUrl(photo?.url);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [source]);

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-accent text-accent-foreground",
        className,
      )}
    >
      {source && !failed ? (
        <img
          alt={photo?.alternativeText || (name ? `Foto de ${name}` : "Foto de agente")}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          src={source}
        />
      ) : (
        <UserRound aria-hidden="true" className="h-1/2 w-1/2" />
      )}
    </div>
  );
};
