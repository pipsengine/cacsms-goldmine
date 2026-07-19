export function requireValue<T>(value: T | null | undefined, label: string): T { if (value == null) throw new Error(`${label} is required`); return value; }
