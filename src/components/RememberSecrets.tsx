import React, { useState } from 'react';
import { getRememberSecrets, setRememberSecrets } from '../lib/storage.ts';
import { Check } from './ui.tsx';

/** Opt-in, shared by every tool that handles credentials. Off by default. */
export const RememberSecrets: React.FC = () => {
  const [on, setOn] = useState(getRememberSecrets);
  return (
    <span
      className="font-sans font-normal normal-case tracking-normal whitespace-nowrap"
      title="Off: tokens, passwords, cookies and variable values are kept only until you close the page. On: they are saved unencrypted in this browser. Applies to API Client, cURL Runner and JWT Decoder."
    >
      <Check
        checked={on}
        onChange={(v) => {
          setRememberSecrets(v);
          setOn(v);
        }}
      >
        Remember secrets
      </Check>
    </span>
  );
};
