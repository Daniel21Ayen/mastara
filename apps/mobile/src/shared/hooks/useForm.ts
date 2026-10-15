// apps/mobile/src/shared/hooks/useForm.ts
import { useCallback, useState } from 'react';

/** The small part of a Zod schema this hook needs, so apps do not depend on Zod directly. */
export interface SchemaLike<Output> {
  safeParse(value: unknown):
    | { success: true; data: Output }
    | { success: false; error: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> } };
}

type FieldValues = Record<string, string>;
type FieldErrors<V extends FieldValues> = Partial<Record<keyof V, string>>;

export interface FormApi<V extends FieldValues, Output> {
  values: V;
  errors: FieldErrors<V>;
  setValue: <K extends keyof V>(name: K, value: V[K]) => void;
  /** Change several fields at once (clears their errors). */
  setValues: (patch: Partial<V>) => void;
  /** Validates; returns the parsed data, or null after filling `errors`. */
  validate: () => Output | null;
}

export function useForm<V extends FieldValues, Output = V>(
  schema: SchemaLike<Output>,
  initialValues: V,
): FormApi<V, Output> {
  const [values, setAll] = useState<V>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<V>>({});

  const setValues = useCallback((patch: Partial<V>) => {
    setAll((prev) => ({ ...prev, ...patch }));
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(patch)) delete next[key as keyof V];
      return next;
    });
  }, []);

  const setValue = useCallback(
    <K extends keyof V>(name: K, value: V[K]) => setValues({ [name]: value } as unknown as Partial<V>),
    [setValues],
  );

  const validate = useCallback((): Output | null => {
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return result.data;
    }

    const next: FieldErrors<V> = {};
    for (const issue of result.error.issues) {
      const field = String(issue.path[0]) as keyof V;
      if (!(field in next)) next[field] = issue.message;
    }
    setErrors(next);
    return null;
  }, [schema, values]);

  return { values, errors, setValue, setValues, validate };
}
