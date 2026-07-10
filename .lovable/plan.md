# Restructuration ZEMBO — Live Social & Communauté

Objectif : repositionner l'app comme plateforme de **live social / networking** pour lever la Guideline 4.3 d'Apple. Retrait complet des signaux "dating app".

---

## 1. Navigation & écran d'accueil

**Bottom bar (`src/components/BottomNavigation.tsx`)** — nouvel ordre :
```
Live (E) | Découvrir (M) | Random (Z) | Messages (B) | Profil (O)
```
- Route par défaut `/` → composant `Live` (au lieu de `Connect`).
- `App.tsx` : réassigner les routes (`/` = Live, `/random` = Connect/ZGames, `/discover` = Home).
- Redirections : anciens liens `/` restent valides mais pointent Live.
- Bouton "Go Live" doré déjà présent, on le met encore plus en avant (taille + glow).

---

## 2. Suppression des mécaniques Tinder résiduelles

Recherche + suppression dans :
- `src/components/ProfileCard.tsx`, `ActionButtons.tsx` (boutons X / Flamme / Cœur / Undo) → **supprimer** ou ne plus importer.
- Toute logique de swipe restante dans `Home.tsx` ou composants liés (drag gestures, overlays LIKE/NOPE).
- `MatchModal.tsx` → renommer en `ConnectionModal.tsx`, texte "C'est un match !" → "Nouvelle connexion !".
- Page `Likes.tsx` renommée UI en **"Mes connexions"** (garder la route pour compat).

---

## 3. Découverte = grille de profils

Nouvelle page `Discover` (remplace / complète le feed Zvibes actuel) :
- Grille **2 colonnes mobile** / 3-4 desktop.
- Carte compacte : photo carrée arrondie, prénom + âge, badge "● En ligne" (vert), petite ligne localisation avec pin.
- Tap → ouvre `ProfileModal` complet (existant, allégé du CTA "Like").
- CTA dans le profil : **"Se connecter"** (au lieu de Like) → crée une entrée `likes` (renommé sémantiquement en "connection request"), notif "Nouvelle connexion !" si mutuel.

Le carrousel multi-photos est conservé **dans la vue profil détaillée**, pas dans la grille.

---

## 4. Nettoyage feed Zvibes (`FeedItem.tsx`)

- **Retirer** : badge "Je recherche...", indicateur compatibilité %, hashtags d'intérêts communs avec ✨.
- **Conserver** : carrousel multi-photos, photo, prénom, bio courte, bouton "Se connecter" + "Message".
- Le feed devient plus éditorial / social, moins "profil dating".

---

## 5. Flash Live (ex-Speed Dating / Flash Connect)

Fichiers : `SpeedDatingGame.tsx`, `useSpeedDating.ts`, `speed-dating-orchestrator` edge function, `GameHub.tsx`.

- Rename UI partout : **"Flash Live"** — "Sessions vidéo de groupe courtes pour rencontrer la communauté".
- Retirer l'écran de **votes** en fin de round + création de matchs mutuels.
- Remplacer par un simple bouton **"Se connecter"** pendant / après le round → envoie une demande de connexion (réutilise le flux `likes`).
- Tables DB conservées (`speed_dating_*`) — on ne renomme pas les tables (invisible côté UI), on adapte juste les labels et on désactive la logique de vote côté client.

---

## 6. Vocabulaire — remplacements globaux

| Avant | Après |
|---|---|
| Match / Matchs | Connexion / Connexions |
| Super Like / ZFlamme (dans contexte dating) | (retiré) |
| Speed Dating / Flash Connect | Flash Live |
| Rencontre / Dating | Communauté / Networking |
| "C'est un match !" | "Nouvelle connexion !" |
| "Mes matchs" | "Mes connexions" |
| "Likes reçus" | "Demandes de connexion" |

