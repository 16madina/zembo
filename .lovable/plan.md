
# Agrandissement de l'icône ZFlamme 🔥

## Analyse du problème
L'icône Flame avec `fill="currentColor"` paraît visuellement plus petite que les autres icônes (Heart et X) car la forme de la flamme occupe moins d'espace visuel à taille égale.

## Solution proposée
Agrandir l'icône ZFlamme et son bouton pour qu'elle soit visuellement équivalente aux autres boutons d'action.

## Modifications à apporter

### Fichier: `src/components/ActionButtons.tsx`

| Élément | Avant | Après |
|---------|-------|-------|
| Padding du bouton ZFlamme | `p-4` | `p-5` |
| Taille de l'icône Flame | `w-6 h-6` | `w-7 h-7` |

Cette modification rendra le bouton ZFlamme légèrement plus grand que les boutons Pass et Like, compensant ainsi l'impression visuelle de petitesse de l'icône flamme.

## Comparaison des tailles finales

| Bouton | Padding | Taille icône |
|--------|---------|--------------|
| Pass (X) | p-4 | w-6 h-6 |
| **ZFlamme 🔥** | **p-5** | **w-7 h-7** |
| Like (Heart) | p-4 | w-6 h-6 |

Le bouton ZFlamme sera ainsi mis en avant comme action spéciale, ce qui est cohérent avec sa nature premium.
