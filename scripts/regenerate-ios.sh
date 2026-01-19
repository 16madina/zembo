#!/bin/bash

# Script de régénération iOS pour Zembo
# Sauvegarde automatiquement les fichiers de configuration avant la régénération

set -e

echo "🍎 Régénération iOS pour Zembo"
echo "================================"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Répertoires
BACKUP_DIR="ios-backup-$(date +%Y%m%d_%H%M%S)"
IOS_DIR="ios"

# Fichiers à sauvegarder
FILES_TO_BACKUP=(
    "ios/App/App/AppDelegate.swift"
    "ios/App/App/Info.plist"
    "ios/App/App/GoogleService-Info.plist"
)

# Étape 1: Sauvegarde
echo -e "\n${YELLOW}📦 Étape 1: Sauvegarde des fichiers de configuration...${NC}"

if [ -d "$IOS_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    
    for file in "${FILES_TO_BACKUP[@]}"; do
        if [ -f "$file" ]; then
            # Créer la structure de répertoires dans le backup
            mkdir -p "$BACKUP_DIR/$(dirname "$file")"
            cp "$file" "$BACKUP_DIR/$file"
            echo -e "  ${GREEN}✓${NC} Sauvegardé: $file"
        else
            echo -e "  ${YELLOW}⚠${NC} Non trouvé: $file"
        fi
    done
    
    echo -e "${GREEN}✓ Sauvegarde créée dans: $BACKUP_DIR${NC}"
else
    echo -e "${YELLOW}⚠ Dossier ios non trouvé, pas de sauvegarde nécessaire${NC}"
fi

# Étape 2: Suppression du dossier iOS
echo -e "\n${YELLOW}🗑️  Étape 2: Suppression du dossier iOS...${NC}"
if [ -d "$IOS_DIR" ]; then
    rm -rf "$IOS_DIR"
    echo -e "${GREEN}✓ Dossier iOS supprimé${NC}"
else
    echo -e "${YELLOW}⚠ Dossier iOS déjà absent${NC}"
fi

# Étape 3: Régénération
echo -e "\n${YELLOW}🔧 Étape 3: Régénération du projet iOS...${NC}"
npx cap add ios
echo -e "${GREEN}✓ Projet iOS régénéré${NC}"

# Étape 4: Mise à jour des dépendances
echo -e "\n${YELLOW}📥 Étape 4: Mise à jour des dépendances iOS...${NC}"
npx cap update ios
echo -e "${GREEN}✓ Dépendances mises à jour${NC}"

# Étape 5: Restauration des fichiers
echo -e "\n${YELLOW}📂 Étape 5: Restauration des fichiers de configuration...${NC}"

if [ -d "$BACKUP_DIR" ]; then
    for file in "${FILES_TO_BACKUP[@]}"; do
        if [ -f "$BACKUP_DIR/$file" ]; then
            cp "$BACKUP_DIR/$file" "$file"
            echo -e "  ${GREEN}✓${NC} Restauré: $file"
        fi
    done
    echo -e "${GREEN}✓ Fichiers restaurés${NC}"
else
    echo -e "${YELLOW}⚠ Pas de backup à restaurer${NC}"
    echo -e "${YELLOW}  → Consultez docs/ios-configuration.md pour la configuration manuelle${NC}"
fi

# Étape 6: Build et sync
echo -e "\n${YELLOW}🏗️  Étape 6: Build et synchronisation...${NC}"
npm run build
npx cap sync ios
echo -e "${GREEN}✓ Build et sync terminés${NC}"

# Résumé
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✅ Régénération iOS terminée!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${YELLOW}⚠️  Actions manuelles requises dans Xcode:${NC}"
echo "  1. Ouvrir le projet: npx cap open ios"
echo "  2. Ajouter Firebase SDK via SPM:"
echo "     File → Add Package Dependencies"
echo "     URL: https://github.com/firebase/firebase-ios-sdk"
echo "     Sélectionner: FirebaseCore, FirebaseMessaging"
echo "  3. Ajouter AppIcon (1024x1024) dans Assets.xcassets"
echo "  4. Activer Capabilities:"
echo "     - Push Notifications"
echo "     - Background Modes (Remote notifications, Background fetch)"
echo ""
echo -e "📚 Référence complète: ${YELLOW}docs/ios-configuration.md${NC}"
echo ""

# Nettoyage optionnel
read -p "Supprimer le dossier de backup ($BACKUP_DIR)? [y/N] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf "$BACKUP_DIR"
    echo -e "${GREEN}✓ Backup supprimé${NC}"
else
    echo -e "${YELLOW}ℹ Backup conservé dans: $BACKUP_DIR${NC}"
fi
