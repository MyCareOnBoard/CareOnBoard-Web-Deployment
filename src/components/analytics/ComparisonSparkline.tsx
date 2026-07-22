import { useId } from "react";

type SparklinePoint = {
  value: number;
};

export default function ComparisonSparkline({
  data,
  color,
}: {
  data: [SparklinePoint, SparklinePoint];
  color: string;
}) {
  const gradientId = useId().replace(/:/g, "");
  const [previous, current] = data.map((point) => Number(point.value || 0));
  const points =
    previous === current
      ? "4,26 88,26"
      : previous < current
        ? "4,42 88,10"
        : "4,10 88,42";
  const areaPoints = `${points} 88,48 4,48`;

  return (
    <svg
      data-testid="comparison-sparkline"
      aria-hidden="true"
      className="h-[52px] w-[92px]"
      viewBox="0 0 92 52"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}
