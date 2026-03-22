import { BaseNodeExecutor } from "../../execution/base-executor";
import {
  ValidationNode,
  NodeExecutionContext,
} from "../../types/nodes";
import { generateText } from "ai";
import { getAIProvider, getDefaultModel } from "../../utils/aiProvider";
import { safeEval } from "../../utils/safeEval";

/**
 * Validation Node Executor
 * Handles data validation with various validation strategies
 */
export class ValidationNodeExecutor extends BaseNodeExecutor {
  protected async executeNode(
    node: ValidationNode,
    context: NodeExecutionContext
  ): Promise<any> {
    this.validateRequiredFields(node, ["validation_type", "rules"]);

    // Resolve template variables in rules
    const resolvedRules = this.resolveTemplate(node.rules, context);

    // Perform validation based on type
    const validationResult = await this.performValidation(
      node.validation_type,
      resolvedRules,
      node.schema,
      node.ai_config,
      context,
      node.confidence_threshold
    );

    // Determine if validation passed
    const passed = validationResult.passed;
    const confidence = validationResult.confidence || 0;

    // Check against confidence threshold
    const meetsThreshold = confidence >= (node.confidence_threshold || 0.8);
    const validationPassed = passed && meetsThreshold;

    // Handle validation failure based on configuration
    if (!validationPassed) {
      await this.handleValidationFailure(node, context, validationResult);
    }

    return {
      validation_type: node.validation_type,
      passed: validationPassed,
      confidence: confidence,
      meets_threshold: meetsThreshold,
      validation_result: validationResult,
      rules: resolvedRules,
      on_fail: node.on_fail,
      fallback_node: node.fallback_node,
      error_message: node.error_message,
      metadata: {
        threshold: node.confidence_threshold,
        validation_time_ms: validationResult.duration_ms || 0,
        strategy: node.validation_type,
      },
    };
  }

