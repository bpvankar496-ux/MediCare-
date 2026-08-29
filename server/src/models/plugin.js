// Shared schema options: adds a clean `id` string field (mirrors Supabase's
// uuid `id` column) and strips Mongo's internal `_id`/`__v` from JSON output,
// so the frontend can keep using `row.id` exactly like it did with Supabase.
export function applyIdTransform(schema) {
  schema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
      ret.id = ret._id.toString()
      delete ret._id
      delete ret.__v
    },
  })
}
