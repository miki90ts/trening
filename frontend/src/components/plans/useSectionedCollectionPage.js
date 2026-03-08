import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export const CARD_PAGE_SIZE = 20;
export const TABLE_PAGE_OPTIONS = [10, 20, 25, 50];

export function normalizeListResponse(result, fallbackPageSize) {
  if (Array.isArray(result)) {
    return {
      data: result,
      pagination: {
        page: 1,
        pageSize: fallbackPageSize,
        total: result.length,
        totalPages: 1,
      },
    };
  }

  return {
    data: result?.data || [],
    pagination: {
      page: result?.pagination?.page || 1,
      pageSize: result?.pagination?.pageSize || fallbackPageSize,
      total: result?.pagination?.total || 0,
      totalPages: result?.pagination?.totalPages || 1,
    },
  };
}

export function getPageNumbers(page, totalPages) {
  const pages = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
      pages.push(currentPage);
    }
    return pages;
  }

  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, start + maxVisible - 1);

  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  for (let currentPage = start; currentPage <= end; currentPage += 1) {
    pages.push(currentPage);
  }

  return pages;
}

function parseFiltersFromSearch(search, defaults, isSessionSection) {
  const params = new URLSearchParams(search);
  const sort = params.get("sort") || defaults.sort;
  const order = params.get("order") === "asc" ? "asc" : defaults.order;

  return {
    q: params.get("q") || "",
    status: isSessionSection ? params.get("status") || "" : "",
    from: isSessionSection ? params.get("from") || "" : "",
    to: isSessionSection ? params.get("to") || "" : "",
    sort,
    order,
  };
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseUiStateFromSearch(search) {
  const params = new URLSearchParams(search);
  const parsedPageSize = parsePositiveInt(params.get("pageSize"), 10);

  return {
    viewMode: params.get("view") === "table" ? "table" : "card",
    tablePage: parsePositiveInt(params.get("page"), 1),
    tablePageSize: TABLE_PAGE_OPTIONS.includes(parsedPageSize)
      ? parsedPageSize
      : 10,
  };
}

function buildSearchFromFilters(
  filters,
  defaults,
  isSessionSection,
  viewMode,
  tablePage,
  tablePageSize,
) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (isSessionSection && filters.status) {
    params.set("status", filters.status);
  }

  if (isSessionSection && filters.from) {
    params.set("from", filters.from);
  }

  if (isSessionSection && filters.to) {
    params.set("to", filters.to);
  }

  if (filters.sort && filters.sort !== defaults.sort) {
    params.set("sort", filters.sort);
  }

  if (filters.order && filters.order !== defaults.order) {
    params.set("order", filters.order);
  }

  if (viewMode === "table") {
    params.set("view", "table");
    if (tablePage > 1) {
      params.set("page", String(tablePage));
    }
    if (tablePageSize !== 10) {
      params.set("pageSize", String(tablePageSize));
    }
  }

  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : "";
}

