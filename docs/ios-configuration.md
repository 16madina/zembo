# Configuration iOS - Zembo

Ce fichier contient toute la configuration nécessaire pour le projet iOS après une régénération avec `npx cap add ios`.

## Étapes de régénération

```bash
# 1. Supprimer et régénérer le dossier iOS
rm -rf ios
npx cap add ios
npx cap sync ios

# 2. Ouvrir dans Xcode
npx cap open ios
```

## Configuration Firebase via SPM

1. Dans Xcode: **File → Add Package Dependencies**
2. URL: `https://github.com/firebase/firebase-ios-sdk`
3. Sélectionner uniquement:
   - `FirebaseCore`
   - `FirebaseMessaging`

## AppIcon

Créer un AppIcon 1024x1024 dans **Assets.xcassets → AppIcon**

## GoogleService-Info.plist

Copier le fichier `GoogleService-Info.plist` depuis la racine du projet vers `ios/App/App/` via Xcode (glisser-déposer).

---

## AppDelegate.swift

Remplacer le contenu de `ios/App/App/AppDelegate.swift` par:

```swift
import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    var window: UIWindow?
    private var tokenDispatchAttempts = 0
    private let maxTokenDispatchAttempts = 5

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Initialize Firebase
        FirebaseApp.configure()
        
        // Configure push notifications
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self
        
        // Register for remote notifications
        application.registerForRemoteNotifications()
        
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Push Notifications
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        print("APNS Token registered")
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register for remote notifications: \(error)")
    }

    // MARK: - MessagingDelegate
    
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("FCM Token received: \(token)")
        tokenDispatchAttempts = 0
        dispatchTokenToWebView(token: token)
    }
    
    private func dispatchTokenToWebView(token: String) {
        guard tokenDispatchAttempts < maxTokenDispatchAttempts else {
            print("Max token dispatch attempts reached")
            return
        }
        
        tokenDispatchAttempts += 1
        let delay = Double(tokenDispatchAttempts) * 2.0
        
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let bridge = (self?.window?.rootViewController as? CAPBridgeViewController)?.bridge else {
                print("Bridge not ready, retrying... (attempt \(self?.tokenDispatchAttempts ?? 0))")
                self?.dispatchTokenToWebView(token: token)
                return
            }
            
            let js = "window.dispatchEvent(new CustomEvent('fcmTokenReceived', { detail: { token: '\(token)' } }));"
            bridge.webView?.evaluateJavaScript(js) { _, error in
                if let error = error {
                    print("Error dispatching FCM token: \(error)")
                    self?.dispatchTokenToWebView(token: token)
                } else {
                    print("FCM token dispatched successfully")
                }
            }
        }
    }

    // MARK: - UNUserNotificationCenterDelegate
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .badge, .sound])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        print("Notification tapped: \(userInfo)")
        
        // Notify Capacitor
        NotificationCenter.default.post(name: NSNotification.Name("PushNotificationActionPerformed"), object: nil, userInfo: userInfo)
        
        completionHandler()
    }
}
```

---

## Info.plist - Permissions

Ajouter ces clés dans `ios/App/App/Info.plist` (à l'intérieur du `<dict>` principal):

```xml
<!-- Push Notifications Background Modes -->
<key>UIBackgroundModes</key>
<array>
    <string>fetch</string>
    <string>remote-notification</string>
</array>

<!-- Camera -->
<key>NSCameraUsageDescription</key>
<string>Zembo a besoin d'accéder à votre caméra pour les appels vidéo et la vérification d'identité.</string>

<!-- Microphone -->
<key>NSMicrophoneUsageDescription</key>
<string>Zembo a besoin d'accéder à votre microphone pour les appels audio et vidéo.</string>

<!-- Location -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Zembo utilise votre position pour afficher les profils à proximité.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Zembo utilise votre position pour afficher les profils à proximité.</string>

<!-- Photo Library -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Zembo a besoin d'accéder à vos photos pour votre profil.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Zembo peut enregistrer des photos dans votre galerie.</string>

<!-- Face ID -->
<key>NSFaceIDUsageDescription</key>
<string>Utilisez Face ID pour vous connecter rapidement et en toute sécurité.</string>

<!-- Contacts -->
<key>NSContactsUsageDescription</key>
<string>Zembo peut inviter vos amis depuis vos contacts.</string>

<!-- Bluetooth -->
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Zembo utilise le Bluetooth pour détecter les appareils à proximité.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Zembo utilise le Bluetooth pour détecter les appareils à proximité.</string>

<!-- Network Security -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

---

## Xcode Capabilities

Dans Xcode, aller dans **Signing & Capabilities** et ajouter:
- **Push Notifications**
- **Background Modes** → cocher "Remote notifications" et "Background fetch"

---

## Commandes finales

```bash
# Build et sync
npm run build
npx cap sync ios

# Lancer sur simulateur/device
npx cap run ios
```
