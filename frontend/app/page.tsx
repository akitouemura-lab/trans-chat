"use client";

import { useCallback, useState } from "react";
import { ChatHeader } from "../features/chat/components/ChatHeader";
import { MessageInput } from "../features/chat/components/MessageInput";
import { MessageList } from "../features/chat/components/MessageList";
import { RoomControls } from "../features/chat/components/RoomControls";
import { TranslationMemoryPanel } from "../features/chat/components/TranslationMemoryPanel";
import { useChatSocket } from "../features/chat/hooks/useChatSocket";
import { useLocalChatSettings } from "../features/chat/hooks/useLocalChatSettings";
import { useRoomInviteLink } from "../features/chat/hooks/useRoomInviteLink";
import { useTranslationMemory } from "../features/chat/hooks/useTranslationMemory";

export default function Home() {
  const [text, setText] = useState("");
  const {
    userName,
    setUserName,
    roomInput,
    setRoomInput,
    activeRoomId,
    setActiveRoomId,
    activeInviteToken,
    setActiveInviteToken,
    translationDirection,
    setTranslationDirection,
    isDarkMode,
    setIsDarkMode
  } = useLocalChatSettings();

  const handleRoomChange = useCallback(
    (room: { roomId: string; inviteToken: string }) => {
      setActiveRoomId(room.roomId);
      setActiveInviteToken(room.inviteToken);
      setRoomInput(room.roomId);
    },
    [setActiveInviteToken, setActiveRoomId, setRoomInput]
  );

  const {
    history,
    savedPhrases,
    recordMessages,
    isPhraseSaved,
    savePhrase,
    removeSavedPhrase,
    markPhraseUsed,
    clearHistory,
    clearSavedPhrases
  } = useTranslationMemory();

  const {
    messages,
    isConnected,
    isLoadingHistory,
    isDeletingHistory,
    isSending,
    statusMessage,
    joinRoom,
    createRoom,
    deleteHistory,
    sendMessage
  } = useChatSocket({
    activeRoomId,
    activeInviteToken,
    userName,
    translationDirection,
    onRoomChange: handleRoomChange,
    onTranslatedMessages: recordMessages
  });
  const { inviteLink, inviteStatusMessage, copyInviteLink } =
    useRoomInviteLink(activeInviteToken);

  const handleUseMemoryText = useCallback((nextText: string) => {
    setText(nextText);
  }, []);

  const appClass = isDarkMode
    ? "min-h-screen bg-slate-950 text-slate-100"
    : "min-h-screen bg-slate-100 text-slate-950";

  const panelClass = isDarkMode
    ? "border-slate-800 bg-slate-900"
    : "border-slate-200 bg-white";

  const mutedTextClass = isDarkMode ? "text-slate-300" : "text-slate-600";

  const inputClass = isDarkMode
    ? "border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-400"
    : "border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-blue-500";

  return (
    <main className={appClass}>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 md:px-6">
        <ChatHeader
          activeRoomId={activeRoomId}
          userName={userName}
          isConnected={isConnected}
          translationDirection={translationDirection}
          isDarkMode={isDarkMode}
          panelClass={panelClass}
          mutedTextClass={mutedTextClass}
          onToggleTheme={() => setIsDarkMode((current) => !current)}
        />

        <RoomControls
          userName={userName}
          roomInput={roomInput}
          activeRoomId={activeRoomId}
          translationDirection={translationDirection}
          inviteLink={inviteLink}
          inviteStatusMessage={inviteStatusMessage}
          isConnected={isConnected}
          isLoadingHistory={isLoadingHistory}
          isDeletingHistory={isDeletingHistory}
          statusMessage={statusMessage}
          panelClass={panelClass}
          mutedTextClass={mutedTextClass}
          inputClass={inputClass}
          onUserNameChange={setUserName}
          onRoomInputChange={setRoomInput}
          onTranslationDirectionChange={setTranslationDirection}
          onJoinRoom={() => joinRoom(roomInput)}
          onCreateRoom={createRoom}
          onCopyInviteLink={copyInviteLink}
          onDeleteHistory={deleteHistory}
        />

        <TranslationMemoryPanel
          history={history}
          savedPhrases={savedPhrases}
          isDarkMode={isDarkMode}
          panelClass={panelClass}
          mutedTextClass={mutedTextClass}
          isPhraseSaved={isPhraseSaved}
          onSavePhrase={savePhrase}
          onUseText={handleUseMemoryText}
          onRemoveSavedPhrase={removeSavedPhrase}
          onMarkPhraseUsed={markPhraseUsed}
          onClearHistory={clearHistory}
          onClearSavedPhrases={clearSavedPhrases}
        />

        <MessageList
          messages={messages}
          userName={userName}
          activeRoomId={activeRoomId}
          isDarkMode={isDarkMode}
          panelClass={panelClass}
          mutedTextClass={mutedTextClass}
          isPhraseSaved={isPhraseSaved}
          onSavePhrase={savePhrase}
        />

        <MessageInput
          text={text}
          activeRoomId={activeRoomId}
          isConnected={isConnected}
          isSending={isSending}
          isDarkMode={isDarkMode}
          inputClass={inputClass}
          mutedTextClass={mutedTextClass}
          onTextChange={setText}
          onSendMessage={sendMessage}
        />
      </div>
    </main>
  );
}
