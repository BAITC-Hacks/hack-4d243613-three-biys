import { Suspense } from 'react';
import { Constructor } from '@/components/features/constructor/Constructor';

export default function NewTaskPage() {
  return (
    <Suspense>
      <Constructor />
    </Suspense>
  );
}