Fichiers impactés (non-exhaustif) : `LanguageContext.tsx` (FR + EN), `MatchModal`, `Likes.tsx`, `Messages.tsx`, `Subscriptions.tsx`, notifications edge functions (`notify-like` → texte "demande de connexion", `notify-match` → "nouvelle connexion").

---

## 7. Positionnement & branding

- Slogan : **"ZEMBO — Live, découvre et connecte-toi avec ta communauté"**
- `SplashScreen.tsx`, `WelcomeScreen.tsx`, `index.html` (title + meta description), `Subscriptions.tsx` header.
- Garder : fond sombre dégradé, logo couronne dorée, accent doré (aucun changement design system).

---

## Section technique (détails d'impl)

**Routes** (`src/App.tsx`) :
- `/` → `<Live />`
- `/discover` → nouvelle `<Discover />` grille (extraite de `Home`)
- `/random` → `<Connect />` (ex-`/`)
- `/messages`, `/profile`, `/live/:id` inchangés

**BottomNavigation** : réordonner `navItems`, path `/` = Live (icône E), `/discover` = M, `/random` = Z, etc. Garder les icônes E-M-Z-B-O (le mapping visuel Z-E-M-B-O est abandonné pour prioriser l'UX Live-first).

**Discover grid** : nouveau composant `ProfileGridCard.tsx`, réutilise `useProfilesWithDistance`. `Home.tsx` devient un simple wrapper qui rend `Discover` OU on remplace directement Home par la grille et on garde l'ancien feed en option "Zvibes" sous un toggle (à confirmer si nécessaire — par défaut, **on remplace** le feed par la grille pour coller à la demande "découverte via grille").

**FeedItem.tsx** : supprimer imports `Target`, `Sparkles` (pour compatibilité), le `useMemo` `compatibilityScore`, `commonInterests`, le state `myInterests`, la section `lookingForLabels` + rendu badges, le rendu hashtags communs.

**Flash Live** :
- `SpeedDatingGame.tsx` : renommer titre "Flash Live", retirer étape de vote (`VoteScreen` si existe), remplacer par bouton "Se connecter" qui appelle `supabase.from('likes').insert(...)`.
- `GameHub.tsx` : carte "Speed Dating" → titre "Flash Live", description "Sessions vidéo networking".
- Edge function `speed-dating-orchestrator` : ne pas toucher à la logique d'appairage; supprimer/désactiver la phase de création de `matches` à partir des votes.

**Notifications** (edge functions) :
- `notify-like/index.ts` : body "vous a envoyé une demande de connexion".
- `notify-match/index.ts` : body "Nouvelle connexion mutuelle !".

**MatchModal → ConnectionModal** : renommer fichier + tous les imports, textes FR/EN mis à jour.

**LanguageContext** : ajouter/modifier clés `connections`, `newConnection`, `connectRequest`, `flashLive`, retirer/masquer `match`, `superLike`, `speedDating`.

**Aucune migration DB requise** — on garde les tables (`likes`, `matches`, `speed_dating_*`) telles quelles, seule l'UI change. Les colonnes `looking_for` et `interests` restent en base (utilisables dans le profil détaillé) mais ne sont plus affichées comme signaux "dating" dans le feed.

**Hypothèses** :
- On garde la messagerie débloquée sur match mutuel (déjà le cas via table `matches`).
- Le bouton "Se connecter" réutilise la logique `likes` existante (pas de nouvelle table).
- On ne renomme pas les tables DB (risque cassure + invisible utilisateur).
- Le carrousel multi-photos reste dans `FeedItem` (feed conservé en secondaire) + dans `ProfileModal`.

---

## Ordre d'exécution proposé

1. Routes + BottomNavigation (Live devient home)
2. Nouvelle grille Discover + retrait ActionButtons/swipe résiduels
3. Nettoyage FeedItem (badges dating)
4. Rename MatchModal → ConnectionModal + vocabulaire global (LanguageContext)
5. Flash Live (SpeedDatingGame + GameHub)
6. Notifs edge functions
7. Splash / Welcome / meta slogan
