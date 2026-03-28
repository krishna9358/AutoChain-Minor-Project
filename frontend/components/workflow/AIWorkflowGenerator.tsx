import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2, Play, ArrowRight, Lightbulb, Zap, AlertCircle } from 'lucide-react';

interface AIWorkflowGeneratorProps {
  onGenerateWorkflow?: (description: string) => Promise<void>;
  onExplainWorkflow?: () => void;
  isGenerating?: boolean;
  workflowGenerated?: boolean;
  error?: string | null;
}

const AIWorkflowGenerator: React.FC<AIWorkflowGeneratorProps> = ({
  onGenerateWorkflow,
  onExplainWorkflow,
  isGenerating = false,
  workflowGenerated = false,
  error = null
}) => {
  const [description, setDescription] = useState('');
  const [suggestions] = useState([
    'Automate meeting notes and assign tasks to team members',
    'Customer support ticket classification and auto-response',
    'Sales lead scoring and personalized email outreach',
    'Incident alert analysis and DevOps notification',
    'Extract tasks from transcripts and create Slack tasks',
    'Classify documents and store in Notion database',
  ]);

  const handleGenerate = async () => {
    if (description.trim() && onGenerateWorkflow) {
      await onGenerateWorkflow(description);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setDescription(suggestion);
  };

  return (
    <div className="w-full">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg animate-pulse">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-3">
          Build Workflows with AI
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Simply describe what you want to automate, and our AI will generate a complete workflow for you
        </p>
      </div>

      {/* Main Input Section */}
      <div className="bg-white rounded-2xl border-2 border-accent-200 p-6 mb-6 shadow-xl">
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your workflow... e.g., 'When a new customer support ticket is created, classify the issue, search the knowledge base, draft a response, send for human approval, and email the customer'"
            className="w-full px-6 py-4 rounded-xl border-2 border-slate-200 focus:border-accent-400 focus:outline-none text-slate-700 text-sm resize-none h-32 transition-colors"
            disabled={isGenerating}
          />

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!description.trim() || isGenerating}
            className={cn(
              "absolute right-3 bottom-3 bg-primary text-white font-semibold py-3 px-8 rounded-xl transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl hover:bg-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            )}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Workflow</span>
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-slate-800">Try these examples</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isGenerating}
              className="flex items-start space-x-3 p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-accent-300 hover:shadow-md transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-primary font-semibold text-xs shrink-0 mt-0.5">
                {index + 1}
              </div>
              <span className="text-sm text-slate-700 group-hover:text-accent-600 transition-colors flex-1">
                {suggestion}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-accent-500 group-hover:translate-x-1 transition-all shrink-0 mt-1" />
            </button>
          ))}
        </div>
      </div>

      {/* Explain Workflow Button (shows after workflow is generated) */}
      {workflowGenerated && onExplainWorkflow && (
        <div className="bg-[#f7f8f8] rounded-2xl border-2 border-green-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center text-white shadow-lg">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Workflow Generated!</h3>
                <p className="text-sm text-slate-600">Your AI-powered workflow is ready</p>
              </div>
            </div>
            <button
              onClick={onExplainWorkflow}
              className="bg-primary text-white font-semibold py-3 px-6 rounded-xl hover:bg-primary transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Play className="w-5 h-5" />
              <span>Explain Workflow</span>
            </button>
          </div>
        </div>
      )}

      {/* Demo Tip */}
      <div className="bg-accent rounded-xl border border-blue-200 p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-slate-800 mb-1">Demo Tip</h4>
            <p className="text-sm text-slate-600">
              Type a clear description like &quot;Create a workflow for customer support automation&quot; to see the magic happen!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIWorkflowGenerator;