export function useSectionedCollectionPage({
  sectionItems,
  defaultSectionKey,
  isAdmin,
  fetchPlans,
  fetchSessions,
  loadUsersRequest,
  defaultSortBySection,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const loadMoreRef = useRef(null);

  const activeSection = useMemo(() => {
    const matchedItem = sectionItems.find(
      (item) => item.path === location.pathname,
    );
    return matchedItem?.key || defaultSectionKey;
  }, [defaultSectionKey, location.pathname, sectionItems]);

  const sectionConfig = useMemo(
    () => sectionItems.find((item) => item.key === activeSection),
    [activeSection, sectionItems],
  );

  const visibleSections = useMemo(
    () =>
      isAdmin
        ? sectionItems
        : sectionItems.filter((item) => item.key !== "sent"),
    [isAdmin, sectionItems],
  );

  const activeSortDefaults =
    defaultSortBySection[activeSection] ||
    defaultSortBySection[defaultSectionKey];

  const [viewMode, setViewModeState] = useState("card");
  const [queryInput, setQueryInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [sortInput, setSortInput] = useState(activeSortDefaults.sort);
  const [orderInput, setOrderInput] = useState(activeSortDefaults.order);
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    from: "",
    to: "",
    sort: activeSortDefaults.sort,
    order: activeSortDefaults.order,
  });
  const [listState, setListState] = useState({
    items: [],
    pagination: {
      page: 1,
      pageSize: CARD_PAGE_SIZE,
      total: 0,
      totalPages: 1,
    },
    loading: true,
    loadingMore: false,
  });
  const [tablePage, setTablePageState] = useState(1);
  const [tablePageSize, setTablePageSizeState] = useState(10);
  const [cardPage, setCardPage] = useState(1);
  const [scheduleId, setScheduleId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [scheduleUserId, setScheduleUserId] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const updateSearchState = useCallback(
    ({
      nextFilters = filters,
      nextViewMode = viewMode,
      nextTablePage = tablePage,
      nextTablePageSize = tablePageSize,
      replace = true,
    }) => {
      const defaults =
        defaultSortBySection[activeSection] ||
        defaultSortBySection[defaultSectionKey];

      navigate(
        {
          pathname: location.pathname,
          search: buildSearchFromFilters(
            nextFilters,
            defaults,
            activeSection !== "plans",
            nextViewMode,
            nextTablePage,
            nextTablePageSize,
          ),
        },
        { replace },
      );
    },
    [
      activeSection,
      defaultSectionKey,
      defaultSortBySection,
      filters,
      location.pathname,
      navigate,
      tablePage,
      tablePageSize,
      viewMode,
    ],
  );

  const fetchSectionData = useCallback(
    async ({ page, pageSize }) => {
      const params = {
        page,
        pageSize,
        sort: filters.sort,
        order: filters.order,
      };

      if (filters.q) {
        params.q = filters.q;
      }

      if (activeSection !== "plans") {
        params.scope = activeSection === "sent" ? "sent" : "sessions";
        if (filters.status) {
          params.status = filters.status;
        }
        if (filters.from) {
          params.from = filters.from;
        }
        if (filters.to) {
          params.to = filters.to;
        }
        return fetchSessions(params);
      }

      return fetchPlans(params);
    },
    [activeSection, fetchPlans, fetchSessions, filters],
  );

  const loadUsers = useCallback(async () => {
    if (!isAdmin || usersLoading || users.length > 0 || !loadUsersRequest) {
      return;
    }

    setUsersLoading(true);
    try {
      const result = await loadUsersRequest();
      setUsers(result || []);
    } catch (err) {
      toast.error("Greška pri učitavanju korisnika");
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin, loadUsersRequest, users.length, usersLoading]);

  const loadCardPages = useCallback(
    async (pagesToLoad = 1) => {
      setListState((prev) => ({
        ...prev,
        loading: true,
        loadingMore: false,
      }));

      try {
        let mergedItems = [];
        let latestPagination = {
          page: 1,
          pageSize: CARD_PAGE_SIZE,
          total: 0,
          totalPages: 1,
        };

        for (let page = 1; page <= pagesToLoad; page += 1) {
          const response = normalizeListResponse(
            await fetchSectionData({ page, pageSize: CARD_PAGE_SIZE }),
            CARD_PAGE_SIZE,
          );

          mergedItems = [...mergedItems, ...response.data];
          latestPagination = response.pagination;

          if (page >= latestPagination.totalPages) {
            break;
          }
        }

        const resolvedPage = Math.min(
          pagesToLoad,
          latestPagination.totalPages || 1,
        );
        setCardPage(resolvedPage);
        setListState({
          items: mergedItems,
          pagination: latestPagination,
          loading: false,
          loadingMore: false,
        });
      } catch (err) {
        toast.error("Greška pri učitavanju liste");
        setCardPage(1);
        setListState({
          items: [],
          pagination: {
            page: 1,
            pageSize: CARD_PAGE_SIZE,
            total: 0,
            totalPages: 1,
          },
          loading: false,
          loadingMore: false,
        });
      }
    },
    [fetchSectionData],
  );

  const loadTableData = useCallback(
    async (page, pageSize) => {
      setListState((prev) => ({
        ...prev,
        loading: true,
        loadingMore: false,
      }));

      try {
        const response = normalizeListResponse(
          await fetchSectionData({ page, pageSize }),
          pageSize,
        );

        setListState({
          items: response.data,
          pagination: response.pagination,
          loading: false,
          loadingMore: false,
        });
      } catch (err) {
        toast.error("Greška pri učitavanju liste");
        setListState({
          items: [],
          pagination: {
            page: 1,
            pageSize,
            total: 0,
            totalPages: 1,
          },
          loading: false,
          loadingMore: false,
        });
      }
    },
    [fetchSectionData],
  );

  const refreshCurrentView = useCallback(async () => {
    if (viewMode === "card") {
      await loadCardPages(cardPage);
      return;
    }

    await loadTableData(tablePage, tablePageSize);
  }, [
    cardPage,
    loadCardPages,
    loadTableData,
    tablePage,
    tablePageSize,
    viewMode,
  ]);

  const loadMoreCards = useCallback(async () => {
    if (
      viewMode !== "card" ||
      listState.loading ||
      listState.loadingMore ||
      cardPage >= listState.pagination.totalPages
    ) {
      return;
    }

    const nextPage = cardPage + 1;
    setListState((prev) => ({ ...prev, loadingMore: true }));

    try {
      const response = normalizeListResponse(
        await fetchSectionData({ page: nextPage, pageSize: CARD_PAGE_SIZE }),
        CARD_PAGE_SIZE,
      );

      setCardPage(nextPage);
      setListState((prev) => ({
        ...prev,
        items: [...prev.items, ...response.data],
        pagination: response.pagination,
        loadingMore: false,
      }));
    } catch (err) {
      toast.error("Greška pri učitavanju dodatnih stavki");
      setListState((prev) => ({ ...prev, loadingMore: false }));
    }
  }, [cardPage, fetchSectionData, listState, viewMode]);

  useEffect(() => {
    const defaults =
      defaultSortBySection[activeSection] ||
      defaultSortBySection[defaultSectionKey];
    const nextFilters = parseFiltersFromSearch(
      location.search,
      defaults,
      activeSection !== "plans",
    );
    const nextUiState = parseUiStateFromSearch(location.search);

    setQueryInput(nextFilters.q);
    setStatusInput(nextFilters.status);
    setFromInput(nextFilters.from);
    setToInput(nextFilters.to);
    setSortInput(nextFilters.sort);
    setOrderInput(nextFilters.order);
    setFilters(nextFilters);
    setViewModeState(nextUiState.viewMode);
    setTablePageState(nextUiState.tablePage);
    setTablePageSizeState(nextUiState.tablePageSize);
    setScheduleId(null);
    setScheduleUserId("");
  }, [activeSection, defaultSectionKey, defaultSortBySection, location.search]);

  useEffect(() => {
    if (viewMode === "card") {
      setCardPage(1);
      loadCardPages(1);
      return;
    }
  }, [activeSection, filters, loadCardPages, viewMode]);

  useEffect(() => {
    if (viewMode !== "table") {
      return;
    }

    loadTableData(tablePage, tablePageSize);
  }, [
    activeSection,
    filters,
    loadTableData,
    tablePage,
    tablePageSize,
    viewMode,
  ]);

  useEffect(() => {
    if (isAdmin && scheduleId) {
      loadUsers();
    }
  }, [isAdmin, loadUsers, scheduleId]);

  useEffect(() => {
    if (
      viewMode !== "card" ||
      listState.loading ||
      listState.loadingMore ||
      cardPage >= listState.pagination.totalPages
    ) {
      return undefined;
    }

    const node = loadMoreRef.current;
    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreCards();
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [
    cardPage,
    listState.loading,
    listState.loadingMore,
    listState.pagination.totalPages,
    loadMoreCards,
    viewMode,
  ]);

  const handleApplyFilters = useCallback(() => {
    const nextFilters = {
      q: queryInput.trim(),
      status: statusInput,
      from: fromInput,
      to: toInput,
      sort: sortInput,
      order: orderInput,
    };
    updateSearchState({
      nextFilters,
      nextTablePage: 1,
    });
  }, [
    fromInput,
    orderInput,
    queryInput,
    sortInput,
    statusInput,
    toInput,
    updateSearchState,
  ]);

  const handleResetFilters = useCallback(() => {
    const defaults =
      defaultSortBySection[activeSection] ||
      defaultSortBySection[defaultSectionKey];
    setQueryInput("");
    setStatusInput("");
    setFromInput("");
    setToInput("");
    setSortInput(defaults.sort);
    setOrderInput(defaults.order);
    updateSearchState({
      nextFilters: {
        q: "",
        status: "",
        from: "",
        to: "",
        sort: defaults.sort,
        order: defaults.order,
      },
      nextTablePage: 1,
    });
  }, [
    activeSection,
    defaultSectionKey,
    defaultSortBySection,
    updateSearchState,
  ]);

  const setViewMode = useCallback(
    (nextViewMode) => {
      const resolvedViewMode =
        typeof nextViewMode === "function"
          ? nextViewMode(viewMode)
          : nextViewMode;
      setViewModeState(resolvedViewMode);
      updateSearchState({
        nextViewMode: resolvedViewMode,
        nextTablePage: 1,
      });
    },
    [updateSearchState, viewMode],
  );

  const setTablePage = useCallback(
    (nextPage) => {
      const resolvedPage =
        typeof nextPage === "function" ? nextPage(tablePage) : nextPage;
      setTablePageState(resolvedPage);
      updateSearchState({ nextTablePage: resolvedPage });
    },
    [tablePage, updateSearchState],
  );

  const setTablePageSize = useCallback(
    (nextPageSize) => {
      const resolvedPageSize =
        typeof nextPageSize === "function"
          ? nextPageSize(tablePageSize)
          : nextPageSize;
      setTablePageSizeState(resolvedPageSize);
      setTablePageState(1);
      updateSearchState({
        nextTablePage: 1,
        nextTablePageSize: resolvedPageSize,
      });
    },
    [tablePageSize, updateSearchState],
  );

  return {
    activeSection,
    sectionConfig,
    visibleSections,
    viewMode,
    setViewMode,
    queryInput,
    setQueryInput,
    statusInput,
    setStatusInput,
    fromInput,
    setFromInput,
    toInput,
    setToInput,
    sortInput,
    setSortInput,
    orderInput,
    setOrderInput,
    filters,
    listState,
    tablePage,
    setTablePage,
    tablePageSize,
    setTablePageSize,
    cardPage,
    scheduleId,
    setScheduleId,
    scheduleDate,
    setScheduleDate,
    scheduleUserId,
    setScheduleUserId,
    users,
    usersLoading,
    loadMoreRef,
    loadCardPages,
    loadTableData,
    refreshCurrentView,
    loadMoreCards,
    handleApplyFilters,
    handleResetFilters,
    isSessionSection: activeSection !== "plans",
    hasMoreCards: cardPage < listState.pagination.totalPages,
    hasFiltersApplied: Boolean(
      filters.q || filters.status || filters.from || filters.to,
    ),
    selectedScheduledItem:
      activeSection === "plans"
        ? listState.items.find((item) => item.id === scheduleId)
        : null,
  };
}
