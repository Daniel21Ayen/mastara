// apps/admin-web/src/app/page.tsx
import { redirect } from 'next/navigation';

/** The portal starts at the dashboard; `middleware.ts` sends signed-out visitors to the login page. */
export default function HomePage() {
  redirect('/dashboard');
}
