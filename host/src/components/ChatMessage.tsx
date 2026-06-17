import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
        className={`max-w-[80%] px-4 py-2 rounded-lg ${
          isError
            ? "bg-red-50 text-red-700 border border-red-200"
            : role === "user"
              ? "bg-blue-600 text-white whitespace-pre-wrap"
              : "bg-gray-100 text-gray-900"
        }`}
      >
        {role === "assistant" && !isError ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              h1: ({ children }) => <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-bold mt-3 mb-2 first:mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1 first:mt-0">{children}</h3>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
              code: ({ children, className }) => {
                const content = String(children);
                const isBlock = !!className || content.includes("\n");
                return isBlock ? (
                  <code className="block bg-gray-800 text-gray-100 rounded p-3 my-2 text-sm overflow-x-auto whitespace-pre">{children}</code>
                ) : (
                  <code className="bg-gray-200 text-gray-800 rounded px-1 py-0.5 text-sm">{children}</code>
                );
              },
              pre: ({ children }) => <pre className="my-2">{children}</pre>,
              blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-400 pl-3 my-2 text-gray-600">{children}</blockquote>,
              a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-blue-700 hover:text-blue-900">{children}</a>,
              table: ({ children }) => <div className="overflow-x-auto my-2"><table className="border-collapse text-sm">{children}</table></div>,
              th: ({ children }) => <th className="border border-gray-400 px-3 py-1 bg-gray-200 font-semibold">{children}</th>,
              td: ({ children }) => <td className="border border-gray-400 px-3 py-1">{children}</td>,
            }}
          >
            {text}
          </ReactMarkdown>
        ) : (
          text
        )}
      </div>
    </div>
  );
}
