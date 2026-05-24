type BillingPlaceholderPageProps = {
  title: string;
  subtitle: string;
};

export default function BillingPlaceholderPage({ title, subtitle }: BillingPlaceholderPageProps) {
  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-8">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">{title}</h1>
        <p className="text-[14px] font-medium text-[#808081] mt-2">{subtitle}</p>
      </div>

      <div className="rounded-[20px] bg-white p-8 shadow-sm border border-[#e5e5e6]">
        <div className="text-center py-12">
          <p className="text-[16px] font-medium text-[#808081]">{title} content coming soon</p>
        </div>
      </div>
    </div>
  );
}
