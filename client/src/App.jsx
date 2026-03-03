import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Smartphone, Shield, LogOut } from 'lucide-react';

const socket = io('http://localhost:3001');

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    socket.on('qr', (dataUrl) => {
      setQrCodeDataUrl(dataUrl);
    });

    socket.on('ready', () => {
      setIsConnected(true);
      setQrCodeDataUrl('');
    });

    socket.on('logged_out', () => {
      setIsConnected(false);
      setQrCodeDataUrl('');
      setChats([]);
      setActiveChat(null);
      setMessages([]);
    });

    socket.on('chats', (newChats) => {
      setChats((prev) => {
        const chatMap = new Map(prev.map((c) => [c.id, c]));
        newChats.forEach((c) => chatMap.set(c.id, { ...chatMap.get(c.id), ...c }));
        return Array.from(chatMap.values());
      });
    });

    socket.on('message', (msg) => {
      // Very basic message append. Note: Real production apps need to handle chat context, 
      // deduplication, and parsing message structures.
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('qr');
      socket.off('ready');
      socket.off('logged_out');
      socket.off('chats');
      socket.off('message');
    };
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    socket.emit('send_message', {
      jid: activeChat.id,
      text: inputText.trim(),
    });

    // Optimistic UI updates could go here
    setInputText('');
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111b21] relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 w-full h-56 bg-[#00a884]"></div>

        <div className="z-10 bg-white dark:bg-[#222e35] rounded-xl shadow-[0_17px_50px_0_rgba(11,20,26,.19),0_12px_15px_0_rgba(11,20,26,.24)] w-full max-w-[1000px] p-10 mt-10 flex gap-8 mb-10 mx-4">
          <div className="flex-1 space-y-8">
            <div className="flex items-center gap-3 mb-10 text-[#00a884]">
              <Smartphone size={32} />
              <h1 className="text-3xl tracking-tight text-[#41525d] dark:text-[#e9edef] font-light">WhatsApp Web Clone</h1>
            </div>

            <div className="space-y-6 text-[#3b4a54] dark:text-[#8696a0] text-lg font-light leading-relaxed">
              <h2 className="text-2xl text-[#111b21] dark:text-[#e9edef] mb-6">Use WhatsApp on your computer</h2>
              <ol className="list-decimal pl-5 space-y-4">
                <li>Open WhatsApp on your phone</li>
                <li>Tap <strong>Menu</strong> or <strong>Settings</strong> and select <strong>Linked Devices</strong></li>
                <li>Tap on <strong>Link a Device</strong></li>
                <li>Point your phone to this screen to capture the code</li>
              </ol>
            </div>
            <div className="pt-8 text-[#00a884] flex items-center gap-2 text-sm">
              <Shield size={16} /> End-to-end encrypted
            </div>
          </div>

          <div className="w-[300px] flex-shrink-0 flex items-center justify-center relative">
            {qrCodeDataUrl ? (
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-auto" />
              </div>
            ) : (
              <div className="w-[264px] h-[264px] rounded-lg border-2 border-[#e9edef] dark:border-[#222d34] flex items-center justify-center flex-col gap-4 text-[#8696a0]">
                <div className="w-10 h-10 border-4 border-t-[#00a884] border-[#e9edef] dark:border-[#222d34] rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Generating QR...</p>
              </div>
            )}
            {/* Scanner Corner Guidelines */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#00a884] rounded-tl-lg pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#00a884] rounded-tr-lg pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#00a884] rounded-bl-lg pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#00a884] rounded-br-lg pointer-events-none"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#111b21] overflow-hidden text-[#e9edef]">
      {/* Sidebar Area */}
      <div className="flex w-[30%] min-w-[300px] max-w-[400px] flex-col border-r border-[#222d34] bg-[#111b21] z-10 glass-panel">
        {/* Header */}
        <header className="flex h-[60px] items-center justify-between bg-[#202c33] px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6b7c85] text-white">
              <span className="text-sm font-medium">Me</span>
            </div>
            <span className="font-semibold text-base tracking-wide">Chats</span>
          </div>
          <div className="flex gap-4 text-[#aebac1]">
            <button className="hover:text-white transition-colors" title="Log Out">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Search */}
        <div className="border-b border-[#222d34] bg-[#111b21] p-2">
          <div className="flex h-9 items-center rounded-lg bg-[#202c33] px-3">
            <input
              type="text"
              placeholder="Search or start a new chat"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#8696a0]"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-[#8696a0]">
              <p className="text-sm">Connecting or waiting for chats via Baileys...</p>
            </div>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`flex cursor-pointer border-b border-[#222d34] px-3 py-3 hover:bg-[#202c33] transition-colors ${activeChat?.id === chat.id ? 'bg-[#2a3942]' : ''
                  }`}
              >
                <div className="mr-3 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#6b7c85]">
                  <span className="text-white">{chat.name?.[0] || chat.id?.[0]}</span>
                </div>
                <div className="flex w-full flex-col justify-center overflow-hidden">
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="truncate text-base text-[#e9edef]">
                      {chat.name || chat.id}
                    </span>
                    <span className="flex-shrink-0 ml-2 text-xs text-[#8696a0]"></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col chat-bg relative">
        {activeChat ? (
          <>
            {/* Chat View Header */}
            <header className="flex h-[60px] items-center justify-between bg-[#202c33] px-4 z-10 glass-panel">
              <div className="flex items-center">
                <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#6b7c85]">
                  <span className="text-white">{activeChat.name?.[0] || activeChat.id?.[0]}</span>
                </div>
                <div>
                  <h2 className="text-base text-[#e9edef] leading-tight">
                    {activeChat.name || activeChat.id}
                  </h2>
                </div>
              </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
              {messages
                .filter(m => m.key.remoteJid === activeChat.id)
                .map((msg, idx) => {
                  const isMe = msg.key.fromMe;
                  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "[Media/Other Message]";

                  return (
                    <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] rounded-lg px-3 py-2 text-[15px] shadow-sm ${isMe ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none' : 'bg-[#202c33] text-[#e9edef] rounded-tl-none'
                          }`}
                      >
                        <p className="break-words leading-relaxed" style={{ wordBreak: 'break-word' }}>{text}</p>
                        <div className="mt-1 flex justify-end">
                          <span className="text-[11px] text-[rgba(255,255,255,0.6)]">
                            {new Date(msg.messageTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Input Area */}
            <footer className="bg-[#202c33] p-3 z-10 glass-panel">
              <form onSubmit={handleSendMessage} className="flex gap-2 mx-auto max-w-4xl">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message"
                  className="flex-1 rounded-lg bg-[#2a3942] px-4 py-2.5 text-[15px] text-[#e9edef] outline-none placeholder:text-[#8696a0]"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`flex items-center justify-center rounded-full p-2.5 transition-colors ${inputText.trim() ? 'text-[#00a884] hover:bg-white/5' : 'text-[#8696a0]'}`}
                >
                  <svg viewBox="0 0 24 24" height="24" width="24" preserveAspectRatio="xMidYMid meet" className="" version="1.1" x="0px" y="0px" enableBackground="new 0 0 24 24"><path fill="currentColor" d="M1.101,21.757L23.8,12.028L1.101,2.3l0.011,7.912l13.623,1.816L1.112,13.845 L1.101,21.757z"></path></svg>
                </button>
              </form>
            </footer>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center p-8 bg-[#222e35]">
            <div className="mb-8 p-12 bg-[#202c33] rounded-full shadow-lg">
              <Smartphone size={100} className="text-[#00a884] opacity-80" />
            </div>
            <h1 className="mt-8 text-3xl font-light text-[#e9edef] tracking-tight">WhatsApp Web Clone</h1>
            <p className="mt-4 text-[#8696a0] max-w-[460px] text-[15px] leading-relaxed">
              Send and receive messages without keeping your phone online.<br />
              Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
            </p>
            <div className="absolute bottom-10 flex items-center gap-2 text-[13px] text-[#667781]">
              <Shield size={14} /> <span>End-to-end encrypted</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
