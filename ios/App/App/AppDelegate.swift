import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure Firebase FIRST
        FirebaseApp.configure()
        
        // Set delegates
        Messaging.messaging().delegate = self
        UNUserNotificationCenter.current().delegate = self
        
        // Request notification permissions
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            print("[Firebase] Notification permission granted: \(granted)")
            if let error = error {
                print("[Firebase] Permission error: \(error)")
            }
        }
        
        // Register for remote notifications on main thread
        DispatchQueue.main.async {
            application.registerForRemoteNotifications()
        }
        
        return true
    }

    // MARK: - APNs Token
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken
        print("[Firebase] APNs token set")
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[Firebase] Failed to register for remote notifications: \(error)")
    }

    // MARK: - MessagingDelegate
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else { return }
        print("[Firebase] FCM Token received: \(token)")
        
        // Dispatch token to WebView after delay (WebView needs time to load)
        dispatchTokenToWebView(token: token, attempt: 1)
    }
    
    private func dispatchTokenToWebView(token: String, attempt: Int) {
        let maxAttempts = 5
        let delay = Double(attempt) * 2.0 // 2s, 4s, 6s, 8s, 10s
        
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self = self,
                  let rootVC = self.window?.rootViewController as? CAPBridgeViewController,
                  let webView = rootVC.bridge?.webView else {
                if attempt < maxAttempts {
                    print("[Firebase] WebView not ready, retrying... (attempt \(attempt + 1))")
                    self?.dispatchTokenToWebView(token: token, attempt: attempt + 1)
                } else {
                    print("[Firebase] ❌ Failed to dispatch token after \(maxAttempts) attempts")
                }
                return
            }
            
            let js = "window.dispatchEvent(new CustomEvent('fcmTokenReceived', { detail: { token: '\(token)' } }));"
            webView.evaluateJavaScript(js) { result, error in
                if let error = error {
                    print("[Firebase] Error dispatching token: \(error)")
                } else {
                    print("[Firebase] ✅ Token dispatched to WebView successfully")
                }
            }
        }
    }

    // MARK: - UNUserNotificationCenterDelegate
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .badge, .sound])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        completionHandler()
    }

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {}
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}
}
