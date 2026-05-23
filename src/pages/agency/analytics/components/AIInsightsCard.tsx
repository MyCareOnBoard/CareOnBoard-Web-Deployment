import React from 'react';

interface AIInsightsCardProps {
  section: 'compliance' | 'risk' | 'efficiency' | 'billing';
}

const insights = {
  compliance: {
    insight: 'Overtime accounts for most compliance issues this week',
    recommendation: 'Consider redistributing night shifts to reduce staff fatigue.'
  },
  risk: {
    insight: 'Adjoa Serwaa has exceeded safe working hours 3 times this week',
    recommendation: 'Limit consecutive right alignment for better compliance.'
  },
  efficiency: {
    insight: 'Most issues are still resolved manually',
    recommendation: 'Enable auto fix rules for faster operations.'
  },
  billing: {
    insight: '6 shifts are compliant but not yet billed',
    recommendation: 'Generate invoices to avoid payment delays.'
  }
};

const AIInsightsCard: React.FC<AIInsightsCardProps> = ({ section }) => {
  const data = insights[section];
  return (
    <div className="bg-blue-50 rounded p-3 mb-2">
      <div className="text-xs text-blue-700 font-semibold mb-1">AI insights</div>
      <div className="text-sm text-gray-700 mb-1">{data.insight}</div>
      <div className="bg-white rounded p-2 text-xs text-blue-600 border border-blue-100">Recommendations: {data.recommendation}</div>
    </div>
  );
};

export default AIInsightsCard;
