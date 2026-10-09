'use client';

import { PlansSettings } from '@/components/workout/PlansSettings';

export default function PlansPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Protocols // library</div>
          <h1 className="page-title">Plans.</h1>
        </div>
      </div>

      <PlansSettings />
    </>
  );
}
