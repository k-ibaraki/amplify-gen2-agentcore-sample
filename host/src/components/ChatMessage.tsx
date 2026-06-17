interface Props {
  role: "user" | "assistant";
  text: string;
  isError?: boolean;
}

export function ChatMessage({ role, text, isError }: Props) {
  return (
    <div
      className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] px-4 py-2 rounded-lg whitespace-pre-wrap ${
          isError
            ? "bg-red-50 text-red-700 border border-red-200"
            : role === "user"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-900"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
