export function UISchemaRenderer({ schema }: { schema: any }) {
  if (schema.type === "timeline") return <pre>{JSON.stringify(schema.data)}</pre>;
  if (schema.type === "summary") return <pre>{JSON.stringify(schema.data)}</pre>;
  return null;
}
