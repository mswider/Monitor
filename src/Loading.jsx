import React, { useState, useEffect } from 'react';

function Loading() {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let newRotation = rotation + 2;
      if (newRotation == 360) newRotation = 0;
      setRotation(newRotation);
    }, 10);
    return () => clearTimeout(timer);
  }, [rotation, setRotation]);

  const spinnerStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '100px',
    height: '100px',
    border: '4px solid #000',
    borderRadius: '50%',
    borderTopColor: 'transparent'
  };
  return (
    <div style={{height: '100vh', position: 'relative', fontFamily: '"system-ui", sans-serif'}}>
      <div style={{...spinnerStyle, transform: `translate(-50%, -50%) rotate(${rotation}deg)`}}>
      </div>
      <h1 style={{fontSize: '3em', position: 'absolute', left: '50%', transform: 'translate(-50%, 0)', bottom: '10%'}}>
        GoGuardian Monitor
      </h1>
    </div>
  );
}

export default Loading;
