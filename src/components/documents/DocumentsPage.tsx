import {
  useEffect,
  useCallback,
  useMemo,
  memo,
  useReducer,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Edit,
  Copy,
  ClipboardPaste,
  Cloud,
  Eye,
  Monitor,
  MoreVertical,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import {
  uploadDocument,
  deleteDocument,
  downloadDocument,
  duplicateDocumentToFolder,
  saveDocumentToApp,
  saveDocumentToAppFolder,
} from "../../lib/api/documents";
import type { Database } from "../../lib/database.types";
import { debounce, formatFileSize } from "../../lib/utils";
import { getRelativeTime } from "../../lib/dateFormatter";
import { useToast } from "../../contexts/ToastContext";
import { useDocumentsInfinite } from "../../hooks/useDocumentsInfinite";
import { useFolders } from "../../hooks/useFolders";
import { FolderSidebar } from "./FolderSidebar";
import { BreadcrumbNavigation } from "./BreadcrumbNavigation";
import { CreateFolderModal } from "./CreateFolderModal";
import { FolderPlus } from "lucide-react";
import { lazy, Suspense } from "react";

const editorPromise = () =>
  import("./DocumentEditor").then((module) => ({
    default: module.DocumentEditor,
  }));
const DocumentEditor = lazy(editorPromise);
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { DownloadOptionsModal } from "./DownloadOptionsModal";
import { GoogleDrivePicker } from "./GoogleDrivePicker";
import { ConfirmDialog } from "../common/ConfirmDialog";
import { ErrorBoundary } from "../common/ErrorBoundary";
import { useMediaQuery, useTheme } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";

type Document = Database["public"]["Tables"]["documents"]["Row"];

type UIState = {
  uploading: boolean;
  selectedDocs: Set<string>;
  searchValue: string;
  isEditorOpen: boolean;
  documentsToEdit: Document[];
  showGoogleDrive: boolean;
  uploadProgress: Record<string, number>;
  selectedDocumentPreview: Document | null;
  documentToDelete: string | null;
  showDeleteConfirm: boolean;
  bulkDeleteMode: boolean;
  deletingInProgress: boolean;
  showCreateFolderModal: boolean;
  sidebarOpen: boolean;
  showDownloadOptions: boolean;
  documentToDownload: Document | null;
  copiedDocument: Document | null;
};

type UIAction =
  | { type: "setUploading"; value: boolean }
  | { type: "toggleSelectedDoc"; docId: string }
  | { type: "removeSelectedDoc"; docId: string }
  | { type: "selectAllDocs"; docIds: string[] }
  | { type: "clearSelection" }
  | { type: "setSearchValue"; value: string }
  | { type: "openEditor"; documents: Document[] }
  | { type: "closeEditor" }
  | { type: "setShowGoogleDrive"; value: boolean }
  | { type: "setUploadProgress"; value: Record<string, number> }
  | { type: "setSelectedDocumentPreview"; value: Document | null }
  | { type: "openDeleteConfirm"; documentId: string }
  | { type: "closeDeleteConfirm" }
  | { type: "openBulkDeleteConfirm" }
  | { type: "closeBulkDeleteConfirm" }
  | { type: "setDeletingInProgress"; value: boolean }
  | { type: "setShowCreateFolderModal"; value: boolean }
  | { type: "toggleSidebar" }
  | { type: "openDownloadOptions"; document: Document }
  | { type: "closeDownloadOptions" }
  | { type: "setCopiedDocument"; document: Document | null };

const initialUIState: UIState = {
  uploading: false,
  selectedDocs: new Set<string>(),
  searchValue: "",
  isEditorOpen: false,
  documentsToEdit: [],
  showGoogleDrive: false,
  uploadProgress: {},
  selectedDocumentPreview: null,
  documentToDelete: null,
  showDeleteConfirm: false,
  bulkDeleteMode: false,
  deletingInProgress: false,
  showCreateFolderModal: false,
  sidebarOpen: true,
  showDownloadOptions: false,
  documentToDownload: null,
  copiedDocument: null,
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
    case "selectAllDocs":
      return { ...state, selectedDocs: new Set(action.docIds) };
    case "openBulkDeleteConfirm":
      return { ...state, showDeleteConfirm: true, bulkDeleteMode: true };
    case "closeBulkDeleteConfirm":
      return { ...state, showDeleteConfirm: false, bulkDeleteMode: false };
    case "setDeletingInProgress":
      return { ...state, deletingInProgress: action.value };
    case "setShowCreateFolderModal":
      return { ...state, showCreateFolderModal: action.value };
    case "toggleSidebar":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case "openDownloadOptions":
      return {
        ...state,
        showDownloadOptions: true,
        documentToDownload: action.document,
      };
    case "closeDownloadOptions":
      return {
        ...state,
        showDownloadOptions: false,
        documentToDownload: null,
      };
    case "setCopiedDocument":
      return {
        ...state,
        copiedDocument: action.document,
      };
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
    onCopy: (doc: Document) => void;
  }) => {
    const { doc, selected, onToggle, onPreview, onDownload, onDelete, onCopy } = props;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
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
      if (!isMenuOpen || !menuButtonRef.current) return;
      
      // Calculate position when menu opens (Bug #13: add safety check)
      try {
        const rect = menuButtonRef.current.getBoundingClientRect();
        setMenuPos({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        });
      } catch (error) {
        console.warn('Failed to calculate menu position:', error);
      }
    }, [isMenuOpen]);

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
            <span className="text-sm font-semibold text-gray-900 truncate">
              {doc.original_filename}
            </span>
          </div>
        </div>
        <div className="text-right text-sm font-medium text-gray-700">
          <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">v{doc.version}</span>
        </div>
        <div className="text-right text-sm text-gray-600 font-medium">
          {formatFileSize(doc.file_size)}
        </div>
        <div className="text-right text-sm text-gray-600">
          {getRelativeTime(doc.created_at)}
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

          <div onClick={(e) => e.stopPropagation()}>
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

            {isMenuOpen && createPortal(
              <div
                ref={menuRef}
                role="menu"
                id={menuId}
                className="fixed w-48 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg shadow-lg overflow-hidden z-[9999]"
                style={{
                  top: `${menuPos.top}px`,
                  right: `${menuPos.right}px`,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-xs text-left text-[color:var(--text)] hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onCopy(doc);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    Copy
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-xs text-left text-[color:var(--text)] hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onDelete(doc.id);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Delete
                  </span>
                </button>
              </div>,
              document.body
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
    onCopy: (doc: Document) => void;
  }) => {
    const { doc, selected, onToggle, onPreview, onDownload, onDelete, onCopy } = props;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
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
      if (!isMenuOpen || !menuButtonRef.current) return;
      
      // Calculate position when menu opens (Bug #13: add safety check)
      try {
        const rect = menuButtonRef.current.getBoundingClientRect();
        setMenuPos({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        });
      } catch (error) {
        console.warn('Failed to calculate menu position:', error);
      }
    }, [isMenuOpen]);

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

          <div onClick={(e) => e.stopPropagation()}>
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

            {isMenuOpen && createPortal(
              <div
                ref={menuRef}
                role="menu"
                id={menuId}
                className="fixed w-48 bg-[color:var(--surface)] border border-[color:var(--border)] rounded-lg shadow-lg overflow-hidden z-[9999]"
                style={{
                  top: `${menuPos.top}px`,
                  right: `${menuPos.right}px`,
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-xs text-left text-[color:var(--text)] hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onCopy(doc);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Copy className="w-4 h-4" aria-hidden="true" />
                    Copy
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-xs text-left text-[color:var(--text)] hover:bg-gray-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onDelete(doc.id);
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Delete
                  </span>
                </button>
              </div>,
              document.body
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
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { 
    folders: _folders, 
    breadcrumb, 
    createNewFolder,
    refresh: _refreshFolders,
  } = useFolders(currentFolderId);

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
    folderId: currentFolderId,
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
    // Keep selection scoped to the currently visible result set.
    dispatch({ type: "clearSelection" });
    void reset();
  }, [search, currentFolderId, reset]);

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

    if (selectedDocIds.length > 1) {
      showToast({
        type: "warning",
        title: "Only one document at a time",
        message: "Please select only one document to edit.",
      });
      return;
    }

    const docsToEdit = documents.filter((doc) => ui.selectedDocs.has(doc.id));
    if (docsToEdit.length !== 1) {
      dispatch({ type: "clearSelection" });
      showToast({
        type: "warning",
        title: "Selection changed",
        message: "Please reselect the document you want to edit.",
      });
      return;
    }
    dispatch({ type: "openEditor", documents: docsToEdit });
  }, [
    documents,
    ui.selectedDocs,
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
    let isMounted = true;
    
    const executeSearch = () => {
      if (isMounted) {
        debouncedUpdateSearch(ui.searchValue);
      }
    };
    
    executeSearch();
    
    // Cancel pending updates on unmount (Bug #7)
    return () => {
      isMounted = false;
    };
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

  const pendingTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const uploadAbortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Cleanup pending timeouts and uploads on unmount (Bug #3, #15: memory leak)
  useEffect(() => {
    const pendingTimeouts = pendingTimeoutsRef.current;
    const uploadAbortControllers = uploadAbortControllersRef.current;

    return () => {
      pendingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
      pendingTimeoutsRef.current = [];
      
      // Cancel all in-progress uploads (Bug #15)
      uploadAbortControllers.forEach((controller, fileId) => {
        try {
          controller.abort();
        } catch (error) {
          console.warn(`Failed to abort upload for ${fileId}:`, error);
        }
      });
      uploadAbortControllers.clear();
    };
  }, []);

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

      const result = await uploadDocument(file, user.id, 'local', undefined, currentFolderId);
      clearInterval(progressInterval);

      if (result.success) {
        progressMap[fileId] = 100;
        dispatch({ type: "setUploadProgress", value: { ...progressMap } });
        successCount++;
        const timeoutId = setTimeout(() => {
          dispatch({
            type: "setUploadProgress",
            value: Object.fromEntries(
              Object.entries(progressMap).filter(([k]) => k !== fileId)
            ),
          });
          // Remove from tracked timeouts
          pendingTimeoutsRef.current = pendingTimeoutsRef.current.filter(id => id !== timeoutId);
        }, 500);
        pendingTimeoutsRef.current.push(timeoutId);
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

    // Clear all pending timeouts to prevent state conflicts
    pendingTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    pendingTimeoutsRef.current = [];

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
    
    // Close preview if the deleted document was being previewed
    if (ui.selectedDocumentPreview?.id === documentId) {
      dispatch({ type: "setSelectedDocumentPreview", value: null });
    }

    const removeFromPages = (
      pages: DocumentsPageData[] | undefined
    ): DocumentsPageData[] => {
      if (!pages) return [];
      return pages
        .map((p) => ({
          ...p,
          documents: (p.documents || []).filter((d) => d.id !== documentId),
        }))
        .filter((p) => p.documents.length > 0); // Remove empty pages
    };

    try {
      console.log(`Deleting document: ${documentId}`);
      
      // Delete the document from the API
      const result = await deleteDocument(documentId);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete document");
      }

      console.log(`Document deleted successfully from API: ${documentId}`);

      // Update the cache by filtering out the deleted document from all pages
      await mutateDocuments(
        (currentPages?: DocumentsPageData[]) => {
          if (!currentPages) return undefined;
          const filtered = removeFromPages(currentPages);
          console.log(`Cache updated: removed document ${documentId}`, filtered);
          return filtered;
        },
        {
          revalidate: false,
          populateCache: true,
        }
      );

      console.log(`Mutation completed, cache updated`);

      showToast({
        type: "success",
        title: "Document deleted",
        message: "The document has been removed.",
      });
    } catch (err) {
      console.error('Delete failed, revalidating cache:', err);
      
      // On error, revalidate to ensure the UI is in sync with server
      await mutateDocuments();
      
      showToast({
        type: "error",
        title: "Failed to delete document",
        message:
          err instanceof Error ? err.message : "Failed to delete document",
      });
    }
  };

  const handleBulkDelete = async () => {
    const documentIds = Array.from(ui.selectedDocs);
    if (documentIds.length === 0) return;

    // Set loading state (Bug #18)
    dispatch({ type: "setDeletingInProgress", value: true });

    // Don't dispatch until after mutation succeeds (Bug #2: race condition)
    
    // Close preview if it's one of the deleted documents
    if (ui.selectedDocumentPreview && documentIds.includes(ui.selectedDocumentPreview.id)) {
      dispatch({ type: "setSelectedDocumentPreview", value: null });
    }

    const removeFromPages = (
      pages: DocumentsPageData[] | undefined
    ): DocumentsPageData[] => {
      if (!pages) return [];
      return pages
        .map((p) => ({
          ...p,
          documents: (p.documents || []).filter((d) => !documentIds.includes(d.id)),
        }))
        .filter((p) => p.documents.length > 0); // Remove empty pages
    };

    try {
      console.log(`Deleting ${documentIds.length} documents:`, documentIds);
      
      // Delete all documents in parallel
      const deletePromises = documentIds.map(id => deleteDocument(id));
      const results = await Promise.all(deletePromises);
      
      // Check if all deletes were successful
      const allSuccessful = results.every(r => r.success);
      if (!allSuccessful) {
        const failedCount = results.filter(r => !r.success).length;
        throw new Error(`Failed to delete ${failedCount} document(s)`);
      }

      console.log(`All documents deleted successfully from API`);

      // Update the cache by filtering out the deleted documents from all pages
      await mutateDocuments(
        (currentPages?: DocumentsPageData[]) => {
          if (!currentPages) return undefined;
          const filtered = removeFromPages(currentPages);
          console.log(`Cache updated: removed ${documentIds.length} documents`, filtered);
          return filtered;
        },
        {
          revalidate: false,
          populateCache: true,
        }
      );

      console.log(`Mutation completed, cache updated`);

      // Dispatch state updates only after mutation succeeds
      dispatch({ type: "closeBulkDeleteConfirm" });
      dispatch({ type: "clearSelection" });

      showToast({
        type: "success",
        title: "Documents deleted",
        message: `${documentIds.length} document${documentIds.length > 1 ? "s" : ""} have been removed.`,
      });
    } catch (err) {
      console.error('Bulk delete failed, revalidating cache:', err);
      
      // On error, revalidate to ensure the UI is in sync with server
      await mutateDocuments();
      
      // Still close dialog on error
      dispatch({ type: "closeBulkDeleteConfirm" });
      
      showToast({
        type: "error",
        title: "Failed to delete documents",
        message:
          err instanceof Error ? err.message : "Failed to delete documents",
      });
    } finally {
      dispatch({ type: "setDeletingInProgress", value: false });
    }
  };

  const handleDownload = useCallback(
    (document: Document) => {
      dispatch({ type: "openDownloadOptions", document });
    },
    [dispatch]
  );

  const handleDownloadLocal = useCallback(
    async (document: Document) => {
      const result = await downloadDocument(document.storage_path);
      if (result.success && result.url) {
        const ok = (await import('../../lib/safeRedirect')).safeOpenUrl(result.url, '_blank');
        if (!ok) {
          showToast({ type: 'error', title: 'Blocked Link', message: 'This download link is not allowed.' });
        } else {
          showToast({ type: 'success', title: 'Download started', message: `${document.original_filename} is downloading.` });
        }
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

  const handleSaveToApp = useCallback(
    async (document: Document) => {
      const result = await saveDocumentToApp(document.id, user?.id || '');
      if (result.success) {
        await refreshDocuments();
        showToast({
          type: 'success',
          title: 'Saved to App',
          message: `${document.original_filename} has been saved to your app library.`,
        });
      } else if (result.error) {
        showToast({
          type: 'error',
          title: 'Failed to save to app',
          message: result.error,
        });
      }
    },
    [showToast, user?.id, refreshDocuments]
  );

  const handleSaveToAppFolder = useCallback(
    async (document: Document, folderId: string | null) => {
      const result = await saveDocumentToAppFolder(document.id, user?.id || '', folderId);
      if (result.success) {
        await refreshDocuments();
        showToast({
          type: 'success',
          title: 'Saved to App Folder',
          message: `${document.original_filename} has been saved to your application folder.`,
        });
      } else if (result.error) {
        showToast({
          type: 'error',
          title: 'Failed to save to app folder',
          message: result.error,
        });
      }
    },
    [showToast, user?.id, refreshDocuments]
  );

  const handleCopyDocument = useCallback(
    (document: Document) => {
      dispatch({ type: "setCopiedDocument", document });
      showToast({
        type: "success",
        title: "Copied",
        message: `${document.original_filename} is ready to paste.`,
      });
    },
    [showToast]
  );

  const handlePasteDocument = useCallback(async () => {
    if (!ui.copiedDocument || !user?.id) return;

    const result = await duplicateDocumentToFolder(
      ui.copiedDocument.id,
      user.id,
      currentFolderId
    );

    if (result.success) {
      await refreshDocuments();
      showToast({
        type: "success",
        title: "Pasted",
        message: `${ui.copiedDocument.original_filename} was copied to ${
          currentFolderId ? "this folder" : "root documents"
        }.`,
      });
    } else if (result.error) {
      showToast({
        type: "error",
        title: "Paste failed",
        message: result.error,
      });
    }
  }, [currentFolderId, refreshDocuments, showToast, ui.copiedDocument, user?.id]);

  const handleCreateFolder = useCallback(
    async (name: string, description?: string) => {
      try {
        await createNewFolder(name, description);
        dispatch({ type: "setShowCreateFolderModal", value: false });
        showToast({
          type: "success",
          title: "Folder created",
          message: `"${name}" folder has been created successfully.`,
        });
        // Refresh documents to show in the list
        mutateDocuments?.();
      } catch (error) {
        showToast({
          type: "error",
          title: "Failed to create folder",
          message: error instanceof Error ? error.message : "Failed to create folder",
        });
        throw error;
      }
    },
    [createNewFolder, showToast, mutateDocuments]
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
    overscan: 15, // Bug #21: Increased overscan to handle measurement delays during lazy loading
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

  // Callback to refresh sidebar when a folder is created
  const handleFolderCreated = useCallback(() => {
    // This callback will be called when folderCreateCounter changes
    // FolderSidebar will use it to trigger a refresh
  }, []);

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
    <div className="flex flex-col md:flex-row h-full">
      {/* Folder Sidebar - Desktop only, collapsible */}
      {!isMobile && (
        <div
          className={`hidden md:flex md:flex-col transition-all duration-300 border-r border-gray-200 bg-gray-50 overflow-hidden ${
            ui.sidebarOpen ? "w-64" : "w-0"
          }`}
        >
          {ui.sidebarOpen && (
            <FolderSidebar
              currentFolderId={currentFolderId}
              onFolderSelect={setCurrentFolderId}
              onCreateFolder={() =>
                dispatch({ type: "setShowCreateFolderModal", value: true })
              }
              onFolderDeleted={() => {
                // Refresh documents list after folder is deleted
                mutateDocuments?.();
              }}
              onFolderCreated={handleFolderCreated}
            />
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sidebar Toggle + Breadcrumb Navigation */}
        <div className="flex items-center gap-2 px-4 sm:px-6 md:px-8 py-3 md:py-4 border-b border-gray-200 bg-white">
          {/* Sidebar Toggle Button (Desktop only) */}
          {!isMobile && (
            <button
              onClick={() => dispatch({ type: "toggleSidebar" })}
              className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              title={ui.sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-label={ui.sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {ui.sidebarOpen ? (
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-600" />
              )}
            </button>
          )}

          {/* Breadcrumb Navigation */}
          {(currentFolderId || !isMobile) && (
            <div className="flex-1 min-w-0">
              <BreadcrumbNavigation
                path={breadcrumb}
                onNavigate={setCurrentFolderId}
                currentFolderId={currentFolderId}
              />
            </div>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div id="main-content" className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-80">
            <div className="relative">
              <input
                id="documents-search"
                value={ui.searchValue}
                onChange={(e) =>
                  dispatch({ type: "setSearchValue", value: e.target.value })
                }
                placeholder="Search documents..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-gray-400"
                aria-label="Search documents"
              />
              {ui.searchValue && (
                <button
                  onClick={() => dispatch({ type: "setSearchValue", value: "" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
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

          <button
            type="button"
            onClick={() =>
              dispatch({ type: "setShowCreateFolderModal", value: true })
            }
            className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 focus-ring"
            title="Create a new folder"
            aria-label="Create a new folder"
          >
            <FolderPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">New Folder</span>
          </button>

          {ui.copiedDocument && (
            <button
              type="button"
              onClick={handlePasteDocument}
              className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 focus-ring"
              title={`Paste ${ui.copiedDocument.original_filename} here`}
              aria-label={`Paste ${ui.copiedDocument.original_filename} here`}
            >
              <ClipboardPaste className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Paste Here</span>
            </button>
          )}

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

          {documents.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (selectedDocIds.length === documents.length) {
                    // Deselect all if all are already selected (Bug #11)
                    dispatch({ type: "clearSelection" });
                  } else {
                    // Select all
                    dispatch({ type: "selectAllDocs", docIds: documents.map(d => d.id) });
                  }
                }}
                className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 focus-ring"
                title={selectedDocIds.length === documents.length ? "Deselect all documents" : "Select all documents"}
                aria-label={selectedDocIds.length === documents.length ? "Deselect all documents" : "Select all documents"}
              >
                <input
                  type="checkbox"
                  checked={selectedDocIds.length === documents.length && documents.length > 0}
                  readOnly
                  className="w-4 h-4"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">{selectedDocIds.length === documents.length ? "Deselect All" : "Select All"}</span>
              </button>

              {selectedDocIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => dispatch({ type: "clearSelection" })}
                  className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2 focus-ring"
                  title="Deselect all documents"
                  aria-label="Deselect all documents"
                >
                  <span className="hidden sm:inline">Deselect All</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {ui.copiedDocument && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-emerald-900">
            <span className="font-semibold">Copied:</span>{" "}
            <span>{ui.copiedDocument.original_filename}</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePasteDocument}
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              <ClipboardPaste className="w-4 h-4" />
              Paste Here
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "setCopiedDocument", document: null })}
              className="btn-outline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {selectedDocIds.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-600 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="text-blue-900 font-medium text-sm">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-bold">{selectedDocIds.length}</span>
            <span className="ml-2">document{selectedDocIds.length > 1 ? "s" : ""} selected</span>
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
                Edit
              </>
            )}
          </button>

          <button
            onClick={() => dispatch({ type: "openBulkDeleteConfirm" })}
            disabled={ui.deletingInProgress}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 rounded-lg font-medium text-sm transition focus-ring disabled:opacity-50 disabled:cursor-not-allowed`}
            title={ui.deletingInProgress ? "Deleting..." : "Delete all selected documents"}
            aria-label="Delete all selected documents"
          >
            <span className={ui.deletingInProgress ? "inline-block animate-spin" : ""}>
              <Trash2 className="w-4 h-4" />
            </span>
            <span className="hidden sm:inline">{ui.deletingInProgress ? "Deleting..." : "Delete Selected"}</span>
            <span className="sm:hidden">{ui.deletingInProgress ? "..." : "Delete"}</span>
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
        <div className="card-base overflow-visible">
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
                  onCopy={handleCopyDocument}
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
              <div className="grid grid-cols-[44px_1fr_110px_110px_130px_140px] items-center px-4 py-3 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">
                <div />
                <div>Filename</div>
                <div className="text-right">Version</div>
                <div className="text-right">Size</div>
                <div className="text-right">Created</div>
                <div className="text-right">Actions</div>
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
                        onCopy={handleCopyDocument}
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
        <ErrorBoundary
          fallback={
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
              <div className="card-base card-p-md max-w-md w-full text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600 mb-3" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Editor Error</h3>
                <p className="text-gray-600 mb-6 text-xs">
                  The document editor encountered an error. Please close this dialog and try again.
                </p>
                <button
                  onClick={() => {
                    dispatch({ type: "closeEditor" });
                    dispatch({ type: "clearSelection" });
                  }}
                  className="px-4 py-2 bg-primary-800 text-white rounded-lg font-medium hover:bg-primary-900 transition"
                >
                  Close Editor
                </button>
              </div>
            </div>
          }
        >
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
              layout="single"
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
        </ErrorBoundary>
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
          if (ui.bulkDeleteMode) {
            dispatch({ type: "closeBulkDeleteConfirm" });
          } else {
            dispatch({ type: "closeDeleteConfirm" });
          }
        }}
        onConfirm={ui.bulkDeleteMode ? handleBulkDelete : handleDelete}
        title={ui.bulkDeleteMode ? "Delete Multiple Documents" : "Delete Document"}
        message={
          ui.bulkDeleteMode
            ? `Are you sure you want to delete ${ui.selectedDocs.size} document${ui.selectedDocs.size > 1 ? "s" : ""}? This action cannot be undone.`
            : "Are you sure you want to delete this document? This action cannot be undone."
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={ui.showCreateFolderModal}
        onClose={() =>
          dispatch({ type: "setShowCreateFolderModal", value: false })
        }
        onCreate={handleCreateFolder}
      />

      {/* Download Options Modal */}
      <DownloadOptionsModal
        isOpen={ui.showDownloadOptions}
        fileName={ui.documentToDownload?.original_filename || 'Document'}
        onClose={() => dispatch({ type: "closeDownloadOptions" })}
        onDownloadLocal={async () => {
          if (ui.documentToDownload) {
            await handleDownloadLocal(ui.documentToDownload);
          }
        }}
        onSaveToApp={async () => {
          if (ui.documentToDownload) {
            await handleSaveToApp(ui.documentToDownload);
          }
        }}
        onSaveToAppFolder={async (folderId) => {
          if (ui.documentToDownload) {
            await handleSaveToAppFolder(ui.documentToDownload, folderId);
          }
        }}
      />
          </div>
        </div>
      </div>
    </div>
  );
};
