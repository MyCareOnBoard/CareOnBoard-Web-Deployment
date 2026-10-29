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
                "flex flex-col gap-1 px-4 py-3 border-b border-[#e5e5e6] cursor-pointer hover:bg-white/50 focus:bg-white/50 transition-colors rounded-none outline-none dark:border-white/10 dark:hover:bg-white/[0.06] dark:focus:bg-white/[0.06]",
                isUnread ? "bg-white/60 dark:bg-[#00a3a7]/[0.08]" : "opacity-80 dark:opacity-100"
            )}
            onClick={handleClick}
        >
            <div className="flex items-start justify-between w-full gap-2">
                <h4
                    className={cn(
                        "text-[14px] leading-snug text-[#10141a] dark:text-[#f4f6f7]",
                        isUnread ? "font-semibold" : "font-medium dark:text-[#c9d3d6]"
                    )}
                >
                    {notification.title}
                </h4>
                <span className="text-[10px] text-[#808081] dark:text-[#9aa4a8] whitespace-nowrap shrink-0 mt-0.5">
                    {formattedTime}
                </span>
            </div>
            <div className="flex items-start justify-between w-full gap-2">
                <p className="text-[13px] text-[#5e636e] dark:text-[#b4bfc3] line-clamp-2 leading-relaxed">
                    {notification.message}
                </p>
                {isUnread && (
                    <div className="flex items-center gap-2 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00b4b8] dark:bg-[#7fe0e2]" />
                        <span className="text-[10px] text-[#00b4b8] dark:text-[#7fe0e2] font-medium">New</span>
                    </div>
                )}
            </div>
        </DropdownMenuItem>
    );
});
