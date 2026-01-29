import {
  useEffect,
  useCallback,
  useMemo,
  memo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Edit,
  Grid2X2,
  Grid3X3,
  Cloud,
  Eye,
  Monitor,
  MoreVertical,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  uploadDocument,
  deleteDocument,
  downloadDocument,
} from "../../lib/api/documents";
import type { Database } from "../../lib/database.types";
import { debounce, formatFileSize } from "../../lib/utils";
import { useToast } from "../../contexts/ToastContext";
import { useDocumentsInfinite } from "../../hooks/useDocumentsInfinite";
import { lazy, Suspense } from "react";

const editorPromise = () =>
  import("./DocumentEditor").then((module) => ({
    default: module.DocumentEditor,
  }));
const DocumentEditor = lazy(editorPromise);
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { GoogleDrivePicker } from "./GoogleDrivePicker";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { useMediaQuery, useTheme } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";

type Document = Database["public"]["Tables"]["documents"]["Row"];

type UIState = {
  uploading: boolean;
  selectedDocs: Set<string>;
  searchValue: string;
  editorLayout: "single" | "2x2" | "3x3";
  isEditorOpen: boolean;
  documentsToEdit: Document[];
  showGoogleDrive: boolean;
  uploadProgress: Record<string, number>;
  selectedDocumentPreview: Document | null;
  documentToDelete: string | null;
  showDeleteConfirm: boolean;
};

type UIAction =
  | { type: "setUploading"; value: boolean }
  | { type: "toggleSelectedDoc"; docId: string }
  | { type: "removeSelectedDoc"; docId: string }
  | { type: "clearSelection" }
  | { type: "setSearchValue"; value: string }
  | { type: "setEditorLayout"; value: UIState["editorLayout"] }
  | { type: "openEditor"; documents: Document[] }
  | { type: "closeEditor" }
  | { type: "setShowGoogleDrive"; value: boolean }
  | { type: "setUploadProgress"; value: Record<string, number> }
  | { type: "setSelectedDocumentPreview"; value: Document | null }
  | { type: "openDeleteConfirm"; documentId: string }
  | { type: "closeDeleteConfirm" };

const initialUIState: UIState = {
  uploading: false,
  selectedDocs: new Set<string>(),
  searchValue: "",
  editorLayout: "single",
  isEditorOpen: false,
  documentsToEdit: [],
  showGoogleDrive: false,
  uploadProgress: {},
  selectedDocumentPreview: null,
  documentToDelete: null,
  showDeleteConfirm: false,
};

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "setUploading":
      return { ...state, uploading: action.value };
    case "toggleSelectedDoc": {
      const next = new Set(state.selectedDocs);
      if (next.has(action.docId)) next.delete(action.docId);
      else next.add(action.docId);
      return { ...state, selectedDocs: next };
    }
    case "removeSelectedDoc": {
      if (!state.selectedDocs.has(action.docId)) return state;
      const next = new Set(state.selectedDocs);
      next.delete(action.docId);
      return { ...state, selectedDocs: next };
    }
    case "clearSelection":
      return { ...state, selectedDocs: new Set<string>() };
    case "setSearchValue":
      return { ...state, searchValue: action.value };
    case "setEditorLayout":
      return { ...state, editorLayout: action.value };
    case "openEditor":
      return {
        ...state,
        isEditorOpen: true,
        documentsToEdit: action.documents,
      };
    case "closeEditor":
      return { ...state, isEditorOpen: false, documentsToEdit: [] };
    case "setShowGoogleDrive":
      return { ...state, showGoogleDrive: action.value };
    case "setUploadProgress":
      return { ...state, uploadProgress: action.value };
    case "setSelectedDocumentPreview":
      return { ...state, selectedDocumentPreview: action.value };
    case "openDeleteConfirm":
      return {
        ...state,
        documentToDelete: action.documentId,
        showDeleteConfirm: true,
      };
    case "closeDeleteConfirm":
      return { ...state, documentToDelete: null, showDeleteConfirm: false };
    default:
      return state;
  }
}

