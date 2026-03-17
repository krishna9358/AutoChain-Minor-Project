import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { NODE_TYPES, NODE_CATEGORIES, getNodesByCategory, NodeCategory } from './config/nodeTypes';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface NodePaletteProps {
  onNodeDragStart?: (event: React.DragEvent, nodeId: string) => void;
}

const NodePalette: React.FC<NodePaletteProps> = ({ onNodeDragStart }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set(['trigger', 'ai-agent', 'tool', 'logic', 'control'])
  );

  const toggleCategory = (category: NodeCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleDragStart = (event: React.DragEvent, nodeId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/reactflow', nodeId);
    if (onNodeDragStart) {
      onNodeDragStart(event, nodeId);
    }
  };

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200 overflow-y-auto">
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <h2 className="text-lg font-bold text-slate-800">Workflow Nodes</h2>
        <p className="text-sm text-slate-600 mt-1">Drag nodes to canvas</p>
      </div>

      <div className="p-4 space-y-4">
        {(Object.keys(NODE_CATEGORIES) as NodeCategory[]).map((category) => {
          const categoryConfig = NODE_CATEGORIES[category];
          const nodes = getNodesByCategory(category);
          const isExpanded = expandedCategories.has(category);

          return (
            <div key={category} className="rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                style={{ backgroundColor: categoryConfig.bgColor }}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: categoryConfig.color }}
                  />
                  <span className="font-semibold text-sm text-slate-800">
                    {categoryConfig.name}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                )}
              </button>

              {isExpanded && (
                <div className="bg-white border-t border-slate-100">
                  <p className="px-4 py-2 text-xs text-slate-500 italic">
                    {categoryConfig.description}
                  </p>
                  <div className="divide-y divide-slate-100">
                    {nodes.map((node) => {
                      const Icon = node.icon;
                      return (
                        <div
                          key={node.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, node.id)}
                          className="flex items-start px-4 py-3 hover:bg-slate-50 cursor-grab active:cursor-grabbing transition-colors group"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 shrink-0"
                            style={{ backgroundColor: `${node.color}15` }}
                          >
                            <Icon
                              className="w-4 h-4"
                              style={{ color: node.color }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                              {node.name}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {node.description}
                            </p>
                          </div>
                          {node.requiresConfig && (
                            <div className="w-2 h-2 rounded-full bg-amber-400 ml-2 shrink-0 mt-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Tips Section */}
      <div className="p-4 mt-4 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg mx-4 mb-4">
        <h3 className="font-semibold text-sm text-slate-800 mb-2">💡 Quick Tips</h3>
        <ul className="text-xs text-slate-600 space-y-1.5">
          <li>• Start with a Trigger node</li>
          <li>• Connect nodes with lines</li>
          <li>• Click nodes to configure</li>
          <li>• Use Logic nodes for conditions</li>
          <li>• AI Agents help process data</li>
        </ul>
      </div>
    </div>
  );
};

export default NodePalette;
