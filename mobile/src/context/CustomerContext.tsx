import React, { createContext, useContext, useMemo, useState } from 'react';

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  locale: 'ja' | 'en';
};

type CustomerContextValue = {
  customer: Customer | null;
  setCustomer: (value: Customer | null) => void;
};

const CustomerContext = createContext<CustomerContextValue | null>(null);

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);

  const value = useMemo<CustomerContextValue>(() => {
    return { customer, setCustomer };
  }, [customer]);

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer() {
  const ctx = useContext(CustomerContext);
  if (!ctx) {
    throw new Error('useCustomer must be used within CustomerProvider');
  }
  return ctx;
}
