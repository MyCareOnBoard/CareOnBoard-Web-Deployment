import { memo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils/string-utils";
import { AVATAR_FALLBACK, AVATAR_LIST, AVATAR_MODAL } from "../planOfCareStyles";

interface PlanOfCareClientAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: "list" | "modal";
}

function PlanOfCareClientAvatarInner({
  name,
  imageUrl,
  size = "list",
}: PlanOfCareClientAvatarProps) {
  const hasImage = Boolean(imageUrl?.trim());
  const avatarClass = size === "modal" ? AVATAR_MODAL : AVATAR_LIST;

  return (
    <Avatar className={avatarClass}>
      {hasImage && (
        <AvatarImage
          src={imageUrl!}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover aspect-auto rounded-[8px]"
        />
      )}
      <AvatarFallback className={AVATAR_FALLBACK}>
        {getInitials(name, 2)}
      </AvatarFallback>
    </Avatar>
  );
}

export const PlanOfCareClientAvatar = memo(PlanOfCareClientAvatarInner);
