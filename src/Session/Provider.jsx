import React, { createContext } from 'react';

const SessionContext = createContext({});

function SessionProvider({ session, device, children }) {
  return (
    <SessionContext.Provider value={{ session, device }}>
      {children}
    </SessionContext.Provider>
  );
}

export { SessionContext, SessionProvider };