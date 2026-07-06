import { useState, type FormEvent } from "react";
import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { TextField } from "../../components/ui/TextField";
import { Button } from "../../components/ui/Button";

const URL_SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//;

/** http/https URL として正規化する。スキーム無しは https:// を補完し、http/https 以外は無効。 */
function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = URL_SCHEME_RE.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function AddPaneView() {
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const defaultPaneWidthRatio = useAppStore(
    (s) => s.settings.defaultPaneWidthRatio,
  );
  const addPane = useAppStore((s) => s.addPane);
  const setView = useUiStore((s) => s.setView);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>(undefined);

  const handleCancel = () => setView("main");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeWorkspaceId) return;

    const normalized = normalizeUrl(url);
    if (!normalized) {
      setUrlError("http または https の URL を入力してください");
      return;
    }

    const width = Math.round(window.innerWidth * defaultPaneWidthRatio);
    addPane(activeWorkspaceId, { title: name.trim(), url: normalized, width });
    setView("main");
  };

  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <form
        onSubmit={handleSubmit}
        className="flex w-80 flex-col gap-4 rounded-lg border border-border bg-surface p-6"
      >
        <h1 className="text-sm font-semibold text-text">ペインを追加</h1>
        <TextField
          label="名前"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="X"
          required
        />
        <TextField
          label="URL"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setUrlError(undefined);
          }}
          placeholder="https://x.com"
          error={urlError}
          required
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            キャンセル
          </Button>
          <Button type="submit" variant="primary">
            追加
          </Button>
        </div>
      </form>
    </div>
  );
}
