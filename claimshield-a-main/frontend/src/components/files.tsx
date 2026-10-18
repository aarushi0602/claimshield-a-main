import { useRef, useState, type ReactNode } from "react";
import { CheckCircle2, FileUp, RefreshCw, Trash2 } from "lucide-react";
import { cx } from "./ui";

export const MAX_FILES_PER_GROUP = 10;
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;

export function validatePdfs(files: File[], max = MAX_FILES_PER_GROUP): string | null {
  if (files.length > max) return `Choose up to ${max} PDF files.`;
  if (files.some((f) => !/\.pdf$/i.test(f.name))) return "Only PDF files are accepted.";
  if (files.some((f) => f.size > MAX_FILE_BYTES)) return "Each PDF must be 15 MB or smaller.";
  return null;
}

export function kb(size: number): string {
  return size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(size / 1024)} KB`;
}

/** Drag-and-drop ingestion zone (DESIGN.md: dashed 1.5px, #FAFCFE, hover #EFF6FF). */
export function DropZone({
  files,
  onFiles,
  multiple = true,
  title,
  hint,
  onError,
  icon,
}: {
  files: File[];
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  title: ReactNode;
  hint: ReactNode;
  onError: (message: string | null) => void;
  icon?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const accept = (list: FileList | null) => {
    const chosen = [...(list ?? [])];
    const error = validatePdfs(chosen, multiple ? MAX_FILES_PER_GROUP : 1);
    if (error) {
      onError(error);
      onFiles([]);
    } else {
      onError(null);
      onFiles(chosen);
    }
    if (input.current) input.current.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file) => (
            <li key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-lg border border-line bg-container-low px-3 py-2">
              <CheckCircle2 className="size-5 shrink-0 text-teal" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-label-md text-ink">{file.name}</p>
                <p className="text-body-sm text-muted">{kb(file.size)} · PDF</p>
              </div>
            </li>
          ))}
          <li className="flex gap-2">
            <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-label-md text-ink hover:bg-neutral-bg">
              <RefreshCw className="size-3.5" aria-hidden /> Replace
            </button>
            <button type="button" onClick={() => onFiles([])} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-label-md text-muted hover:bg-neutral-bg" aria-label="Remove files">
              <Trash2 className="size-3.5" aria-hidden /> Remove
            </button>
          </li>
        </ul>
      )}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          accept(e.dataTransfer.files);
        }}
        className={cx(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-[1.5px] border-dashed px-4 py-6 text-center transition-colors",
          drag ? "border-action bg-action-soft" : "border-line-strong bg-[#FAFCFE] hover:border-action hover:bg-action-soft",
        )}
      >
        <span className="grid size-11 place-items-center rounded-full bg-action-soft text-action">{icon ?? <FileUp className="size-5" aria-hidden />}</span>
        <span className="text-body-md text-ink">
          {title} <span className="font-semibold text-action underline">browse</span>
        </span>
        <span className="text-body-sm text-muted">{hint}</span>
        <input ref={input} type="file" accept="application/pdf,.pdf" multiple={multiple} className="sr-only" onChange={(e) => accept(e.target.files)} />
      </label>
    </div>
  );
}

/** Compact file field for the claim tools, with an optional shortcut to reuse files the user
 * already chose for their audit in this session. */
export function FilePicker({
  label,
  files,
  onFiles,
  multiple = false,
  required = false,
  reuse,
  reuseLabel,
  hint,
}: {
  label: ReactNode;
  files: File[];
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  required?: boolean;
  reuse?: File[];
  reuseLabel?: string;
  hint?: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const canReuse = reuse && reuse.length > 0 && !(files.length === reuse.length && files.every((f, i) => f === reuse[i]));
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label-md text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
        <button type="button" onClick={() => input.current?.click()} className="rounded-md bg-action-soft px-3 py-1 text-label-md text-action hover:bg-container">
          Choose PDF{multiple ? "s" : ""}
        </button>
        <span className="min-w-0 flex-1 truncate text-body-sm text-muted">
          {files.length ? files.map((f) => f.name).join(", ") : "No file chosen"}
        </span>
        {files.length > 0 && (
          <button type="button" onClick={() => onFiles([])} className="text-muted hover:text-danger" aria-label="Clear files">
            <Trash2 className="size-4" />
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            const chosen = [...(e.target.files ?? [])];
            const err = validatePdfs(chosen, multiple ? MAX_FILES_PER_GROUP : 1);
            setError(err);
            onFiles(err ? [] : chosen);
            e.target.value = "";
          }}
        />
      </div>
      {canReuse && (
        <button type="button" onClick={() => onFiles(multiple ? reuse! : [reuse![0]])} className="self-start text-body-sm font-semibold text-action hover:underline">
          {reuseLabel ?? "Use the documents from your audit"} ({multiple ? reuse!.length : 1})
        </button>
      )}
      {hint && <span className="text-body-sm text-muted">{hint}</span>}
      {error && <span className="text-body-sm text-danger" role="alert">{error}</span>}
    </div>
  );
}
