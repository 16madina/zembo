# Mise en conformité Apple Guideline 1.2 — Salons + Modération

Refonte majeure pour retirer tout appairage aléatoire 1‑à‑1 (interdit par Apple) et le remplacer par des **Salons** de groupe thématiques, plus un système de signalement/blocage universel.

## 1. Suppression du matching aléatoire 1‑à‑1

**Retirer de l'app :**
- Onglet "Random" de la bottom bar + page `src/pages/Connect.tsx`
- Composants Z‑Connect (matching aléatoire audio/vidéo) : dossier `src/components/zconnect/*`, `src/components/random/*`, hooks `useRandomCall`, `useZConnectLiveKit`, `useDailyRandomCalls`
- Hub des jeux (`GameHub`) : retirer Z‑Connect, Oracle (AI match finder), et l'ancien Speed Dating
- Route `/random` supprimée
- Edge functions `cleanup-random-calls` (schedule off) et tables `random_call_*` → migration qui **supprime** ces tables (elles ne peuvent plus être utilisées)

**Flash Live :** l'ancien "Speed Dating" est fusionné dans les Salons — pas de round 1‑à‑1 aléatoire, c'est une room de groupe classique.

## 2. Nouveaux "Salons" de groupe (remplace Random)

**Concept :** salons audio/vidéo publics par thème (Musique, Business, Débats, Chill, Culture, Sport, Autre), style Clubhouse / Paltalk. L'utilisateur voit la liste et choisit — **jamais** d'appairage automatique.

**Nouvelles tables Supabase :**
- `rooms(id, host_id, title, theme, mode 'audio'|'video', livekit_room, is_active, participant_count, created_at)`
- `room_participants(id, room_id, user_id, role 'host'|'moderator'|'participant', joined_at, is_active)`

RLS + GRANTS + policies (host peut expulser, tout le monde peut voir salons actifs et non‑bloqués).

**Nouvelles pages / composants :**
- `src/pages/Rooms.tsx` — grille de salons actifs (titre, thème, avatars hôte + participants, count), filtres par thème, bouton "Créer un salon"
- `src/components/rooms/CreateRoomModal.tsx` — titre + thème + mode audio/vidéo
- `src/components/rooms/RoomCard.tsx` — carte de salon
- `src/pages/RoomView.tsx` — vue salon LiveKit (réutilise `useLiveKit`), liste participants, contrôles hôte (kick), bouton Signaler + Quitter
- Hook `useRooms.ts` pour list/create/join/leave

**Bottom bar mise à jour :** Live / Découvrir / **Salons** / Messages / Profil (`BottomNavigation.tsx` : remplacer l'entrée `/random` par `/rooms`, garder l'icône Z dorée).

## 3. Signaler + Bloquer partout

**Tables :**
- `reports(id, reporter_id, reported_user_id, content_type 'profile'|'live'|'room'|'message', content_id, reason, details, status 'pending'|'reviewed'|'actioned', created_at)`
- `blocks(id, blocker_id, blocked_id, created_at)` — remplace/complète `blocked_users` existant (on garde la table existante `blocked_users` pour compat, on branche seulement la nouvelle logique dessus)

**Composants réutilisables :**
- `src/components/moderation/ReportModal.tsx` — motifs (Contenu inapproprié, Harcèlement, Spam, Autre) + champ libre
- `src/components/moderation/BlockButton.tsx`
- `src/components/moderation/ModerationMenu.tsx` — menu 3‑points (`createPortal`, `z-[10000]`) branché partout : `ProfileModal`, `LiveRoom`, `RoomView`, chaque bulle de message dans `ChatView`

**Filtrage bloqués (immédiat) :**
- `useProfilesWithDistance` : exclure `blockedUserIds`
- `useChatMessages` / listing conversations : exclure messages d'utilisateurs bloqués
- Listing lives et salons : exclure ceux hébergés par un bloqué, masquer participants bloqués
- **Blocage crée automatiquement un `report` avec reason `blocked_by_user`**

**Admin :** ajouter onglet "Signalements" dans `Admin.tsx` (table simple : reporter, cible, type, motif, action mark as reviewed).

## 4. Aucun chat anonyme

- Vérifier tous les points d'entrée (messages, salons, lives) : afficher prénom + photo obligatoires
- L'onboarding est déjà obligatoire avant tout accès (routes `ProtectedRoute`) — vérifier qu'aucun mode invité n'existe dans salons/lives et forcer profil complet (display_name + au moins 1 photo) avant `create/join`

## 5. Nettoyage vocabulaire + métadonnées

- Retirer "Random", "aléatoire", "roulette", "anonyme", "strangers", "stranger" de :
  - `LanguageContext.tsx` (FR + EN)
  - `index.html` (title, meta description, og:title, og:description)
  - Onboarding, tooltips, notifications, edge functions user‑facing
- Nouveau title/desc : "ZEMBO — Live, découvre et connecte‑toi avec ta communauté"
- Traductions ajoutées : `rooms`, `createRoom`, `joinRoom`, `reportUser`, `blockUser`, `roomTheme*`, etc.

## Détails techniques

- **LiveKit :** salons réutilisent `livekit-token` edge function et `useLiveKit` hook. Nom de room `room_<uuid>`.
- **Kick :** `useRooms.kickParticipant()` met `is_active=false` dans `room_participants` + émet un signal LiveKit `participant_kicked` que le client cible écoute pour se déconnecter.
- **Realtime :** `rooms` + `room_participants` ajoutés à `supabase_realtime` publication pour list/count live.
- **Migration :** DROP des tables `random_call_queue`, `random_call_sessions`, `daily_random_calls` et de leurs fonctions (`random_call_*`, `zconnect_find_interest_match`, `find_random_call_match`) après suppression du code qui les utilise.
- **Config :** retirer le schedule de `cleanup-random-calls` dans `supabase/config.toml`, supprimer l'edge function.
- **Speed dating :** on garde les tables `speed_dating_*` pour ne pas casser mais on retire l'accès UI ; migration ultérieure possible.

## Ce qui reste inchangé

- Design (fond sombre, logo couronne dorée, primary gold)
- Lives 1‑à‑N (streamer → viewers) : autorisés car pas d'appairage aléatoire
- Messagerie 1‑à‑1 après connexion mutuelle (like/like)
- Découvrir en grille, jeux non‑matchmaking (Compatibilité solo)