const getUploadLabel = (id: string) => {
  const lastDash = id.lastIndexOf("-");
  if (lastDash <= 0) return id;
  const maybeTs = id.slice(lastDash + 1);
  if (/^\d{5,}$/.test(maybeTs)) {
    return id.slice(0, lastDash);
  }
  return id;
};

const DocumentRow = memo(
  (props: {
    doc: Document;
    selected: boolean;
    onToggle: (id: string) => void;
    onPreview: (doc: Document) => void;
    onDownload: (doc: Document) => void;
    onDelete: (id: string) => void;
  }) => {
    const { doc, selected, onToggle, onPreview, onDownload, onDelete } = props;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = `document-row-menu-${doc.id}`;

    const handleRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onPreview(doc);
      }
      if (e.key === " ") {
        e.preventDefault();
        onToggle(doc.id);
      }
    };

    useEffect(() => {
      if (!isMenuOpen) return;

      const onPointerDown = (e: MouseEvent) => {
        const target = e.target as Node | null;
        if (!target) return;
        if (menuButtonRef.current?.contains(target)) return;
        if (menuRef.current?.contains(target)) return;
        setIsMenuOpen(false);
      };

      document.addEventListener("mousedown", onPointerDown);
      return () => document.removeEventListener("mousedown", onPointerDown);
    }, [isMenuOpen]);

    useEffect(() => {
      if (!isMenuOpen) return;

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsMenuOpen(false);
          menuButtonRef.current?.focus();
        }
      };

      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [isMenuOpen]);

    return (
      <div
        className={`grid grid-cols-[44px_1fr_110px_110px_130px_140px] items-center px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
          selected ? "bg-blue-50" : "bg-white"
        } focus-ring`}
        onClick={() => onPreview(doc)}
        onKeyDown={handleRowKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Preview document ${doc.original_filename}`}
      >
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(doc.id)}
            className="w-4 h-4"
            onClick={(e) => e.stopPropagation()}
            aria-label={`${selected ? "Deselect" : "Select"} ${
              doc.original_filename
            }`}
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-xs font-medium text-gray-900 truncate">
              {doc.original_filename}
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-gray-600">{doc.version}</div>
        <div className="text-right text-xs text-gray-600">
          {formatFileSize(doc.file_size)}
        </div>
        <div className="text-right text-xs text-gray-600">
          {new Date(doc.created_at).toLocaleDateString()}
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(doc);
            }}
            className="btn-icon-sm bg-primary-100 text-primary-700 hover:bg-primary-200"
            title="Preview document"
            aria-label="Preview document"
          >
            <Eye className="w-4 h-4" />
          </button>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              ref={menuButtonRef}
              type="button"
              className="btn-icon-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-controls={isMenuOpen ? menuId : undefined}
              onClick={() => setIsMenuOpen((v) => !v)}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                ref={menuRef}
                role="menu"
                id={menuId}
                className="absolute right-0 mt-2 w-44 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg shadow-lg overflow-hidden z-20"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-xs text-left text-[color:var(--text)] hover:bg-gray-50"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDownload(doc);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Download
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-xs text-left text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete(doc.id);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Delete
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

const MobileDocumentCard = memo(
  (props: {
    doc: Document;
    selected: boolean;
    onToggle: (id: string) => void;
    onPreview: (doc: Document) => void;
    onDownload: (doc: Document) => void;
    onDelete: (id: string) => void;
  }) => {
    const { doc, selected, onToggle, onPreview, onDownload, onDelete } = props;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = `mobile-document-menu-${doc.id}`;

    const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onPreview(doc);
      }
      if (e.key === " ") {
        e.preventDefault();
        onToggle(doc.id);
      }
    };

    useEffect(() => {
      if (!isMenuOpen) return;

      const onPointerDown = (e: MouseEvent) => {
        const target = e.target as Node | null;
        if (!target) return;
        if (menuButtonRef.current?.contains(target)) return;
        if (menuRef.current?.contains(target)) return;
        setIsMenuOpen(false);
      };

      document.addEventListener("mousedown", onPointerDown);
      return () => document.removeEventListener("mousedown", onPointerDown);
    }, [isMenuOpen]);

    useEffect(() => {
      if (!isMenuOpen) return;

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsMenuOpen(false);
          menuButtonRef.current?.focus();
        }
      };

      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [isMenuOpen]);

    return (
      <div
        className={`p-4 ${selected ? "bg-blue-50" : "bg-white"} focus-ring`}
        role="button"
        tabIndex={0}
        aria-label={`Preview document ${doc.original_filename}`}
        onClick={() => onPreview(doc)}
        onKeyDown={handleCardKeyDown}
      >
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(doc.id)}
            className="mt-1 w-4 h-4"
            onClick={(e) => e.stopPropagation()}
            aria-label={`${selected ? "Deselect" : "Select"} ${
              doc.original_filename
            }`}
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div className="text-xs font-medium text-gray-900 truncate">
                {doc.original_filename}
              </div>
            </div>

            <div className="mt-1 text-xs text-gray-600">
              <span className="font-medium text-gray-700">v{doc.version}</span>
              <span className="mx-2 text-gray-300">|</span>
              <span>{formatFileSize(doc.file_size)}</span>
              <span className="mx-2 text-gray-300">|</span>
              <span>{new Date(doc.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(doc);
            }}
            className="btn-icon-sm bg-primary-100 text-primary-700 hover:bg-primary-200"
            title="Preview document"
            aria-label="Preview document"
          >
            <Eye className="w-4 h-4" />
          </button>

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              ref={menuButtonRef}
              type="button"
              className="btn-icon-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-controls={isMenuOpen ? menuId : undefined}
              onClick={() => setIsMenuOpen((v) => !v)}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                ref={menuRef}
                role="menu"
                id={menuId}
                className="absolute right-0 mt-2 w-44 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg shadow-lg overflow-hidden z-20"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-xs text-left text-[color:var(--text)] hover:bg-gray-50"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDownload(doc);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Download className="w-4 h-4" aria-hidden="true" />
                    Download
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-xs text-left text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onDelete(doc.id);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Delete
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

export const DocumentsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [ui, dispatch] = useReducer(uiReducer, initialUIState);
  const [search, setSearch] = useReducer((_: string, next: string) => next, "");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  type DocumentsPageData = {
    documents: Document[];
    cursorCreatedAt: string | null;
    hasNextPage: boolean;
  };

  const PAGE_SIZE = 100;

  const docsSWR = useDocumentsInfinite({
    userId: user?.id,
    pageSize: PAGE_SIZE,
    search,
  });

  const {
    documents,
    error: documentsError,
    isLoadingInitial: initialLoading,
    isLoadingMore: loadingMore,
    hasMore,
    loadMore,
    mutate: mutateDocuments,
    reset,
  } = docsSWR;

  useEffect(() => {
    if (documentsError) {
      showToast({
        type: "error",
        title: "Failed to load documents",
        message:
          documentsError instanceof Error
            ? documentsError.message
            : String(documentsError),
      });
    }
  }, [documentsError, showToast]);

  useEffect(() => {
    // When the debounced server-side search changes, reset paging and clear selection.
    dispatch({ type: "clearSelection" });
    void reset();
  }, [search, reset]);

  const selectedDocIds = useMemo(
    () => Array.from(ui.selectedDocs),
    [ui.selectedDocs]
  );

  const openEditor = useCallback(() => {
    if (isMobile) {
      showToast({
        type: "info",
        title: "Desktop Only Feature",
        message:
          "The resume editor is optimized for desktop use. Please use a desktop computer for the best experience.",
        durationMs: 5000,
      });
      return;
    }

    // Avoid leaving focus on background elements when the editor (or its internals) uses portals
    // that may apply aria-hidden to #root.
    (document.activeElement as HTMLElement | null)?.blur?.();

    if (selectedDocIds.length === 0) {
      showToast({
        type: "info",
        title: "No documents selected",
        message: "Please select at least one document to edit.",
      });
      return;
    }

    const maxDocs =
      ui.editorLayout === "single" ? 1 : ui.editorLayout === "2x2" ? 4 : 9;
    if (selectedDocIds.length > maxDocs) {
      showToast({
        type: "warning",
        title: "Too many documents selected",
        message: `Maximum ${maxDocs} documents can be edited in ${ui.editorLayout} layout.`,
      });
      return;
    }

    const docsToEdit = documents.filter((doc) => ui.selectedDocs.has(doc.id));
    dispatch({ type: "openEditor", documents: docsToEdit });
  }, [
    documents,
    ui.selectedDocs,
    ui.editorLayout,
    isMobile,
    selectedDocIds.length,
    showToast,
  ]);

  const debouncedUpdateSearch = useMemo(
    () =>
      debounce((next: unknown) => {
        setSearch(String(next ?? ""));
      }, 250),
    []
  );

  useEffect(() => {
    debouncedUpdateSearch(ui.searchValue);
  }, [ui.searchValue, debouncedUpdateSearch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingTarget =
        tag === "input" ||
        tag === "textarea" ||
        Boolean(
          target && "isContentEditable" in target && target.isContentEditable
        );

      if (e.key === "Escape") {
        if (ui.selectedDocumentPreview) {
          dispatch({ type: "setSelectedDocumentPreview", value: null });
        }
      }

      if (!isTypingTarget && e.key === "/") {
        e.preventDefault();
        const el = document.getElementById(
          "documents-search"
        ) as HTMLInputElement | null;
        el?.focus();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.getElementById(
          "documents-search"
        ) as HTMLInputElement | null;
        el?.focus();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (!isTypingTarget && selectedDocIds.length > 0) {
          e.preventDefault();
          openEditor();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openEditor, selectedDocIds.length, ui.selectedDocumentPreview]);

  const refreshDocuments = useCallback(async () => {
    dispatch({ type: "clearSelection" });
    await reset();
  }, [reset]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const validFiles: File[] = [];
    let hasErrors = false;

    // Validate files before uploading
    for (const file of Array.from(files)) {
      const isValidType =
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword" ||
        file.type === "application/pdf";

      if (!isValidType) {
        showToast({
          type: "error",
          title: "Invalid file type",
          message: `${file.name}: Only .docx, .doc, and .pdf files are supported`,
        });
        hasErrors = true;
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        showToast({
          type: "error",
          title: "File too large",
          message: `${file.name}: ${(file.size / 1024 / 1024).toFixed(
            2
          )}MB exceeds 5MB limit`,
        });
        hasErrors = true;
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      if (hasErrors) {
        showToast({
          type: "warning",
          title: "No valid files",
          message: "Please check file sizes and types",
        });
      }
      return;
    }

    dispatch({ type: "setUploading", value: true });
    const progressMap: Record<string, number> = {};

    // Upload valid files with progress tracking
    let successCount = 0;
    for (const file of validFiles) {
      const fileId = `${file.name}-${Date.now()}`;
      progressMap[fileId] = 0;
      dispatch({ type: "setUploadProgress", value: { ...progressMap } });

      // Simulate progress (since uploadDocument doesn't support progress callbacks)
      const progressInterval = setInterval(() => {
        progressMap[fileId] = Math.min(progressMap[fileId] + 10, 90);
        dispatch({ type: "setUploadProgress", value: { ...progressMap } });
      }, 200);

      const result = await uploadDocument(file, user.id);
      clearInterval(progressInterval);

      if (result.success) {
        progressMap[fileId] = 100;
        dispatch({ type: "setUploadProgress", value: { ...progressMap } });
        successCount++;
        setTimeout(() => {
          dispatch({
            type: "setUploadProgress",
            value: Object.fromEntries(
              Object.entries(progressMap).filter(([k]) => k !== fileId)
            ),
          });
        }, 500);
      } else if (result.error) {
        delete progressMap[fileId];
        dispatch({ type: "setUploadProgress", value: { ...progressMap } });
        showToast({
          type: "error",
          title: "Upload failed",
          message: `${file.name}: ${result.error}`,
        });
      }
    }

    await refreshDocuments();
    dispatch({ type: "setUploading", value: false });
    dispatch({ type: "setUploadProgress", value: {} });

    if (successCount > 0) {
      showToast({
        type: "success",
        title: "Upload complete",
        message: `${successCount} document${
          successCount !== 1 ? "s" : ""
        } uploaded successfully`,
      });
    }
  };

  const handleDeleteClick = useCallback((documentId: string) => {
    dispatch({ type: "openDeleteConfirm", documentId });
  }, []);

  const handleDelete = async () => {
    if (!ui.documentToDelete) return;
    const documentId = ui.documentToDelete;

    dispatch({ type: "closeDeleteConfirm" });
    dispatch({ type: "removeSelectedDoc", docId: documentId });

    const removeFromPages = (
      pages: DocumentsPageData[] | undefined
    ): DocumentsPageData[] => {
      if (!pages) return [];
      return pages.map((p) => ({
        ...p,
        documents: (p.documents || []).filter((d) => d.id !== documentId),
      }));
    };

    try {
      await mutateDocuments(
        async (currentPages?: DocumentsPageData[]) => {
          const result = await deleteDocument(documentId);
          if (!result.success) {
            throw new Error(result.error || "Failed to delete document");
          }
          return removeFromPages(currentPages);
        },
        {
          optimisticData: (currentData: any) => removeFromPages(currentData),
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        }
      );

      showToast({
        type: "success",
        title: "Document deleted",
        message: "The document has been removed.",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Failed to delete document",
        message:
          err instanceof Error ? err.message : "Failed to delete document",
      });
    }
  };

  const handleDownload = useCallback(
    async (document: Document) => {
      const result = await downloadDocument(document.storage_path);
      if (result.success && result.url) {
        window.open(result.url, "_blank");
      } else if (result.error) {
        showToast({
          type: "error",
          title: "Failed to download document",
          message: result.error,
        });
      }
    },
    [showToast]
  );

  const toggleDocSelection = useCallback((docId: string) => {
    dispatch({ type: "toggleSelectedDoc", docId });
  }, []);

  const handlePreview = useCallback((doc: Document) => {
    dispatch({ type: "setSelectedDocumentPreview", value: doc });
  }, []);

  const handleRowDelete = useCallback(
    (documentId: string) => {
      handleDeleteClick(documentId);
    },
    [handleDeleteClick]
  );

  const rowVirtualizer = useVirtualizer({
    count: documents.length,
    getScrollElement: () => document.getElementById("main-content"),
    estimateSize: () => 76,
    overscan: 10,
    measureElement: typeof window !== 'undefined' && navigator.userAgent.indexOf('jsdom') === -1 ? element => element?.getBoundingClientRect().height : undefined,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (isMobile) return;
    if (!hasMore || loadingMore) return;
    const last = virtualRows[virtualRows.length - 1];
    if (!last) return;
    if (initialLoading) return;
    if (last.index >= documents.length - 10) {
      void loadMore();
    }
  }, [
    virtualRows,
    documents.length,
    initialLoading,
    loadMore,
    isMobile,
    hasMore,
    loadingMore,
  ]);

  useEffect(() => {
    if (!isMobile) return;

    const el = document.getElementById("main-content");
    if (!el) return;

    const onScroll = () => {
      if (initialLoading) return;
      if (!hasMore || loadingMore) return;
      const thresholdPx = 500;
      const nearBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - thresholdPx;
      if (nearBottom) {
        void loadMore();
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isMobile, initialLoading, loadMore, hasMore, loadingMore]);

  if (initialLoading) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xs sm:text-xs font-medium text-gray-900">
            Resume Editor
          </h1>
          <p className="text-gray-600 mt-2 text-xs sm:text-base">
            Upload, edit, and manage your resumes
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-80">
            <input
              id="documents-search"
              value={ui.searchValue}
              onChange={(e) =>
                dispatch({ type: "setSearchValue", value: e.target.value })
              }
              placeholder="Search documents..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-accent-600"
              aria-label="Search documents"
            />
          </div>

          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "setEditorLayout", value: "single" })
              }
              className={`p-2 rounded transition ${
                ui.editorLayout === "single"
                  ? "bg-primary-800 text-white"
                  : "text-gray-600"
              } focus-ring`}
              title="Single document"
              aria-label="Single document layout"
              aria-pressed={ui.editorLayout === "single"}
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "setEditorLayout", value: "2x2" })
              }
              className={`p-2 rounded transition ${
                ui.editorLayout === "2x2"
                  ? "bg-primary-800 text-white"
                  : "text-gray-600"
              } focus-ring`}
              title="2x2 layout"
              aria-label="2x2 layout"
              aria-pressed={ui.editorLayout === "2x2"}
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "setEditorLayout", value: "3x3" })
              }
              className={`p-2 rounded transition ${
                ui.editorLayout === "3x3"
                  ? "bg-primary-800 text-white"
                  : "text-gray-600"
              } focus-ring`}
              title="3x3 layout"
              aria-label="3x3 layout"
              aria-pressed={ui.editorLayout === "3x3"}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              dispatch({ type: "setShowGoogleDrive", value: true })
            }
            className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 focus-ring"
            title="Import from Google Drive"
            aria-label="Import from Google Drive"
          >
            <Cloud className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Google Drive</span>
          </button>

          <label className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            {ui.uploading ? "Uploading..." : "Upload"}
            <input
              type="file"
              multiple
              accept=".doc,.docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={ui.uploading}
            />
          </label>
        </div>
      </div>

      {selectedDocIds.length > 0 && (
        <div className="mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-blue-900 text-xs sm:text-base">
            {selectedDocIds.length} document
            {selectedDocIds.length > 1 ? "s" : ""} selected
          </div>
          <button
            onClick={openEditor}
            onMouseEnter={() => {
              editorPromise();
            }}
            // OPTIONAL: ALSO DOWNLOAD ON FOCUS (for keyboard users)
            onFocus={() => {
              editorPromise();
            }}
            disabled={isMobile}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 ${
              isMobile
                ? "btn-secondary cursor-not-allowed opacity-60"
                : "btn-primary"
            }`}
            title={
              isMobile
                ? "Resume editor is only available on desktop"
                : "Open in editor"
            }
          >
            {isMobile ? (
              <>
                <Monitor className="w-4 h-4" />
                Desktop Only
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                Open in Editor
              </>
            )}
          </button>
        </div>
      )}

      {/* Upload progress */}
      {Object.keys(ui.uploadProgress).length > 0 && (
        <div className="mb-6 card-base p-4">
          <div className="text-xs font-medium text-gray-900 mb-3">
            Uploading
          </div>
          <div className="space-y-2">
            {Object.entries(ui.uploadProgress).map(([id, pct]) => (
              <div key={id} className="flex items-center gap-3">
                <div
                  className="text-xs text-gray-600 w-48 truncate"
                  title={getUploadLabel(id)}
                >
                  {getUploadLabel(id)}
                </div>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-primary-700 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 w-10 text-right">
                  {pct}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(ui.selectedDocumentPreview)}
        document={ui.selectedDocumentPreview}
        onClose={() =>
          dispatch({ type: "setSelectedDocumentPreview", value: null })
        }
      />

      {documents.length === 0 ? (
        <div className="card-base card-p-md text-center">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xs sm:text-xs font-medium text-gray-900 mb-2">
            No documents yet
          </h3>
          <p className="text-gray-600 mb-6 text-xs sm:text-base">
            Upload your first resume to get started
          </p>
          <div className="flex flex-col items-center gap-2">
            <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              Upload Document
              <input
                type="file"
                multiple
                accept=".doc,.docx,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {isMobile && (
              <p className="text-xs text-gray-500 text-center mt-1">
                <Monitor className="inline w-3 h-3 mr-1" />
                Editor available on desktop
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="card-base overflow-hidden">
          {isMobile ? (
            <div className="divide-y divide-gray-100">
              {documents.map((doc) => (
                <MobileDocumentCard
                  key={doc.id}
                  doc={doc}
                  selected={ui.selectedDocs.has(doc.id)}
                  onToggle={toggleDocSelection}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onDelete={handleRowDelete}
                />
              ))}
              {(loadingMore || hasMore) && (
                <div className="px-4 py-3 text-xs text-gray-500">
                  {loadingMore
                    ? "Loading more documents..."
                    : "Scroll to load more"}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
                <div className="grid grid-cols-[44px_1fr_110px_110px_130px_140px] items-center px-4 py-3 text-xs font-semibold text-gray-600">
                  <div />
                  <div>Filename</div>
                  <div className="text-right">Version</div>
                  <div className="text-right">Size</div>
                  <div className="text-right">Created</div>
                  <div className="text-right">Actions</div>
                </div>
              </div>

              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {virtualRows.map((vr) => {
                  const doc = documents[vr.index];
                  if (!doc) return null;

                  return (
                    <div
                      key={doc.id}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${vr.start}px)`,
                      }}
                    >
                      <DocumentRow
                        doc={doc}
                        selected={ui.selectedDocs.has(doc.id)}
                        onToggle={toggleDocSelection}
                        onPreview={handlePreview}
                        onDownload={handleDownload}
                        onDelete={handleRowDelete}
                      />
                    </div>
                  );
                })}
              </div>

              {(loadingMore || hasMore) && (
                <div className="px-4 py-3 text-xs text-gray-500 border-t border-gray-100">
                  {loadingMore
                    ? "Loading more documents..."
                    : "Scroll to load more"}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Document Editor Modal */}

      {ui.isEditorOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                Loading Editor...
              </div>
            </div>
          }
        >
          <DocumentEditor
            documents={ui.documentsToEdit}
            layout={ui.editorLayout}
            onClose={() => {
              dispatch({ type: "closeEditor" });
              dispatch({ type: "clearSelection" });
              refreshDocuments();
            }}
            onSave={async () => {
              dispatch({ type: "closeEditor" });
              dispatch({ type: "clearSelection" });
              await refreshDocuments();
            }}
          />
        </Suspense>
      )}

      {/* Google Drive Picker Modal */}
      {ui.showGoogleDrive && (
        <GoogleDrivePicker
          onFilesImported={(docs) => {
            dispatch({ type: "setShowGoogleDrive", value: false });
            refreshDocuments();
            showToast({
              type: "success",
              title: "Documents imported",
              message: `${docs.length} document(s) imported from Google Drive successfully.`,
            });
          }}
          onClose={() => dispatch({ type: "setShowGoogleDrive", value: false })}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={ui.showDeleteConfirm}
        onClose={() => {
          dispatch({ type: "closeDeleteConfirm" });
        }}
        onConfirm={handleDelete}
        title="Delete Document"
        message="Are you sure you want to delete this document? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
};
