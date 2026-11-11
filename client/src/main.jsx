import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  return <main><h1>SmallWeb</h1><p>Browser infrastructure is ready.</p></main>;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
