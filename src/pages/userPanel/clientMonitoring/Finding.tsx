import type { ScAnswer } from '@/lib/api/sc-monitoring';

export default function Finding({ title, answer, fields = [] }: { title: string; answer: ScAnswer; fields?: Array<[string, string]> }) {
  const status = answer.status.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  return <div className="scm-keyval"><dt>{title}</dt><dd><strong>{status}</strong>
    {[['notReviewedReason', 'Not reviewed because'], ...fields].filter(([key]) => answer[key] !== undefined && answer[key] !== '').map(([key, caption]) =>
      <p key={key}>{caption}: {typeof answer[key] === 'boolean' ? answer[key] ? 'Yes' : 'No' : String(answer[key])}</p>)}</dd></div>;
}
