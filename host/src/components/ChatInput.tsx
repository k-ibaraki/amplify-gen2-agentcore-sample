import { useState } from "react";
import { Button } from "./ui/button";

interface Props {
  onSend: (prompt: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");

  const submit = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  return (
    <div className="flex gap-2 p-4 border-t">
      <textarea
        className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="質問を入力... (Shift+Enterで改行)"
        disabled={disabled}
      />
      <Button type="button" onClick={submit} disabled={disabled || !value.trim()}>
        送信
      </Button>
    </div>
  );
}
