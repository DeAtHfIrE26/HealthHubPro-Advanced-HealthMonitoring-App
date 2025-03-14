import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ActivityStats } from "@/types";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

type DataType = 'steps' | 'calories' | 'activeMinutes';

interface ActivityChartProps {
  data: ActivityStats[];
  timeframe: 'day' | 'week' | 'month';
  onTimeframeChange: (timeframe: 'day' | 'week' | 'month') => void;
}

const ActivityChart = ({ data, timeframe, onTimeframeChange }: ActivityChartProps) => {
  const [dataType, setDataType] = useState<DataType>('steps');
  
  const formattedData = data.map((item) => ({
    name: formatDate(item.date),
    steps: item.steps,
    calories: item.calories,
    activeMinutes: item.activeMinutes,
  }));
  
  const getMaxValue = () => {
    if (dataType === 'steps') {
      return Math.max(...formattedData.map(d => d.steps), 10000);
    } else if (dataType === 'calories') {
      return Math.max(...formattedData.map(d => d.calories), 1000);
    } else {
      return Math.max(...formattedData.map(d => d.activeMinutes), 120);
    }
  };
  
  return (
    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Activity Trends</h3>
        
        <div className="flex space-x-2 text-sm">
          <Button 
            variant={dataType === 'steps' ? 'default' : 'outline'} 
            size="sm" 
            className={`rounded-full ${dataType === 'steps' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-100 text-gray-500 hover:text-gray-600'}`} 
            onClick={() => setDataType('steps')}
          >
            Steps
          </Button>
          <Button 
            variant={dataType === 'calories' ? 'default' : 'outline'} 
            size="sm" 
            className={`rounded-full ${dataType === 'calories' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-100 text-gray-500 hover:text-gray-600'}`} 
            onClick={() => setDataType('calories')}
          >
            Calories
          </Button>
          <Button 
            variant={dataType === 'activeMinutes' ? 'default' : 'outline'} 
            size="sm" 
            className={`rounded-full ${dataType === 'activeMinutes' ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-100 text-gray-500 hover:text-gray-600'}`} 
            onClick={() => setDataType('activeMinutes')}
          >
            Active Minutes
          </Button>
        </div>
      </div>
      
      <div className="flex mb-4 justify-end">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <Button 
            variant={timeframe === 'day' ? 'default' : 'outline'} 
            className={`px-4 py-2 text-sm rounded-l-lg ${timeframe === 'day' ? 'bg-blue-500' : 'bg-white text-blue-500'}`}
            onClick={() => onTimeframeChange('day')}
          >
            Day
          </Button>
          <Button 
            variant={timeframe === 'week' ? 'default' : 'outline'} 
            className={`px-4 py-2 text-sm ${timeframe === 'week' ? 'bg-blue-500' : 'bg-white text-blue-500'}`}
            onClick={() => onTimeframeChange('week')}
          >
            Week
          </Button>
          <Button 
            variant={timeframe === 'month' ? 'default' : 'outline'} 
            className={`px-4 py-2 text-sm rounded-r-lg ${timeframe === 'month' ? 'bg-blue-500' : 'bg-white text-blue-500'}`}
            onClick={() => onTimeframeChange('month')}
          >
            Month
          </Button>
        </div>
      </div>
      
      <div className="chart-container h-64 w-full bg-white rounded-lg overflow-hidden hover:shadow-md transition-all">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formattedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis 
              domain={[0, getMaxValue()]} 
              tickFormatter={(value) => {
                if (dataType === 'steps' && value >= 1000) {
                  return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
                }
                return value.toString();
              }}
            />
            <Tooltip 
              formatter={(value, name) => {
                if (name === 'steps') return [`${value} steps`, 'Steps'];
                if (name === 'calories') return [`${value} cal`, 'Calories'];
                if (name === 'activeMinutes') return [`${value} min`, 'Active Minutes'];
                return [value, name];
              }}
            />
            <Bar 
              dataKey={dataType} 
              fill={
                dataType === 'steps' 
                  ? '#3B82F6' 
                  : dataType === 'calories' 
                    ? '#F59E0B' 
                    : '#10B981'
              } 
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ActivityChart;
