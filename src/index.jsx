import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom'

import App from './App.jsx'

const message = `GoGuardian Monitor v${APP_VERSION}
Source code: https://github.com/mswider/Monitor`;
console.log(message);

ReactDOM.render(
  <HashRouter>
    <App />
  </HashRouter>,
  document.getElementById('app'));
