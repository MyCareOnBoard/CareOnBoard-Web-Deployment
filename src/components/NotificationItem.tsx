import { memo, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/hooks/useNotifications";

interface NotificationItemProps {
    notification: Notification;
    onMarkAsRead: (id: string) => void;
    onNavigate: (url: string) => void;
    onClose: () => void;
}

/**
 * Memoized notification item component to prevent re-renders when other notifications change
 */
export const NotificationItem = memo(function NotificationItem({
    notification,
    onMarkAsRead,
    onNavigate,
    onClose,
}: NotificationItemProps) {
    const handleClick = useCallback(() => {
        onMarkAsRead(notification.id);
        if (notification.actionUrl) {
            onNavigate(notification.actionUrl);
            onClose();
        }
    }, [notification.id, notification.actionUrl, onMarkAsRead, onNavigate, onClose]);

    const formattedTime = formatDistanceToNow(new Date(notification.createdAt), {
        addSuffix: true,
    }).replace('about ', '');

    const isUnread = notification.status === 'unread';

    return (
        <DropdownMenuItem
            className={cn(
                "flex flex-col gap-1 px-4 py-3 border-b border-[#e5e5e6] cursor-pointer hover:bg-white/50 focus:bg-white/50 transition-colors rounded-none outline-none",
                isUnread ? "bg-white/60" : "opacity-80"
            )}
            onClick={handleClick}
        >
            <div className="flex items-start justify-between w-full gap-2">
                <h4
                    className={cn(
                        "text-[14px] leading-snug text-[#10141a]",
                        isUnread ? "font-semibold" : "font-medium"
                    )}
                >
                    {notification.title}
                </h4>
                <span className="text-[10px] text-[#808081] whitespace-nowrap shrink-0 mt-0.5">
                    {formattedTime}
                </span>
            </div>
            <div className="flex items-start justify-between w-full gap-2">
                <p className="text-[13px] text-[#5e636e] line-clamp-2 leading-relaxed">
                    {notification.message}
                </p>
                {isUnread && (
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00b4b8]" />
                        <span className="text-[10px] text-[#00b4b8] font-medium">New</span>
                    </div>
                )}
            </div>
        </DropdownMenuItem>
    );
});
