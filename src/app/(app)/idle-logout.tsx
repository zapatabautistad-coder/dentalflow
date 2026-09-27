"use client";

import { useEffect, useRef, useState } from "react";
import { logout } from "./actions";

const STORAGE_KEY = "dentalflow-last-activity";
const WARNING_AFTER_MS = 14 * 60 * 1000;
const LOGOUT_AFTER_MS = 15 * 60 * 1000;
const SCROLL_THROTTLE_MS = 5000;

export function IdleLogout() {
  const [isOpen, setIsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const isOpenRef = useRef(false);
  const lastActivityRef = useRef(0);
  const lastScrollRef = useRef(0);

  const updateLastActivity = (nextTimestamp = Date.now()) => {
    lastActivityRef.current = nextTimestamp;
    window.localStorage.setItem(STORAGE_KEY, String(nextTimestamp));
    if (isOpenRef.current) {
      setIsOpen(false);
      setTimeLeft(60);
    }
    isOpenRef.current = false;
  };

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const readLastActivity = () => {
      const storedValue = Number(window.localStorage.getItem(STORAGE_KEY));
      const parsedValue = Number.isFinite(storedValue) && storedValue > 0 ? storedValue : Date.now();
      lastActivityRef.current = parsedValue;
      window.localStorage.setItem(STORAGE_KEY, String(parsedValue));
    };

    const handleActivity = (event?: Event) => {
      if (event?.type === "scroll") {
        const now = Date.now();
        if (now - lastScrollRef.current < SCROLL_THROTTLE_MS) {
          return;
        }
        lastScrollRef.current = now;
      }

      updateLastActivity();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) {
        return;
      }

      const receivedValue = Number(event.newValue);
      if (!Number.isFinite(receivedValue) || receivedValue <= 0) {
        return;
      }

      lastActivityRef.current = receivedValue;
      if (isOpenRef.current) {
        setIsOpen(false);
        setTimeLeft(60);
        isOpenRef.current = false;
      }
    };

    const handleTick = () => {
      const now = Date.now();
      const inactivity = now - lastActivityRef.current;

      if (inactivity >= LOGOUT_AFTER_MS) {
        void logout();
        return;
      }

      if (inactivity >= WARNING_AFTER_MS) {
        const remaining = Math.max(0, Math.ceil((LOGOUT_AFTER_MS - inactivity) / 1000));
        setTimeLeft(remaining);

        if (!isOpenRef.current) {
          setIsOpen(true);
          isOpenRef.current = true;
        }

        return;
      }

      if (isOpenRef.current) {
        setIsOpen(false);
        setTimeLeft(60);
        isOpenRef.current = false;
      }
    };

    readLastActivity();
    updateLastActivity(lastActivityRef.current);

    const activityEvents = ["mousemove", "keydown", "pointerdown", "touchstart", "scroll"] as const;
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        updateLastActivity();
      }
    });

    const timer = window.setInterval(handleTick, 1000);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.removeEventListener("storage", handleStorage);
      window.clearInterval(timer);
    };
  }, []);

  const handleStayConnected = () => {
    updateLastActivity();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#154360]/45 px-4 backdrop-blur-[2px]">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="idle-logout-title"
            className="w-full max-w-md rounded-[28px] border border-[#8FD3C4]/70 bg-white/90 p-6 shadow-[0_28px_60px_-30px_rgba(21,67,96,0.7)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#154360]/70">Sesión</p>
                <h2 id="idle-logout-title" className="mt-2 text-[15px] font-black leading-6 text-[#154360]">
                  Tu sesión se cerrará en {timeLeft} segundos por inactividad
                </h2>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8FD3C4]/20 text-xl font-black text-[#154360]">
                ⏱
              </div>
            </div>

            <p className="mt-4 text-[14px] leading-6 text-slate-600">
              Has estado inactivo durante demasiado tiempo. Si quieres seguir usando DentalFlow, mantén la sesión activa.
            </p>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleStayConnected}
                className="glass-button px-5 py-2.5 text-[14px] font-semibold"
              >
                Seguir conectado
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
