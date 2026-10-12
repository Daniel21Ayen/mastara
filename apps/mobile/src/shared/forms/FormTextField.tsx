// apps/mobile/src/shared/forms/FormTextField.tsx
import { useI18n } from '@/core/i18n';
import type { FormApi } from '@/shared/hooks';
import { TextField } from '@/shared/ui';
import type { TextFieldProps } from '@/shared/ui';

type FormTextFieldProps<V extends Record<string, string>> = Omit<
  TextFieldProps,
  'value' | 'onChangeText' | 'error'
> & {
  form: FormApi<V, unknown>;
  name: keyof V & string;
};

/** A TextField wired to a `useForm` instance: value, change handler and translated error. */
export function FormTextField<V extends Record<string, string>>({
  form,
  name,
  ...rest
}: FormTextFieldProps<V>) {
  const { te } = useI18n();

  return (
    <TextField
      {...rest}
      value={form.values[name] ?? ''}
      onChangeText={(text) => form.setValue(name, text as V[typeof name])}
      error={te(form.errors[name])}
    />
  );
}
