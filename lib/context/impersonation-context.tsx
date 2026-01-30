"use client";

/**
 * Impersonation Context
 *
 * Provides impersonation state to the entire dashboard when an admin
 * is viewing as another user. Components can use this to hide or
 * disable create/edit/delete actions.
 */

import { createContext, useContext } from "react";

interface ImpersonationState {
  isImpersonating: boolean;
  impersonatedUserId: string | null;
  impersonatedEmail: string | null;
}

const ImpersonationContext = createContext<ImpersonationState>({
  isImpersonating: false,
  impersonatedUserId: null,
  impersonatedEmail: null,
});

export function ImpersonationProvider({
  value,
  children,
}: {
  value: ImpersonationState;
  children: React.ReactNode;
}) {
  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation(): ImpersonationState {
  return useContext(ImpersonationContext);
}
