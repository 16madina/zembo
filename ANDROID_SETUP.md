# Configuration Android pour Zembo

## Guide de configuration de la caméra WebView

Ce guide explique comment configurer correctement les permissions caméra pour la vérification faciale sur Android.

## Étapes d'installation

### 1. Générer le projet Android

```bash
npx cap add android
```

### 2. Configurer les permissions dans AndroidManifest.xml

Ouvrez `android/app/src/main/AndroidManifest.xml` et ajoutez ces permissions **avant** la balise `<application>` :

```xml
<!-- Permissions caméra et réseau -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Permissions stockage pour la galerie (Capacitor Camera plugin) -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

<!-- Déclarer les fonctionnalités caméra comme optionnelles -->
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.front" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

### 3. Configurer MainActivity.java pour la caméra WebView

Pour que `getUserMedia()` fonctionne dans la WebView, modifiez `android/app/src/main/java/com/zembo/app/MainActivity.java` :

```java
package com.zembo.app;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Autoriser les permissions caméra/micro dans la WebView
        getBridge().getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                runOnUiThread(() -> {
                    request.grant(request.getResources());
                });
            }
        });
    }
}
```

### 4. Synchroniser et tester

```bash
npm run build
npx cap sync android
npx cap run android
```

## Dépannage

### La caméra ne s'affiche pas

1. Vérifiez que les permissions sont bien dans AndroidManifest.xml
2. Vérifiez que MainActivity.java a été modifié correctement
3. Désinstallez l'app et réinstallez-la pour appliquer les nouvelles permissions

### Permission refusée

1. Allez dans Paramètres > Applications > Zembo > Permissions
2. Activez la permission Caméra
3. Redémarrez l'application

### Écran noir avec la caméra

Cela peut arriver sur certains appareils Android bas de gamme. L'application propose automatiquement une alternative avec la capture photo native.

## Architecture technique

L'application utilise deux méthodes pour la caméra :

1. **getUserMedia()** (WebView) - Pour la détection faciale en temps réel
2. **Capacitor Camera** (Native) - Fallback pour la capture photo si getUserMedia échoue

Cette approche hybride garantit la compatibilité avec tous les appareils Android.
