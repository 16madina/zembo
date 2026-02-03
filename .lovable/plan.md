
# Plan : Permettre aux spectateurs de voir l'invité en mode DUO

## Problème Identifié

Actuellement, les **spectateurs** (comme Ryan) ne peuvent pas voir la vidéo de l'invité en mode DUO. L'architecture actuelle est la suivante :

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE ACTUELLE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────┐    WebRTC P2P (vidéo)    ┌───────────┐                   │
│   │ INVITÉ  │ ──────────────────────▶  │ STREAMER  │                   │
│   │ (Guest) │                          │           │                   │
│   └─────────┘                          └─────┬─────┘                   │
│                                              │                         │
│                                              │ LiveKit                 │
│                                              │ (vidéo streamer)        │
│                                              ▼                         │
│                                        ┌───────────┐                   │
│                                        │SPECTATEURS│                   │
│                                        │  (Ryan)   │                   │
│                                        └───────────┘                   │
│                                                                         │
│   ❌ Les spectateurs ne reçoivent PAS la vidéo de l'invité              │
└─────────────────────────────────────────────────────────────────────────┘
```

Le code actuel passe explicitement `null` pour `guestStream` aux spectateurs :
```typescript
guestStream={
  isOnStage && !isStreamer ? guestLocalStream  // Invité voit sa caméra
    : isStreamer ? guestStream                 // Streamer voit l'invité
    : null                                     // ❌ Spectateurs = null
}
```

## Solution Proposée

Il existe deux approches pour résoudre ce problème :

### Option A : Relayer le flux via LiveKit (Recommandée)
L'invité publie également son flux sur LiveKit, et les spectateurs le reçoivent comme un track distant supplémentaire.

### Option B : Implémenter un relais WebRTC multi-peer
Le streamer relaie le flux de l'invité vers tous les spectateurs via des connexions WebRTC supplémentaires.

**Nous recommandons l'Option A** car elle utilise l'infrastructure LiveKit déjà en place et gère automatiquement la scalabilité (un flux est distribué à N spectateurs sans charge supplémentaire sur le streamer).

---

## Détails Techniques - Option A (LiveKit pour l'invité)

### 1. Modifier l'Edge Function `livekit-token`

Ajouter un nouveau paramètre `isStageGuest` pour permettre à l'invité de publier sur LiveKit :

**Fichier : `supabase/functions/livekit-token/index.ts`**

- Ajouter une condition pour `isStageGuest`
- Accorder les permissions de publication (vidéo + audio) à l'invité

### 2. Modifier le hook `useLiveKit`

Permettre à l'invité sur scène de se connecter à LiveKit pour publier son flux :

**Fichier : `src/hooks/useLiveKit.ts`**

- Ajouter un paramètre `isStageGuest` pour distinguer les invités sur scène
- Publier le flux local de l'invité sur LiveKit

### 3. Modifier la page `LiveRoom.tsx`

- L'invité sur scène doit se connecter à LiveKit en mode publication
- Les spectateurs doivent recevoir et afficher le second track distant (celui de l'invité)

**Fichier : `src/pages/LiveRoom.tsx`**

- Passer `isStageGuest: isOnStage` au hook `useLiveKit`
- Gérer plusieurs tracks distants (streamer + invité)

### 4. Modifier le composant `GuestPipView` / `SplitScreenView`

- Les spectateurs doivent recevoir le track LiveKit de l'invité au lieu du WebRTC P2P

**Fichiers : `src/components/live/GuestPipView.tsx` et `src/components/live/SplitScreenView.tsx`**

- Ajouter une prop `guestRemoteTrack` pour les spectateurs
- Attacher ce track LiveKit au lieu du stream WebRTC

---

## Flux Final (après correction)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           NOUVELLE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────┐    WebRTC P2P (optionnel)   ┌───────────┐                │
│   │ INVITÉ  │ ────────────────────────▶   │ STREAMER  │                │
│   │ (Guest) │                             │           │                │
│   └────┬────┘                             └─────┬─────┘                │
│        │                                        │                      │
│        │ LiveKit                                │ LiveKit              │
│        │ (vidéo invité)                         │ (vidéo streamer)     │
│        │                                        │                      │
│        └───────────────┬────────────────────────┘                      │
│                        │                                               │
│                        ▼                                               │
│                  ┌───────────┐                                         │
│                  │SPECTATEURS│                                         │
│                  │  (Ryan)   │                                         │
│                  └───────────┘                                         │
│                                                                        │
│   ✅ Les spectateurs reçoivent DEUX tracks : streamer + invité         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à Modifier

| Fichier | Modification |
|---------|--------------|
| `supabase/functions/livekit-token/index.ts` | Ajouter permissions pour `isStageGuest` |
| `src/hooks/useLiveKit.ts` | Gérer plusieurs remote tracks (Map par participant) |
| `src/pages/LiveRoom.tsx` | Connecter l'invité à LiveKit + passer le track aux spectateurs |
| `src/components/live/GuestPipView.tsx` | Ajouter prop `guestRemoteTrack` pour spectateurs |
| `src/components/live/SplitScreenView.tsx` | Ajouter prop `guestRemoteTrack` pour spectateurs |

---

## Risques et Considérations

1. **Double flux pour l'invité** : L'invité publiera son flux à la fois via WebRTC P2P (pour le chat privé streamer-invité) et LiveKit (pour les spectateurs). Cela consomme plus de bande passante.

2. **Délai de synchronisation** : Il peut y avoir un léger décalage entre le moment où l'invité monte sur scène et le moment où son flux est visible pour les spectateurs (temps de connexion LiveKit).

3. **Gestion des permissions** : L'invité doit obtenir un nouveau token LiveKit avec permissions de publication quand il monte sur scène.
