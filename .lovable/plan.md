

# Plan de Rebranding Terminologique

## Objectif
Remplacer les termes "dating", "match" et "Speed Dating" dans toute l'application pour repositionner Zembo en tant qu'application "Social Gaming" plutôt que "Dating App" afin de contourner le rejet Apple (Directive 4.3b).

## Changements de Terminologie

| Ancien terme | Nouveau terme |
|--------------|---------------|
| Speed Dating | Flash Connect |
| match / Match | vibe / Vibe |
| dating | connexion / connect |

---

## Section Technique - Fichiers à Modifier

### 1. Traductions (LanguageContext.tsx)

**Clés de traduction à modifier :**

#### Français
- `speedDatingDesc`: "Rencontres rapides en vidéo" → "Connexions rapides en vidéo"
- `itsAMatch`: "C'est un match !" → "C'est un vibe !"
- `youAndMatch`: "Vous et {name} vous êtes mutuellement likés" → "Vous et {name} avez vibé ensemble"
- `pushDescription`: "Recevoir des alertes pour les matchs, messages et activités" → "Recevoir des alertes pour les vibes, messages et activités"
- `visibleToMatches`: "Visible par mes matchs uniquement" → "Visible par mes vibes uniquement"
- `matchesOnly`: "Mes matchs uniquement" → "Mes vibes uniquement"
- `newMatches`: "Nouveaux matchs" → "Nouveaux vibes"
- `filterMatches`: "Filtrer les matchs" → "Filtrer les vibes"
- `filterMatchesDesc`: "Les profils déjà matchés ne réapparaîtront pas" → "Les profils déjà en vibe ne réapparaîtront pas"
- `matchesCreated`: "Matchs créés" → "Vibes créés"
- `priorityMatches`: "Matchs prioritaires" → "Vibes prioritaires"
- `queueMatched`: "Queue - Matchés" → "Queue - En vibe"
- `classification18Desc1`: Remplacer "application de rencontres" par "application sociale"

#### Anglais
- `speedDatingDesc`: "Fast video dating" → "Fast video connections"
- `itsAMatch`: "It's a match!" → "It's a vibe!"
- `youAndMatch`: "You and {name} liked each other" → "You and {name} vibed together"
- `pushDescription`: "Receive alerts for matches, messages and activities" → "Receive alerts for vibes, messages and activities"
- `visibleToMatches`: "Visible to my matches only" → "Visible to my vibes only"
- `matchesOnly`: "My matches only" → "My vibes only"
- `newMatches`: "New matches" → "New vibes"
- `filterMatches`: "Filter matches" → "Filter vibes"
- `filterMatchesDesc`: "Matched profiles won't reappear" → "Vibed profiles won't reappear"
- `matchesCreated`: "Matches created" → "Vibes created"
- `priorityMatches`: "Priority matches" → "Priority vibes"
- `queueMatched`: "Queue - Matched" → "Queue - Vibed"
- `classification18Desc1`: Remplacer "dating app" par "social app"
- `connectedByInterests`: Remplacer "matched" par "connected"
- `startSwiping`: Remplacer "match" par "vibe"
- `peopleLikedYou`: Remplacer "match" par "vibe"

---

### 2. GameHub.tsx - Renommer "Speed Dating"

Ligne 32 :
```tsx
name: "Flash Connect",  // au lieu de "Speed Dating"
```

---

### 3. SpeedDatingGame.tsx

- Ligne 69 : Header title "Speed Dating" → "Flash Connect"
- Ligne 73 : Texte du span "Speed Dating" → "Flash Connect"
- Ligne 493 : Message d'attente "Le Speed Dating commencera..." → "Le Flash Connect commencera..."

---

### 4. MatchModal.tsx

Ce composant utilise `t.itsAMatch` et `t.youAndMatch` qui seront automatiquement traduits via le LanguageContext. Aucune modification du code nécessaire.

---

### 5. RoseRevealModal.tsx

- Ligne 320 : "Voulez-vous matcher avec..." → "Voulez-vous vibrer avec..."
- Ligne 339 : "Oui, matcher !" → "Oui, vibrer !"

---

### 6. RoseMessageModal.tsx

- Ligne 157 : "Matchez d'abord pour discuter" → "Vibez d'abord pour discuter"

---

### 7. SettingsSheet.tsx (Textes légaux)

- Ligne 239 : "dating preferences" → "connection preferences"
- Ligne 243 : "suggest relevant matches" → "suggest relevant connections"
- Lignes 329+ : "Dating Apps" → "Social Apps" dans les guidelines

---

### 8. AIConsentModal.tsx

- Ligne 94 : "Dating preferences" → "Connection preferences"

---

### 9. Privacy.tsx

- Remplacer "Speed Dating" par "Flash Connect" dans les descriptions des fonctionnalités IA

---

## Fichiers NON modifiables (système)

Les fichiers suivants contiennent des références aux tables de base de données et ne doivent PAS être modifiés :
- `src/integrations/supabase/types.ts` - Généré automatiquement
- Tables existantes comme `speed_dating_participants`, `speed_dating_sessions`, etc. restent inchangées côté backend

---

## Résumé des Modifications

| Fichier | Nombre de changements |
|---------|----------------------|
| LanguageContext.tsx | ~25 clés de traduction |
| GameHub.tsx | 1 changement |
| SpeedDatingGame.tsx | 3 changements |
| RoseRevealModal.tsx | 2 changements |
| RoseMessageModal.tsx | 1 changement |
| SettingsSheet.tsx | 3 changements |
| AIConsentModal.tsx | 1 changement |
| Privacy.tsx | 2 changements |

**Total : ~38 modifications** réparties sur 8 fichiers.

---

## Notes Importantes

1. **Tables de base de données** : Les noms des tables (`speed_dating_*`, `matches`) restent inchangés dans le backend car les renommer nécessiterait des migrations complexes et n'a aucun impact sur l'App Store.

2. **Hook useSpeedDating** : Le nom du hook reste inchangé (code interne) mais tous les textes visibles par l'utilisateur seront mis à jour.

3. **Cohérence de marque** : "Flash Connect" est cohérent avec le "Z Connect" existant, créant une famille de fonctionnalités "Connect".

