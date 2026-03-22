import yaml from "js-yaml";
import type { WorkflowTemplate } from "@/templates";

/**
 * Parse a YAML string into a WorkflowTemplate object
 */
export function parseTemplateYaml(yamlString: string): WorkflowTemplate {
  return yaml.load(yamlString) as WorkflowTemplate;
}

/**
 * Convert a WorkflowTemplate to YAML string for export
 */
export function templateToYaml(template: WorkflowTemplate): string {
  return yaml.dump(template, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}

/**
 * Validate a parsed template has required fields
 */
export function validateTemplate(template: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!template.id) errors.push("Missing template id");
  if (!template.name) errors.push("Missing template name");
  if (!template.description) errors.push("Missing template description");
  if (
    !template.nodes ||
    !Array.isArray(template.nodes) ||
    template.nodes.length === 0
  ) {
    errors.push("Template must have at least one node");
  }
  if (!template.edges || !Array.isArray(template.edges)) {
    errors.push("Template must have an edges array");
  }

  if (template.nodes) {
    for (const node of template.nodes) {
      if (!node.id) errors.push("Node missing id");
      if (!node.type) errors.push(`Node ${node.id || "?"} missing type`);
      if (!node.name) errors.push(`Node ${node.id || "?"} missing name`);
    }
  }

  return { valid: errors.length === 0, errors };
}
