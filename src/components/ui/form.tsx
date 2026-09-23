'use client';
// Form controls (owner: B, design): Field, Input, Textarea, Select.
// Field links its label, hint and error to the control inside it through context:
// <Field label="Название" hint="Коротко, до 80 символов" error={errors.title}><Input value={title} onChange={...} /></Field>
import { createContext, useContext, useId } from 'react';
import type { AriaAttributes, ComponentProps, ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { controlBase } from './styles';

type FieldContextValue = { id: string; describedBy?: string; invalid: boolean; required: boolean };

const FieldContext = createContext<FieldContextValue | null>(null);

type ControlAriaProps = {
  id?: string;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: AriaAttributes['aria-invalid'];
  'aria-required'?: AriaAttributes['aria-required'];
};

function joinIds(...ids: (string | undefined)[]) {
  return ids.filter(Boolean).join(' ') || undefined;
}

/** id and aria-* for a control inside a Field. Props set on the control itself win. */
function useFieldControl(props: ControlAriaProps) {
  const field = useContext(FieldContext);
  return {
    id: props.id ?? field?.id,
    'aria-describedby': joinIds(props['aria-describedby'], field?.describedBy),
    'aria-invalid': props['aria-invalid'] ?? (field?.invalid ? true : undefined),
    'aria-required': props['aria-required'] ?? (field?.required && !props.required ? true : undefined),
  };
}

export type FieldProps = {
  label: ReactNode;
  /** Helper text under the control. An error replaces it while present. */
  hint?: ReactNode;
  /** Error text. Also marks the control aria-invalid (red border). */
  error?: ReactNode;
  /** Shows a required marker and sets aria-required on the control. */
  required?: boolean;
  /** id of the control, generated when omitted. Set it here, not on the control, so the label stays linked. */
  id?: string;
  className?: string;
  /** One Input, Textarea or Select. */
  children: ReactNode;
};

export function Field({ label, hint, error, required = false, id, className, children }: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const invalid = Boolean(error);
  const message = invalid ? error : hint;
  const messageId = message ? `${controlId}-message` : undefined;

  return (
    <FieldContext value={{ id: controlId, describedBy: messageId, invalid, required }}>
      <div className={clsx('flex flex-col gap-1.5', className)}>
        <label htmlFor={controlId} className="text-sm font-medium text-foreground">
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
          ) : null}
        </label>
        {children}
        {message ? (
          <p id={messageId} className={clsx('text-xs', invalid ? 'text-danger' : 'text-muted')}>
            {message}
          </p>
        ) : null}
      </div>
    </FieldContext>
  );
}

export type InputProps = ComponentProps<'input'>;

export function Input({ className, ...props }: InputProps) {
  const field = useFieldControl(props);
  return <input {...props} {...field} className={clsx(controlBase, 'h-9 px-3', className)} />;
}

export type TextareaProps = ComponentProps<'textarea'>;

export function Textarea({ className, ...props }: TextareaProps) {
  const field = useFieldControl(props);
  return (
    <textarea
      {...props}
      {...field}
      className={clsx(controlBase, 'min-h-24 resize-y px-3 py-2 leading-relaxed', className)}
    />
  );
}

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = ComponentProps<'select'> & {
  /** Options as data. <option> children work too and come after these. */
  options?: readonly SelectOption[];
  /** First option with value "", e.g. "Выберите отрасль". */
  placeholder?: string;
};

/** Native select with the kit look. className goes to the wrapper, so use it for width and margins. */
export function Select({ className, options, placeholder, children, ...props }: SelectProps) {
  const field = useFieldControl(props);
  return (
    <div className={clsx('relative', className)}>
      <select
        {...props}
        {...field}
        className={clsx(
          controlBase,
          'h-9 cursor-pointer appearance-none pr-9 pl-3 [&_option]:text-foreground',
          placeholder !== undefined && props.value === '' && 'text-muted',
        )}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
