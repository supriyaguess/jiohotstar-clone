import { useApp } from '../../context/AppContext';
import ChatLauncher from './ChatLauncher';

/** What signed-out visitors see: the same button, but clicking asks them to sign up first. */
export default function GuestChatButton() {
  const { requireAuth } = useApp();
  return <ChatLauncher pulse onClick={() => requireAuth(() => {}, 'chat')} />;
}
