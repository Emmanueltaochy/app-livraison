"use client";

import { Capacitor, CapacitorHttp, registerPlugin } from "@capacitor/core";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Plugin natif : position en arrière-plan (Android affiche une notification permanente pendant le partage).
type Position = { latitude: number; longitude: number };
const BackgroundGeolocation = registerPlugin<{
  addWatcher(
    options: { backgroundMessage?: string; backgroundTitle?: string; requestPermissions?: boolean; stale?: boolean; distanceFilter?: number },
    rappel: (position?: Position, erreur?: { code?: string }) => void,
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}>("BackgroundGeolocation");

const ENVOI_MIN_MS = 15_000; // au plus une position toutes les 15 s
const RAFRAICHISSEMENT_MS = 20_000; // liste des courses rechargée toutes les 20 s quand en ligne

async function envoyerPosition(p: Position) {
  const donnees = { lat: p.latitude, lng: p.longitude };
  // Dans l'app, requête native : Android ralentit les requêtes de la WebView après 5 min en arrière-plan.
  if (Capacitor.isNativePlatform()) {
    await CapacitorHttp.post({ url: `${location.origin}/api/transporteur/position`, headers: { "content-type": "application/json" }, data: donnees }).catch(() => {});
    return;
  }
  await fetch("/api/transporteur/position", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(donnees),
  }).catch(() => {});
}

// Notifications push (app native uniquement) : enregistre le jeton du téléphone auprès du serveur.
async function activerNotifications(ouvrir: (lien: string) => void) {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return;
  if (Capacitor.getPlatform() === "android") {
    await PushNotifications.createChannel({ id: "courses", name: "Nouvelles courses", importance: 5, sound: "default", vibration: true });
  }
  await PushNotifications.addListener("registration", ({ value }) => {
    fetch("/api/appareils", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jeton: value, plateforme: Capacitor.getPlatform() }),
    }).catch(() => {});
  });
  await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    const lien = notification.data?.lien;
    if (typeof lien === "string") ouvrir(new URL(lien).pathname);
  });
  await PushNotifications.register();
}

// Partage la position du transporteur quand il est en ligne ou en course, et garde la liste à jour.
export function SuiviTransporteur({ enLigne, enCourse }: { enLigne: boolean; enCourse: boolean }) {
  const router = useRouter();
  const [partage, setPartage] = useState<"inactif" | "actif" | "refuse">("inactif");
  const dernierEnvoi = useRef(0);
  const actif = enLigne || enCourse;

  useEffect(() => {
    if (Capacitor.isNativePlatform()) activerNotifications((chemin) => router.push(chemin)).catch(() => {});
  }, [router]);

  useEffect(() => {
    if (!actif) return;
    const recevoir = (p: Position) => {
      setPartage("actif");
      // La carte du chauffeur suit la même position (évite un 2e suivi GPS).
      window.dispatchEvent(new CustomEvent("fretpei:position", { detail: { lat: p.latitude, lng: p.longitude } }));
      if (Date.now() - dernierEnvoi.current < ENVOI_MIN_MS) return;
      dernierEnvoi.current = Date.now();
      envoyerPosition(p);
    };

    if (Capacitor.isNativePlatform()) {
      let id: string | undefined;
      let arrete = false;
      BackgroundGeolocation.addWatcher(
        {
          backgroundTitle: "Position partagée",
          backgroundMessage: enCourse ? "Le client suit votre arrivée." : "Vous recevez les courses proches de vous.",
          requestPermissions: true,
          stale: false,
          distanceFilter: 30,
        },
        (position, erreur) => {
          if (erreur?.code === "NOT_AUTHORIZED") {
            setPartage("refuse");
            if (window.confirm("La localisation est nécessaire pour recevoir des courses. Ouvrir les réglages ?")) BackgroundGeolocation.openSettings();
          } else if (position) recevoir(position);
        },
      ).then((watcherId) => {
        if (arrete) BackgroundGeolocation.removeWatcher({ id: watcherId });
        else id = watcherId;
      });
      return () => {
        arrete = true;
        if (id) BackgroundGeolocation.removeWatcher({ id });
      };
    }

    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => recevoir({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => setPartage("refuse"),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [actif, enCourse]);

  useEffect(() => {
    if (!enLigne || enCourse) return;
    const minuteur = setInterval(() => router.refresh(), RAFRAICHISSEMENT_MS);
    return () => clearInterval(minuteur);
  }, [enLigne, enCourse, router]);

  if (!actif) return null;
  return (
    <p className={`flex items-center gap-2 text-petit ${partage === "refuse" ? "text-erreur" : "text-gris-300"}`}>
      <MapPin className="size-4" />
      {partage === "refuse"
        ? "Localisation refusée : autorisez-la pour recevoir les courses proches."
        : partage === "actif"
          ? enCourse
            ? "Position partagée avec le client pendant la course."
            : "Position partagée : vous recevez les courses proches."
          : "Recherche de votre position…"}
    </p>
  );
}
