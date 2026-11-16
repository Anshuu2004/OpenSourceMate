/**
 * OpenAPI to TypeScript Generator Module (Issue #268)
 */

export interface OpenApiPropertySchema {
  type?: string;
  description?: string;
  nullable?: boolean;
  enum?: string[];
  $ref?: string;
  items?: OpenApiPropertySchema;
  properties?: Record<string, OpenApiPropertySchema>;
  required?: string[];
}

export interface OpenApiComponentSchema {
  type?: string;
  description?: string;
  properties?: Record<string, OpenApiPropertySchema>;
  required?: string[];
  enum?: string[];
}

export interface OpenApiSpec {
  openapi?: string;
  components?: {
    schemas?: Record<string, OpenApiComponentSchema>;
  };
}

export function parseType(
  schema?: OpenApiPropertySchema,
  components?: Record<string, OpenApiComponentSchema>
): string {
  if (!schema) return "unknown";

  if (schema.$ref) {
    const refName = schema.$ref.split("/").pop();
    return refName || "unknown";
  }

  if (schema.enum) {
    return schema.enum.map((val) => JSON.stringify(val)).join(" | ");
  }

  if (schema.type === "string") {
    return "string";
  }

  if (schema.type === "integer" || schema.type === "number") {
    return "number";
  }

  if (schema.type === "boolean") {
    return "boolean";
  }

  if (schema.type === "array") {
    const itemType = parseType(schema.items, components);
    return `${itemType}[]`;
  }

  if (schema.type === "object") {
    if (schema.properties) {
      const props = Object.entries(schema.properties).map(([propName, propSchema]) => {
        const isRequired = schema.required && schema.required.includes(propName);
        const propType = parseType(propSchema, components);
        const opt = isRequired ? "" : "?";
        return `  ${propName}${opt}: ${propType};`;
      });
      return `{\n${props.join("\n")}\n}`;
    }
    return "Record<string, unknown>";
  }

  return "unknown";
}

export function generateTypeScriptTypes(schemaInput: string | OpenApiSpec): string {
  const schema: OpenApiSpec =
    typeof schemaInput === "string" ? JSON.parse(schemaInput) : schemaInput;
  const components = schema.components?.schemas || {};

  let output = `/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Generated from OpenAPI Specification (Issue #268)
 * Run: npm run codegen:types
 */

`;

  for (const [name, def] of Object.entries(components)) {
    if (def.description) {
      output += `/**\n * ${def.description}\n */\n`;
    }

    if (def.enum) {
      output += `export type ${name} = ${def.enum.map((e) => JSON.stringify(e)).join(" | ")};\n\n`;
      continue;
    }

    output += `export interface ${name} {\n`;
    const props = def.properties || {};
    const required = def.required || [];

    for (const [propName, propSchema] of Object.entries(props)) {
      const isRequired = required.includes(propName);
      const isNullable = propSchema.nullable;
      let propType = parseType(propSchema, components);

      if (isNullable) {
        propType = `${propType} | null`;
      }

      if (propSchema.description) {
        output += `  /** ${propSchema.description} */\n`;
      }
      output += `  ${propName}${isRequired ? "" : "?"}: ${propType};\n`;
    }

    output += `}\n\n`;
  }

  return output;
}
