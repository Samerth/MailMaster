import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, LightbulbIcon } from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  ResponsiveContainer, 
  Tooltip, 
  Cell
} from "recharts";

interface PackageDistribution {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface Insight {
  title: string;
  content: string;
  source: string;
}

interface BusiestPeriod {
  label: string;
  type: string;
  value: number;
  period: string;
}

export default function InsightsPanel() {
  const { data: distribution, isLoading: loadingDistribution } = useQuery<PackageDistribution[]>({
    queryKey: ['/api/insights/distribution'],
  });

  const { data: insight, isLoading: loadingInsight } = useQuery<Insight>({
    queryKey: ['/api/insights/mail-volume'],
  });

  const { data: busiestPeriods, isLoading: loadingBusiestPeriods } = useQuery<BusiestPeriod[]>({
    queryKey: ['/api/insights/busiest-periods'],
  });

  // Format timestamp for the "Updated X min ago" display
  const lastUpdated = "10 min ago";

  return (
    <Card className="bg-white rounded-lg shadow-sm">
      <CardHeader className="border-b border-slate-200 p-4 flex justify-between items-center">
        <CardTitle className="font-semibold text-slate-800">AI Insights</CardTitle>
        <span className="text-xs text-slate-500">Updated {lastUpdated}</span>
      </CardHeader>
      <CardContent className="p-4">
        {/* Distribution Chart */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Package Distribution</h3>
          <div className="h-44 relative">
            {loadingDistribution ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : distribution && distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" hide />
                  <Tooltip 
                    formatter={(value, name, props) => [`${props.payload.percentage}%`, props.payload.name]}
                    labelFormatter={() => ''}
                    contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-slate-500">No distribution data available</p>
              </div>
            )}
            
            {/* Chart legend */}
            {distribution && distribution.length > 0 && (
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-around text-center">
                {distribution.map((item, index) => (
                  <div key={index} className="text-center">
                    <p className="text-xs mt-1 text-slate-600">{item.name}</p>
                    <p className="text-xs font-semibold">{item.percentage}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* AI Insights */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-slate-700">
          <div className="flex items-start">
            <div className="mr-2 mt-0.5 text-blue-500">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-blue-800 mb-1">{loadingInsight ? 'Loading insights...' : insight?.title || 'Mail Volume Insights'}</p>
              <p>{loadingInsight 
                ? 'Analyzing mail patterns...' 
                : insight?.content || 'No insights available at this time.'}
              </p>
              <div className="mt-3 flex items-center text-xs">
                <LightbulbIcon className="h-3.5 w-3.5 text-yellow-500 mr-1" />
                <span className="text-slate-600">{
                  loadingInsight 
                    ? 'Processing data...' 
                    : insight?.source || 'Based on available mail activity'
                }</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Busiest Periods */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-slate-700 mb-2">Busiest Periods</h3>
          {loadingBusiestPeriods ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : busiestPeriods && busiestPeriods.length > 0 ? (
            <div className="space-y-2">
              {busiestPeriods.map((period, index) => (
                <div key={index} className="flex items-center">
                  <span className="text-xs w-24 text-slate-600">{period.label}</span>
                  <div className="flex-1 h-4 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${period.value}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs font-medium">{period.period}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-2">No data available for busiest periods</p>
          )}
        </div>
        
        <div className="mt-4 text-center">
          <Button variant="link" className="text-sm text-primary hover:text-primary-dark font-medium">
            View Full Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
