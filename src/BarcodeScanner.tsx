"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { IconX, IconCamera } from "./icons";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const lastScanned = useRef<string>("");
  const lastScannedTime = useRef<number>(0);

  useEffect(() => {
    let controls: { stop: () => void } | null = null;

    async function startScanner() {
      try {
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        if (devices.length === 0) {
          setError("No camera found on this device.");
          return;
        }

        // Prefer back camera
        const backCamera = devices.find(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
        );
        const deviceId = backCamera?.deviceId ?? devices[devices.length - 1].deviceId;

        setScanning(true);
        controls = await reader.decodeFromVideoDevice(
          deviceId,
          videoRef.current!,
          (result, err) => {
            if (result) {
              const code = result.getText();
              const now = Date.now();
              // Debounce: same code within 2s = ignore
              if (code === lastScanned.current && now - lastScannedTime.current < 2000) return;
              lastScanned.current = code;
              lastScannedTime.current = now;
              onScan(code);
            }
            if (err && !(err instanceof NotFoundException)) {
              // Ignore not-found errors (normal during scanning)
            }
          }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("Permission") || msg.includes("NotAllowed")) {
          setError("Camera permission denied. Please allow camera access.");
        } else {
          setError("Could not start camera: " + msg);
        }
      }
    }

    startScanner();

    return () => {
      if (controls) controls.stop();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <IconCamera className="w-5 h-5 text-indigo-400" />
          <span className="font-semibold text-sm">Scan Barcode</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <IconX className="w-5 h-5" />
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />

        {/* Scanning overlay */}
        {scanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-48">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
              {/* Scan line */}
              <div className="absolute inset-x-2 top-1/2 h-0.5 bg-indigo-400/80 animate-pulse" />
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="bg-white rounded-2xl p-6 mx-4 text-center max-w-sm">
              <IconCamera className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-gray-800 font-semibold mb-1">Camera Error</p>
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-black/80 text-center flex-shrink-0">
        <p className="text-white/60 text-xs">Point camera at barcode to scan automatically</p>
      </div>
    </div>
  );
}
