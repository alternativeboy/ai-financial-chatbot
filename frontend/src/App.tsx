import { Navigate, Route, Routes } from 'react-router-dom';
import { ChatPage } from './pages/ChatPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      {/* The conversation id lives in the URL so a refresh reopens the same
          chat rather than dropping the user on a blank page. */}
      <Route path="/c/:conversationId" element={<ChatPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
