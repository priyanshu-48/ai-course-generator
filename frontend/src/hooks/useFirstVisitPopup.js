import { useEffect, useState } from "react";

export default function useFirstVisitPopup(key = "demoPopupSeen") {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(key);
    if (!seen) {
      setShowPopup(true);
      localStorage.setItem(key, "true");
    }
  }, [key]);

  const closePopup = () => setShowPopup(false);

  return { showPopup, closePopup };
}
