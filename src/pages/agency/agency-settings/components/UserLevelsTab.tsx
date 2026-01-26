import { useNavigate } from "react-router";
import { Building2 } from "lucide-react";

export default function UserLevelsTab() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Agency Accounts",
      description: "Manage your internal agency accounts",
      icon: Building2,
      path: "/agency/agency-settings/user-levels/internal-users",
      iconBg: "bg-[#00B4B8]",
      iconColor: "text-white",
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <div
            key={section.title}
            onClick={() => navigate(section.path)}
            className="p-6 transition-shadow bg-white cursor-pointer rounded-xl hover:shadow-md hover:bg-green-100"
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${section.iconBg}`}>
                <Icon className={`w-6 h-6 ${section.iconColor}`} />
              </div>
              <div>
                <h3 className="mb-1 text-lg font-semibold text-gray-900">
                  {section.title}
                </h3>
                <p className="text-gray-500">{section.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