  /**
   * Perform validation based on type
   */
  private async performValidation(
    validationType: string,
    rules: any,
    schema: any,
    aiConfig: any,
    context: NodeExecutionContext,
    confidenceThreshold: number
  ): Promise<{
    passed: boolean;
    confidence: number;
    duration_ms: number;
    details: any;
    errors: string[];
  }> {
    const startTime = Date.now();

    try {
      switch (validationType) {
        case 'schema':
          return await this.validateSchema(rules, schema, context);

        case 'ai':
          return await this.validateWithAI(rules, aiConfig, context, confidenceThreshold);

        case 'business_rule':
          return await this.validateBusinessRules(rules, context);

        case 'custom':
          return await this.validateCustom(rules, context);

        default:
          throw new Error(`Unknown validation type: ${validationType}`);
      }
    } catch (error: any) {
      return {
        passed: false,
        confidence: 0,
        details: { error: error.message },
        errors: [error.message],
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate data against JSON schema
   */
  private async validateSchema(
    rules: any,
    schema: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const startTime = Date.now();
    const errors: string[] = [];

    // Get data to validate
    const data = this.resolveTemplate(rules, context);
    const schemaToValidate = schema || rules.schema || rules;

    // Basic required field validation
    if (schemaToValidate.required) {
      const missingFields = schemaToValidate.required.filter(
        (field: string) => !this.hasNestedValue(data, field)
      );

      if (missingFields.length > 0) {
        errors.push(`Missing required fields: ${missingFields.join(", ")}`);
      }
    }

    // Type validation
    if (schemaToValidate.properties) {
      for (const [field, fieldSchema] of Object.entries(schemaToValidate.properties)) {
        const value = this.getNestedValue(data, field);

        if (value !== undefined && value !== null) {
          const typeValidation = this.validateFieldType(
            field,
            value,
            fieldSchema as any
          );

          if (!typeValidation.valid) {
            errors.push(typeValidation.error!);
          }
        } else if (
          schemaToValidate.required &&
          schemaToValidate.required.includes(field)
        ) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Pattern validation
    if (schemaToValidate.patterns) {
      for (const [field, pattern] of Object.entries(schemaToValidate.patterns)) {
        const value = this.getNestedValue(data, field);

        if (value !== undefined && value !== null) {
          const regex = new RegExp(pattern as string);
          if (!regex.test(String(value))) {
            errors.push(
              `Field ${field} does not match required pattern: ${pattern}`
            );
          }
        }
      }
    }

    // Range validation
    if (schemaToValidate.ranges) {
      for (const [field, range] of Object.entries(schemaToValidate.ranges)) {
        const value = this.getNestedValue(data, field);

        if (value !== undefined && typeof value === 'number') {
          const rangeConfig = range as any;
          if (rangeConfig.min !== undefined && value < rangeConfig.min) {
            errors.push(
              `Field ${field} is below minimum value: ${rangeConfig.min}`
            );
          }
          if (rangeConfig.max !== undefined && value > rangeConfig.max) {
            errors.push(
              `Field ${field} exceeds maximum value: ${rangeConfig.max}`
            );
          }
        }
      }
    }

    return {
      passed: errors.length === 0,
      confidence: errors.length === 0 ? 1 : 0,
      details: {
        data,
        schema: schemaToValidate,
        validation_type: 'schema',
      },
      errors,
      duration_ms: Date.now() - startTime,
    };
  }

  /**
   * Validate field type
   */
  private validateFieldType(
    field: string,
    value: any,
    schema: any
  ): { valid: boolean; error?: string } {
    const expectedTypes = Array.isArray(schema.type)
      ? schema.type
      : [schema.type];

    let isValid = false;
    for (const type of expectedTypes) {
      if (this.checkType(value, type)) {
        isValid = true;
        break;
      }
    }

    if (!isValid) {
      return {
        valid: false,
        error: `Field ${field} has invalid type. Expected: ${expectedTypes.join(', ')}, Got: ${typeof value}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check value type
   */
  private checkType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'integer':
        return Number.isInteger(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'null':
        return value === null;
      default:
        return false;
    }
  }

  /**
   * Validate data using AI
   */
  private async validateWithAI(
    rules: any,
    aiConfig: any,
    context: NodeExecutionContext,
    confidenceThreshold: number
  ): Promise<any> {
    const startTime = Date.now();

    // Get data to validate
    const data = context.input_data;
    const validationRules = typeof rules === 'string' ? rules : JSON.stringify(rules);

    // Create validation prompt
    const systemPrompt = `You are a data validation expert. Your task is to validate data against the provided rules.

Validation Rules:
${validationRules}

Analyze the data and determine if it passes validation. Provide:
1. A boolean validation result (true/false)
2. Your confidence level (0-1)
3. A detailed explanation
4. List of any issues found

Respond in JSON format with the following structure:
{
  "passed": boolean,
  "confidence": number,
  "explanation": string,
  "issues": string[]
}`;

    const userPrompt = `Data to validate:
${JSON.stringify(data, null, 2)}`;

    try {
      const provider = getAIProvider();
      const model = aiConfig?.model || getDefaultModel();

      const { text } = await generateText({
        model: provider(model),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      });

      const result = JSON.parse(text || "{}");

      return {
        passed: result.passed || false,
        confidence: result.confidence || 0,
        details: {
          explanation: result.explanation || '',
          validation_type: 'ai',
          model,
        },
        errors: result.issues || [],
        duration_ms: Date.now() - startTime,
      };
    } catch (error: any) {
      throw new Error(`AI validation failed: ${error.message}`);
    }
  }

  /**
   * Validate against business rules
   */
  private async validateBusinessRules(
    rules: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const startTime = Date.now();
    const errors: string[] = [];

    const data = context.input_data;
    const businessRules = Array.isArray(rules) ? rules : [rules];

    for (const rule of businessRules) {
      const validationResult = this.evaluateBusinessRule(rule, data, context);

      if (!validationResult.passed) {
        errors.push(validationResult.error || 'Business rule validation failed');
      }
    }

    return {
      passed: errors.length === 0,
      confidence: errors.length === 0 ? 1 : 0,
      details: {
        rules: businessRules,
        validation_type: 'business_rule',
        rules_evaluated: businessRules.length,
      },
      errors,
      duration_ms: Date.now() - startTime,
    };
  }

  /**
   * Evaluate single business rule
   */
  private evaluateBusinessRule(
    rule: any,
    data: any,
    context: NodeExecutionContext
  ): { passed: boolean; error?: string } {
    try {
      const condition = rule.condition || rule.expression;
      const errorMessage = rule.error_message || rule.message;

      // Evaluate condition
      const scope = {
        input: data,
        prev: context.previous_results,
        variables: context.variables,
        state: context.workflow_state,
      };

      const result = safeEval(condition, scope);

      if (!result) {
        return {
          passed: false,
          error: errorMessage || `Business rule failed: ${condition}`,
        };
      }

      return { passed: true };
    } catch (error: any) {
      return {
        passed: false,
        error: `Business rule evaluation error: ${error.message}`,
      };
    }
  }

  /**
   * Custom validation implementation
   */
  private async validateCustom(
    rules: any,
    context: NodeExecutionContext
  ): Promise<any> {
    const startTime = Date.now();
    const errors: string[] = [];

    // Custom validation can be implemented as JavaScript functions
    if (typeof rules === 'string') {
      try {
        const scope = {
          input: context.input_data,
          prev: context.previous_results,
          variables: context.variables,
          state: context.workflow_state,
        };

        const result = safeEval(rules, scope);

        return {
          passed: Boolean(result),
          confidence: Boolean(result) ? 1 : 0,
          details: {
            expression: rules,
            result,
            validation_type: 'custom',
          },
          errors: Boolean(result) ? [] : ['Custom validation expression returned false'],
          duration_ms: Date.now() - startTime,
        };
      } catch (error: any) {
        return {
          passed: false,
          confidence: 0,
          details: {
            expression: rules,
            error: error.message,
            validation_type: 'custom',
          },
          errors: [error.message],
          duration_ms: Date.now() - startTime,
        };
      }
    }

    // Support array of custom validation functions
    if (Array.isArray(rules)) {
      for (const rule of rules) {
        const result = await this.validateCustom(rule, context);
        if (!result.passed) {
          errors.push(...result.errors);
        }
      }

      return {
        passed: errors.length === 0,
        confidence: errors.length === 0 ? 1 : 0,
        details: {
          rules,
          validation_type: 'custom',
        },
        errors,
        duration_ms: Date.now() - startTime,
      };
    }

    return {
      passed: false,
      confidence: 0,
      details: { rules, validation_type: 'custom' },
      errors: ['Invalid custom validation configuration'],
      duration_ms: Date.now() - startTime,
    };
  }

  /**
   * Handle validation failure
   */
  private async handleValidationFailure(
    node: ValidationNode,
    context: NodeExecutionContext,
    validationResult: any
  ): Promise<void> {
    const errorMessage = node.error_message ||
      `Validation failed for ${node.validation_type}. Errors: ${validationResult.errors.join(', ')}`;

    // Log validation failure
    console.error(`Validation failed: ${errorMessage}`);

    // Handle based on on_fail strategy
    switch (node.on_fail) {
      case 'stop':
        throw new Error(errorMessage);

      case 'retry':
        throw new Error(errorMessage);

      case 'continue':
        console.warn(`Validation failed but continuing: ${errorMessage}`);
        break;

      case 'fallback':
        if (node.fallback_node) {
          console.log(`Executing fallback node: ${node.fallback_node}`);
        }
        break;
    }
  }

  /**
   * Check if nested value exists
   */
  private hasNestedValue(obj: any, path: string): boolean {
    return this.getNestedValue(obj, path) !== undefined;
  }
}

/**
 * Export types for use in other modules
 */
export type { ValidationNode };
