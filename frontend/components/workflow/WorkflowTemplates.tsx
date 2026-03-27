import React from 'react';
import { cn } from '@/lib/utils';
import { WORKFLOW_TEMPLATES } from './config/nodeTypes';
import { ChevronRight, Play, Sparkles } from 'lucide-react';

interface WorkflowTemplatesProps {
  onSelectTemplate?: (templateId: string) => void;
  onGenerateWorkflow?: (template: any) => void;
}

const WorkflowTemplates: React.FC<WorkflowTemplatesProps> = ({
  onSelectTemplate,
  onGenerateWorkflow
}) => {
  const handleTemplateClick = (templateId: string) => {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      if (onSelectTemplate) {
        onSelectTemplate(templateId);
      }
      if (onGenerateWorkflow) {
        onGenerateWorkflow(template);
      }
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center">
          <Sparkles className="w-6 h-6 mr-2 text-purple-500" />
          Workflow Templates
        </h2>
        <p className="text-slate-600 mt-2">
          Click on a template to instantly generate a complete workflow
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {WORKFLOW_TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <div
              key={template.id}
              onClick={() => handleTemplateClick(template.id)}
              className="group cursor-pointer"
            >
              <div className="bg-white rounded-xl border-2 border-slate-200 p-6 hover:border-purple-400 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-[#1e9df1] flex items-center justify-center text-white shadow-lg">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 group-hover:text-purple-600 transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-sm text-slate-500">{template.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-1 transition-all" />
                </div>

                {/* Workflow Steps Preview */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Workflow Steps
                  </div>
                  {template.steps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-3 text-sm"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#e3ecf6] flex items-center justify-center text-[#1e9df1] font-semibold text-xs shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 text-slate-700">{step}</div>
                      {index < template.steps.length - 1 && (
                        <div className="w-8 h-px bg-slate-300" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Generate Button */}
                <button className="mt-6 w-full bg-[#1e9df1] text-white font-semibold py-3 px-4 rounded-lg hover:bg-[#1c9cf0] transition-all flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl">
                  <Play className="w-4 h-4" />
                  <span>Generate Workflow</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Input Section */}
      <div className="mt-8 bg-[#e3ecf6] rounded-2xl border-2 border-dashed border-[#1e9df1]/30 p-8">
        <div className="text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-4 text-purple-500" />
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            Create Custom Workflow with AI
          </h3>
          <p className="text-slate-600 mb-6">
            Describe your workflow in plain English and let AI build it for you
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="e.g., Automate customer support ticket routing based on priority"
                className="w-full px-6 py-4 rounded-xl border-2 border-purple-200 focus:border-purple-400 focus:outline-none text-slate-700 text-sm"
              />
              <button className="absolute right-2 top-2 bg-[#1e9df1] text-white font-semibold py-2 px-6 rounded-lg hover:bg-[#1c9cf0] transition-all flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Generate</span>
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[
              'Automate meeting notes',
              'Customer support automation',
              'Lead qualification',
              'Incident response',
            ].map((suggestion) => (
              <button
                key={suggestion}
                className="px-4 py-2 rounded-full bg-white border border-purple-200 text-purple-600 text-sm hover:bg-purple-50 hover:border-purple-300 transition-all"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowTemplates;
