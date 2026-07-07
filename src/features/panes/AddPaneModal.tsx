import { useEffect, useState, type FormEvent } from "react";
import { useAppStore } from "../../stores/appStore";
import { useUiStore } from "../../stores/uiStore";
import { TextField } from "../../components/ui/TextField";
import { Button } from "../../components/ui/Button";
import { ServicePresetTile } from "../../components/pane/ServicePresetTile";
import { SERVICE_PRESET_ICONS } from "../../components/pane/servicePresetIcons";
import { PRESET_SERVICES, type ServiceDefinition } from "../../core/services";
import { nextServiceTitle } from "./paneNaming";

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

/**
 * ペイン追加モーダル。main ビュー（PaneStripContainer 等）はアンマウントせず、
 * この上に重ねて表示する。表示中は uiStore.overlay が "modal" になり全 WebView が
 * hide されるため、ネイティブ WebView が DOM より手前に出る心配はない
 * （docs/ARCHITECTURE.md 1.2 Overlay Mode）。
 */
export function AddPaneModal() {
  const activeWorkspaceId = useAppStore((s) => s.activeWorkspaceId);
  const defaultPaneWidthRatio = useAppStore(
    (s) => s.settings.defaultPaneWidthRatio,
  );
  const addPane = useAppStore((s) => s.addPane);
  const setAddPaneOpen = useUiStore((s) => s.setAddPaneOpen);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | undefined>(undefined);

  const handleCancel = () => setAddPaneOpen(false);

  // Esc でキャンセル。input にフォーカスがあっても document 側で捕まえる。
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setAddPaneOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setAddPaneOpen]);

  const handleAddPreset = (service: ServiceDefinition) => {
    if (!activeWorkspaceId) return;

    const title = nextServiceTitle(service.name);
    const width = Math.round(window.innerWidth * defaultPaneWidthRatio);
    addPane(activeWorkspaceId, { title, url: service.url, width });
    setAddPaneOpen(false);
  };

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
    setAddPaneOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onPointerDown={(e) => {
        e.stopPropagation();
        handleCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ペインを追加"
        className="chrome-surface flex w-full max-w-md flex-col gap-4 rounded-lg border border-border p-6 shadow-xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h1 className="text-sm font-semibold text-text">ペインを追加</h1>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-text-dim">
            サービスから追加
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_SERVICES.map((service) => {
              const Icon = SERVICE_PRESET_ICONS[service.id];
              return (
                <ServicePresetTile
                  key={service.id}
                  name={service.name}
                  icon={Icon ? <Icon size={20} /> : null}
                  onClick={() => handleAddPreset(service)}
                />
              );
            })}
          </div>
        </div>

        <div className="h-px bg-border" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <span className="text-xs font-medium text-text-dim">
            カスタム URL
          </span>
          <TextField
            label="名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="X"
            required
            autoFocus
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
    </div>
  );
}
