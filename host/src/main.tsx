import { Amplify } from "aws-amplify";
import { getCurrentUser, signInWithRedirect } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadAmplifyConfig } from "./amplify-config";
import "./index.css";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const redirectToLogin = () =>
      signInWithRedirect().catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      );

    getCurrentUser()
      .then(() => setReady(true))
      .catch(redirectToLogin);

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signedIn") setReady(true);
      if (payload.event === "signedOut") redirectToLogin();
    });
    return unsubscribe;
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-600">
        ログインページへ移動できませんでした: {error}
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        認証確認中...
      </div>
    );
  }
  return <>{children}</>;
}

loadAmplifyConfig().then((config) => {
  if (Object.keys(config).length > 0) {
    Amplify.configure(config);
  }

  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("#root element not found");
  createRoot(rootEl).render(
    <StrictMode>
      <AuthGuard>
        <App />
      </AuthGuard>
    </StrictMode>,
  );
});
