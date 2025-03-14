import { Button } from '@/components/ui/button';
import { AIRecommendationProps } from '@/types';

const AIRecommendation = ({ 
  type,
  content,
  primaryAction,
  onPositiveFeedback,
  onNegativeFeedback
}: AIRecommendationProps) => {
  // Determine colors and icons based on type
  const getConfig = () => {
    switch (type) {
      case 'workout':
        return {
          bgGradient: 'from-blue-50 to-indigo-50',
          border: 'border-blue-100',
          iconBg: 'bg-primary bg-opacity-20',
          iconColor: 'text-primary',
          icon: 'fas fa-brain',
          title: 'Workout Suggestion',
          buttonColor: 'bg-primary hover:bg-blue-600',
          buttonText: 'Try Now'
        };
      case 'nutrition':
        return {
          bgGradient: 'from-green-50 to-emerald-50',
          border: 'border-green-100',
          iconBg: 'bg-green-500 bg-opacity-20',
          iconColor: 'text-green-500',
          icon: 'fas fa-utensils',
          title: 'Nutrition Tip',
          buttonColor: 'bg-green-500 hover:bg-green-600',
          buttonText: 'See Recipes'
        };
      case 'sleep':
        return {
          bgGradient: 'from-purple-50 to-indigo-50',
          border: 'border-purple-100',
          iconBg: 'bg-purple-500 bg-opacity-20',
          iconColor: 'text-purple-500',
          icon: 'fas fa-moon',
          title: 'Sleep Insight',
          buttonColor: 'bg-purple-500 hover:bg-purple-600',
          buttonText: 'Sleep Analytics'
        };
      default:
        return {
          bgGradient: 'from-gray-50 to-gray-100',
          border: 'border-gray-200',
          iconBg: 'bg-gray-500 bg-opacity-20',
          iconColor: 'text-gray-500',
          icon: 'fas fa-lightbulb',
          title: 'AI Insight',
          buttonColor: 'bg-gray-500 hover:bg-gray-600',
          buttonText: 'Learn More'
        };
    }
  };
  
  const config = getConfig();
  
  return (
    <div className={`bg-gradient-to-br ${config.bgGradient} p-4 rounded-lg border ${config.border}`}>
      <div className="flex items-start mb-3">
        <div className={`h-10 w-10 rounded-full ${config.iconBg} flex items-center justify-center ${config.iconColor} mr-3`}>
          <i className={config.icon}></i>
        </div>
        <div>
          <h4 className="font-medium">{config.title}</h4>
          <p className="text-sm text-gray-600">
            {content}
          </p>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button 
          className={`flex-1 py-1.5 rounded ${config.buttonColor} text-white text-sm`}
          onClick={primaryAction}
        >
          {config.buttonText}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="py-1.5 px-2 rounded bg-white border border-gray-200 text-gray-500 text-sm hover:bg-gray-50"
          onClick={onPositiveFeedback}
        >
          <i className="fas fa-thumbs-up"></i>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="py-1.5 px-2 rounded bg-white border border-gray-200 text-gray-500 text-sm hover:bg-gray-50"
          onClick={onNegativeFeedback}
        >
          <i className="fas fa-thumbs-down"></i>
        </Button>
      </div>
    </div>
  );
};

export default AIRecommendation;
