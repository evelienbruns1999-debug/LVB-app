import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { NL } from '../nl';
import { useVoice } from '../hooks/useVoice';

function formatTime(value) {
  return new Date(value).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ client, role = 'client', caregiverName = 'Begeleider' }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const handleVoice = useCallback((transcript) => {
    if (!transcript) return;
    setText((current) => (current ? `${current} ${transcript}` : transcript));
  }, []);
  const { listening, supported, startListening } = useVoice(handleVoice);

  useEffect(() => {
    loadChat();
    const timer = setInterval(loadChat, 8000);
    return () => clearInterval(timer);
  }, [client.id]);

  async function loadChat() {
    try {
      const data = await api.getChat(client.id);
      setMessages(data);
      await api.markChatRead(client.id, role);
    } catch (_) {}
  }

  async function sendMessage() {
    if (!text.trim()) return;
    try {
      await api.sendChat(client.id, { sender_role: role, message: text.trim() });
      setText('');
      loadChat();
    } catch (_) {}
  }

  const grouped = useMemo(() => messages, [messages]);

  return (
    <div style={{ minHeight: '100vh', padding: '18px 16px 110px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card" style={{ background: 'var(--blue-lt)' }}>
        <h3 style={{ marginBottom: 6 }}>{NL.chatTitle}</h3>
        <p style={{ color: 'var(--text-mid)', fontWeight: 600 }}>{NL.chatIntro(caregiverName)}</p>
      </div>

      <div className="card" style={{ flex: 1, minHeight: 360, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {grouped.map((message) => {
            const mine = message.sender_role === role;
            return (
              <div key={message.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <div
                  style={{
                    maxWidth: '82%',
                    background: mine ? 'var(--green-lt)' : 'var(--purple-lt)',
                    border: `1.5px solid ${mine ? 'var(--green)' : 'var(--purple)'}`,
                    borderRadius: 16,
                    padding: '10px 12px',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{message.message}</div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center', fontSize: 11, color: 'var(--text-soft)', fontWeight: 700 }}>
                    <span>{formatTime(message.created_at)}</span>
                    {role === 'caregiver' && mine && (
                      <span>{message.read_at ? '✓✓' : '✓'}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {grouped.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-soft)', fontWeight: 600, padding: '30px 0' }}>
              {NL.chatEmpty}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <textarea
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={NL.chatPlaceholder}
          style={{ flex: '1 1 100%', minHeight: 52 }}
        />
        <div style={{ display: 'flex', gap: 8, width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          {supported ? (
            <button
              type="button"
              className={`btn-voice-mic${listening ? ' recording' : ''}`}
              onClick={startListening}
              aria-label={NL.recordVoice}
            >
              <span style={{ fontSize: 18 }}>🎙️</span>
              {listening ? NL.recordingVoice : NL.recordVoice}
            </button>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-soft)', fontWeight: 700 }}>{NL.voiceNotSupported}</span>
          )}
          <button type="button" className="btn btn-green" onClick={sendMessage} disabled={!text.trim()}>
            {NL.send}
          </button>
        </div>
      </div>
    </div>
  );
}
