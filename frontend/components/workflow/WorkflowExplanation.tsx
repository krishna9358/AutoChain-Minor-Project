import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, CheckCircle2, ArrowDown, Lightbulb, Brain, ChevronRight, Zap, FileText, GitBranch, Mail, GitFork, RefreshCw, Clock, Database, Archive, Send, ShieldAlert, Github, Calendar, Video, Table2 } from 'lucide-react';
import { SlackLogo } from './icons/ServiceLogos';

interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBgColor: string;
}

interface WorkflowExplanationProps {
  isOpen?: boolean;
  onClose?: () => void;
  steps?: WorkflowStep[];
  workflowName?: string;
  workflowDescription?: string;
}

const WorkflowExplanation: React.FC<WorkflowExplanationProps> = ({
  isOpen = true,
  onClose,
  steps = [],
  workflowName = 'Your Workflow',
  workflowDescription
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen && steps.length > 0) {
      let step = 0;
      setIsAnimating(true);

      const interval = setInterval(() => {
        if (step < steps.length - 1) {
          step++;
          setCurrentStep(step);
        } else {
          setIsAnimating(false);
          clearInterval(interval);
        }
      }, 800);

      return () => clearInterval(interval);
    }
  }, [isOpen, steps]);

  if (!isOpen) return null;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">
          Workflow Explanation
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          {workflowName}
        </p>
        {workflowDescription && (
          <p className="text-sm text-slate-500 mt-2 max-w-2xl mx-auto">
            {workflowDescription}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-slate-600">
            Progress
          </span>
          <span className="text-sm font-semibold text-accent-600">
            {currentStep + 1} of {steps.length} steps
          </span>
        </div>
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full bg-primary transition-all duration-500 ease-out",
              isAnimating && "animate-pulse"
            )}
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4 max-w-3xl mx-auto">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentStep;
          const isCompleted = index < currentStep;

          return (
            <div
              key={step.step}
              className={cn(
                "relative transition-all duration-500 transform",
                isActive ? "scale-105" : "scale-100 opacity-60 hover:opacity-80",
                isCompleted ? "opacity-100" : ""
              )}
            >
              {/* Connection Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 top-16 bottom-0 w-0.5 bg-slate-200" />
              )}

              <div className="flex items-start space-x-4">
                {/* Step Number/Icon */}
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-all",
                      isActive ? "scale-110 ring-4 ring-accent-200" : "",
                      isCompleted ? "bg-green-500" : step.iconBgColor
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Icon className={cn("w-6 h-6", isActive && "animate-bounce")} />
                    )}
                  </div>
                  {/* Glow effect for active step */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-primary blur-xl opacity-30 animate-pulse" />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 bg-white rounded-xl border-2 p-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-accent-600 bg-accent-50 px-2 py-1 rounded-full">
                        Step {step.step}
                      </span>
                      {isCompleted && (
                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completed
                        </span>
                      )}
                      {isActive && (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full flex items-center animate-pulse">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Processing
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-lg text-slate-800 mb-2">
                    {step.title}
                  </h3>

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {step.description}
                  </p>

                  {/* AI Insight Badge */}
                  {isActive && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center space-x-2 text-xs text-accent-600">
                        <Brain className="w-4 h-4" />
                        <span className="font-medium">AI Insight</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 italic">
                        This step {step.description.toLowerCase().startsWith('analyze') ||
                                   step.description.toLowerCase().startsWith('extract') ||
                                   step.description.toLowerCase().startsWith('classify')
                                   ? 'uses advanced NLP models to process the data intelligently'
                                   : 'is optimized for best performance and accuracy'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                {index < steps.length - 1 && (
                  <div className="flex items-center justify-center shrink-0 mt-6">
                    <ArrowDown className={cn(
                      "w-6 h-6 text-slate-400 transition-transform",
                      isActive && "animate-bounce"
                    )} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Section */}
      {currentStep === steps.length - 1 && (
        <div className="mt-8 max-w-3xl mx-auto">
          <div className="bg-[#f7f8f8] rounded-2xl border-2 border-green-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center text-white shadow-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">Workflow Complete!</h3>
                <p className="text-sm text-slate-600">Your intelligent workflow is ready</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-accent-600">{steps.length}</div>
                <div className="text-xs text-slate-600 mt-1">Total Steps</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-blue-600">
                  {steps.filter(s => s.icon === Brain || s.icon === FileText).length}
                </div>
                <div className="text-xs text-slate-600 mt-1">AI Agents</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-green-600">
                  {steps.filter(s => s.icon === SlackLogo || s.icon === Mail || s.icon === Database).length}
                </div>
                <div className="text-xs text-slate-600 mt-1">Integrations</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <div className="text-2xl font-bold text-emerald-600">100%</div>
                <div className="text-xs text-slate-600 mt-1">Automation</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tip Section */}
      <div className="mt-8 max-w-3xl mx-auto">
        <div className="bg-accent rounded-xl border border-blue-200 p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-slate-800 mb-1">Pro Tip</h4>
              <p className="text-sm text-slate-600">
                You can customize each step by clicking on the nodes in the workflow canvas. The AI will remember your preferences for future workflows.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to generate workflow steps from nodes
export const generateWorkflowSteps = (nodes: any[]): WorkflowStep[] => {
  const iconMap: Record<string, { icon: any; color: string; bgColor: string }> = {
    'entry-point': { icon: Zap, color: '#f59e0b', bgColor: 'bg-amber-500' },
    'http-request': { icon: GitFork, color: '#3b82f6', bgColor: 'bg-blue-500' },
    'slack-send': { icon: SlackLogo, color: '#3b82f6', bgColor: 'bg-blue-500' },
    'email-send': { icon: Mail, color: '#3b82f6', bgColor: 'bg-blue-500' },
    'db-query': { icon: Database, color: '#3b82f6', bgColor: 'bg-blue-500' },
    github: { icon: Github, color: '#3b82f6', bgColor: 'bg-blue-500' },
    'google-calendar': { icon: Calendar, color: '#3b82f6', bgColor: 'bg-blue-500' },
    'google-meet': { icon: Video, color: '#3b82f6', bgColor: 'bg-blue-500' },
    'google-docs': { icon: FileText, color: '#3b82f6', bgColor: 'bg-blue-500' },
    'google-sheets': { icon: Table2, color: '#3b82f6', bgColor: 'bg-blue-500' },
    'if-condition': { icon: GitFork, color: '#10b981', bgColor: 'bg-emerald-500' },
    'switch-case': { icon: GitBranch, color: '#10b981', bgColor: 'bg-emerald-500' },
    'loop': { icon: RefreshCw, color: '#10b981', bgColor: 'bg-emerald-500' },
    'ai-agent': { icon: Brain, color: '#8b5cf6', bgColor: 'bg-accent-500' },
    'text-transform': { icon: FileText, color: '#8b5cf6', bgColor: 'bg-accent-500' },
    'delay': { icon: Clock, color: '#6b7280', bgColor: 'bg-gray-500' },
    'error-handler': { icon: ShieldAlert, color: '#6b7280', bgColor: 'bg-gray-500' },
    'approval': { icon: CheckCircle2, color: '#6b7280', bgColor: 'bg-gray-500' },
    'artifact-writer': { icon: Archive, color: 'hsl(var(--primary))', bgColor: 'bg-primary' },
    'webhook-response': { icon: Send, color: 'hsl(var(--primary))', bgColor: 'bg-primary' },
  };

  return nodes.map((node, index) => {
    const config = iconMap[node.type] || { icon: Zap, color: '#3b82f6', bgColor: 'bg-blue-500' };
    return {
      step: index + 1,
      title: node.name || node.config?.name || 'Unknown Step',
      description: node.description || 'Processing data through this step',
      icon: config.icon,
      iconColor: config.color,
      iconBgColor: config.bgColor,
    };
  });
};

export default WorkflowExplanation;
