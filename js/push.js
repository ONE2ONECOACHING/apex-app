// APEX APP — Push Notifications (client-side)

function _urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

const PushNotifications = {
  async init(profileId) {
    // Vérifications préalables
    if (!('serviceWorker' in navigator)) return;
    if (!('PushManager' in window))      return;
    if (!APP_CONFIG.VAPID_PUBLIC_KEY || APP_CONFIG.VAPID_PUBLIC_KEY.startsWith('REMPLACER')) return;
    if (Notification.permission === 'denied') return;

    try {
      const reg = await navigator.serviceWorker.ready;

      // Récupérer ou créer l'abonnement
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: _urlBase64ToUint8Array(APP_CONFIG.VAPID_PUBLIC_KEY)
        });
      }

      // Sauvegarder en base
      const json = sub.toJSON();
      await db.savePushSubscription(profileId, {
        endpoint: json.endpoint,
        keys: json.keys
      });
    } catch (e) {
      console.warn('[Push] Abonnement impossible :', e.message);
    }
  }
};
