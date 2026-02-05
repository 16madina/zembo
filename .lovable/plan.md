
# Plan : Corriger le problème de visibilité de l'invité en mode DUO

## Problème identifié

En analysant le code, j'ai trouvé la cause racine du problème :

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                            BUG PRINCIPAL                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   useLiveKit est appelé avec des paramètres STATIQUES :                 │
│                                                                         │
│   useLiveKit({                                                          │
│     isStageGuest: false,     ← TOUJOURS false, jamais mis à jour        │
│     publishStream: streamer ? stream : null  ← L'invité n'a PAS de      │
│                                                  stream à publier        │
│   })                                                                    │
│                                                                         │
│   CONSÉQUENCE :                                                         │
│   - L'invité ne publie JAMAIS son flux sur LiveKit                      │
│   - Le streamer et les spectateurs ne voient rien                       │
│   - Côté invité: "Connexion au stream..." en boucle                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

Le hook `useLiveKit` possède un mécanisme de détection de changement de rôle (lignes 795-838), mais comme `isStageGuest` est toujours `false`, ce mécanisme n'est jamais déclenché.

---

## Solution proposée

Modifier les paramètres passés à `useLiveKit` dans `LiveRoom.tsx` pour qu'ils reflètent l'état réel de l'utilisateur (invité sur scène ou non) et lui fournir son flux local à publier.

---

## Détails techniques

### Fichier : `src/pages/LiveRoom.tsx`

**Changement 1** - Passer `isStageGuest` dynamiquement :

```typescript
// AVANT (ligne 195)
isStageGuest: false,

// APRÈS
isStageGuest: effectiveIsStageGuest,
```

**Problème** : `effectiveIsStageGuest` est défini APRÈS l'appel à `useLiveKit` car il dépend de `isOnStage` qui vient de `useLiveStage`.

**Solution** : Réorganiser le code ou utiliser une variable d'état qui est mise à jour quand l'utilisateur monte sur scène.

---

**Changement 2** - Passer `publishStream` pour l'invité aussi :

```typescript
// AVANT (ligne 197)
publishStream: (accessIsStreamer || (live?.streamer_id === user?.id)) ? stream : null,

// APRÈS - Inclure l'invité sur scène
publishStream: (isStreamer || effectiveIsStageGuest) ? stream : null,
```

---

### Réorganisation nécessaire

Puisque `effectiveIsStageGuest` dépend de `isOnStage` (de `useLiveStage`), et que `useLiveStage` nécessite `isStreamer`, nous devons :

1. **Extraire la logique de détection de rôle** avant les hooks
2. **Utiliser un état pour `isStageGuestState`** qui est synchronisé avec `isOnStage`
3. **Déclencher une reconnexion LiveKit** quand l'utilisateur devient invité sur scène

---

### Modification du flux

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          NOUVEAU FLUX                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   1. Utilisateur accepté sur scène → isOnStage = true                   │
│                                                                         │
│   2. Modal "Activer caméra" → initCamera() → stream disponible          │
│                                                                         │
│   3. useEffect détecte: isOnStage && stream && !liveKitConnected        │
│      → Appelle connectLiveKit() avec isStageGuest: true                 │
│                                                                         │
│   4. useLiveKit publie le stream de l'invité sur LiveKit                │
│                                                                         │
│   5. Le mécanisme "late publication" (lignes 868-907) gère le cas       │
│      où le stream arrive après la connexion                             │
│                                                                         │
│   6. Streamer et spectateurs reçoivent le track via remoteVideoTracks   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `src/pages/LiveRoom.tsx` | Passer `isStageGuest` et `publishStream` dynamiques à `useLiveKit` |

---

## Changements détaillés

### 1. Ajouter un état pour suivre le rôle d'invité sur scène

```typescript
// Après la définition de isStreamer (ligne 118)
const [isStageGuestState, setIsStageGuestState] = useState(false);
```

### 2. Synchroniser cet état avec isOnStage

```typescript
// Après useLiveStage (vers ligne 246)
useEffect(() => {
  const shouldBeStageGuest = isOnStage && !isStreamer;
  if (shouldBeStageGuest !== isStageGuestState) {
    console.log("[LiveRoom] Stage guest state changed:", shouldBeStageGuest);
    setIsStageGuestState(shouldBeStageGuest);
  }
}, [isOnStage, isStreamer, isStageGuestState]);
```

### 3. Passer les bons paramètres à useLiveKit

```typescript
useLiveKit({
  roomName,
  isStreamer: accessIsStreamer || (live?.streamer_id === user?.id),
  isStageGuest: isStageGuestState,  // ← Dynamique maintenant
  publishStream: (isStreamer || isStageGuestState) ? stream : null,  // ← Inclut l'invité
});
```

### 4. Déclencher la connexion de l'invité

L'effet existant (lignes 309-325) devrait maintenant fonctionner correctement car le hook recevra le bon rôle et le bon stream.

---

## Risques et considérations

1. **Race condition** : Le stream de l'invité peut arriver après la connexion LiveKit. Le mécanisme de "late publication" (lignes 868-907) gère ce cas.

2. **Reconnexion automatique** : Quand `isStageGuestState` passe de `false` à `true`, le mécanisme de détection de changement de rôle (lignes 795-838) déconnectera et reconnectera automatiquement.

3. **Délai de synchronisation** : Les spectateurs peuvent mettre 1-3 secondes à voir l'invité (temps de connexion + publication + synchronisation des tracks).
