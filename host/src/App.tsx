import { useState } from "react";
import { ChatInput } from "./components/ChatInput";
import { ChatMessage } from "./components/ChatMessage";
import { useMcpClient } from "./hooks/useMcpClient";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  isError?: boolean;
}

export default function App() {
  const { client, connected } = useMcpClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (prompt: string) => {
    if (!client || !connected || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: prompt },
    ]);
    setLoading(true);

    try {
      const result = await client.callTool({
        name: "ask",
        arguments: { prompt },
      });
      const content = result.content as Array<{ type: string; text?: string }>;
      const text = content
        .filter((c) => c.type === "text" && c.text !== undefined)
        .map((c) => c.text as string)
        .join("");
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: err instanceof Error ? err.message : "エラーが発生しました",
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      <header className="p-4 border-b">
        <h1 className="text-xl font-bold">Sample Agent</h1>
        <span
          className={`text-sm ${connected ? "text-green-600" : "text-red-600"}`}
        >
          {connected ? "接続済み" : "接続中..."}
        </span>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            text={msg.text}
            isError={msg.isError}
          />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-lg animate-pulse">
              回答中...
            </div>
          </div>
        )}
      </main>

      <ChatInput onSend={handleSend} disabled={!connected || loading} />
    </div>
  );
}
