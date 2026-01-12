import React from "react";
import {X} from "lucide-react";


export default function ClientReportModal() {
    return (
        <div>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"/>

            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white">
                <div className={"flex items-center justify-between p-6"}>
                    <div>
                        <h4>Report</h4>
                        <p>Documents for Brooklyn Simmons</p>
                    </div>
                    <div>
                        <X className="w-3 h-3" />
                    </div>
                </div>
            </div>
        </div>
    )
}