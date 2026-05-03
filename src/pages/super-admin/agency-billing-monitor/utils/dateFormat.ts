export function formatShortDate(date: Date) {
	return date.toLocaleDateString("en-US", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	});
}

export function formatMonthYear(date: Date) {
	return date.toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});
}
