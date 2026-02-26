import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Header } from './components/ui/Header';
import Landing from './pages/Landing';
import MultiSender from './pages/MultiSender';
import History from './pages/History';
import Admin from './pages/Admin';

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <Header />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          },
        }}
      />
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<MultiSender />} />
          <Route path="/history" element={<History />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
}
