import { useCallback, useEffect, useState } from "react";
import { addDismissed, clearDismissed, loadDismissed } from "./dismissedStore.js";

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked: closing still works for this page, it is just not remembered
  }
}

/** The alert ids the farmer closed today for this place, with close and restore actions. */
export default function useDismissed(lat, lon) {
  const [ids, setIds] = useState([]);

  useEffect(() => {
    setIds(lat == null ? [] : loadDismissed(storage(), lat, lon));
  }, [lat, lon]);

  const dismiss = useCallback(
    (id) => {
      setIds((cur) => (cur.includes(id) ? cur : [...cur, id]));
      if (lat != null) addDismissed(storage(), lat, lon, id);
    },
    [lat, lon]
  );

  const restore = useCallback(() => {
    setIds([]);
    if (lat != null) clearDismissed(storage(), lat, lon);
  }, [lat, lon]);

  return { ids, dismiss, restore };
}
