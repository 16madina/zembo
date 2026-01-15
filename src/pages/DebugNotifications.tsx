import { useState, useEffect } from "react";
import { isNative, isIOS, isAndroid } from "@/lib/capacitor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Bell, RefreshCw, Send, Copy, CheckCircle, XCircle, AlertCircle, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DebugInfo {
  permission: string;
  fcmToken: string | null;
  apnsToken: string | null;
  deviceType: string;
  isNative: boolean;
  registeredInDb: boolean;
  lastError: string | null;
}

export default function DebugNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    permission: "unknown",
    fcmToken: null,
    apnsToken: null,
    deviceType: "unknown",
    isNative: false,
    registeredInDb: false,
    lastError: null,
  });
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50));
  };

  const checkPermission = async () => {
    if (!isNative) {
      addLog("❌ Not native platform");
      return "not_native";
    }

    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const result = await PushNotifications.checkPermissions();
      addLog(`🔐 Permission status: ${result.receive}`);
      return result.receive;
    } catch (error) {
      addLog(`❌ Permission check failed: ${error}`);
      return "error";
    }
  };

  const requestPermission = async () => {
    if (!isNative) {
      toast.error("Not a native app");
      return;
    }

    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      addLog("📝 Requesting permission...");
      const result = await PushNotifications.requestPermissions();
      addLog(`✅ Permission result: ${result.receive}`);
      setDebugInfo(prev => ({ ...prev, permission: result.receive }));
      toast.success(`Permission: ${result.receive}`);
    } catch (error) {
      addLog(`❌ Permission request failed: ${error}`);
      toast.error("Permission request failed");
    }
  };

  const registerForPush = async () => {
    if (!isNative) {
      toast.error("Not a native app");
      return;
    }

    setLoading(true);
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      
      // Remove old listeners
      await PushNotifications.removeAllListeners();
      addLog("🧹 Removed old listeners");

      // Setup new listeners
      PushNotifications.addListener("registration", (token) => {
        addLog(`🎉 FCM TOKEN RECEIVED: ${token.value}`);
        setDebugInfo(prev => ({ ...prev, fcmToken: token.value, lastError: null }));
        toast.success("Token received!");
        
        // Save to DB
        if (user) {
          saveTokenToDb(token.value);
        }
      });

      PushNotifications.addListener("registrationError", (error) => {
        const errorStr = JSON.stringify(error);
        addLog(`❌ REGISTRATION ERROR: ${errorStr}`);
        setDebugInfo(prev => ({ ...prev, lastError: errorStr }));
        toast.error("Registration error");
      });

      // Try to get APNS token (iOS only)
      if (isIOS) {
        addLog("📱 iOS detected - checking for APNS token...");
        // Note: Capacitor doesn't expose APNS token directly, only FCM token
        // The FCM token IS the APNS token on iOS when using Firebase
      }

      // Register
      addLog("📝 Calling register()...");
      await PushNotifications.register();
      addLog("✅ register() completed");

      // Fallback: check after delay
      setTimeout(async () => {
        if (!debugInfo.fcmToken) {
          addLog("⏰ Checking for token after 3s delay...");
          try {
            const delivered = await PushNotifications.getDeliveredNotifications();
            addLog(`📬 Delivered notifications check: ${delivered.notifications.length}`);
          } catch (e) {
            addLog(`⚠️ getDeliveredNotifications failed: ${e}`);
          }
        }
      }, 3000);

    } catch (error) {
      addLog(`💥 Registration error: ${error}`);
      setDebugInfo(prev => ({ ...prev, lastError: String(error) }));
      toast.error("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const saveTokenToDb = async (fcmToken: string) => {
    if (!user) {
      addLog("❌ Cannot save: user is null");
      toast.error("Utilisateur non connecté");
      return;
    }

    try {
      addLog("💾 Saving token to database...");
      addLog(`   User ID: ${user.id}`);
      addLog(`   Token: ${fcmToken.slice(0, 30)}...`);
      
      // Check if Supabase session is valid
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        addLog(`❌ Session error: ${sessionError.message}`);
        toast.error("Session invalide");
        return;
      }
      
      if (!sessionData.session) {
        addLog("❌ No active Supabase session!");
        addLog("   auth.uid() will be NULL - RLS will block INSERT");
        toast.error("Session Supabase expirée - reconnectez-vous");
        return;
      }
      
      addLog(`✅ Session active: ${sessionData.session.user.id.slice(0, 8)}...`);
      
      const deviceType = isIOS ? "ios" : isAndroid ? "android" : "unknown";
      const deviceName = `${deviceType.toUpperCase()} Device`;

      addLog(`   Device: ${deviceType} - ${deviceName}`);

      // First try a simple INSERT to see if it works
      const { data: insertData, error: insertError } = await supabase
        .from("user_devices")
        .insert({
          user_id: user.id,
          fcm_token: fcmToken,
          device_type: deviceType,
          device_name: deviceName,
          last_used_at: new Date().toISOString(),
        })
        .select();

      if (insertError) {
        addLog(`⚠️ INSERT error: ${insertError.message}`);
        addLog(`   Code: ${insertError.code}`);
        addLog(`   Details: ${insertError.details || 'none'}`);
        addLog(`   Hint: ${insertError.hint || 'none'}`);
        
        // If duplicate, try UPDATE instead
        if (insertError.code === '23505') {
          addLog("🔄 Token exists, trying UPDATE...");
          
          const { error: updateError } = await supabase
            .from("user_devices")
            .update({
              device_name: deviceName,
              last_used_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .eq("fcm_token", fcmToken);

          if (updateError) {
            addLog(`❌ UPDATE error: ${updateError.message}`);
            addLog(`   Code: ${updateError.code}`);
            toast.error(`Erreur update: ${updateError.message}`);
          } else {
            addLog("✅ Token updated successfully");
            setDebugInfo(prev => ({ ...prev, registeredInDb: true }));
            toast.success("Token mis à jour!");
          }
        } else {
          // RLS or other error
          addLog(`❌ RLS/Permission error detected`);
          toast.error(`Erreur RLS: ${insertError.message}`);
        }
      } else {
        addLog(`✅ Token inserted successfully`);
        addLog(`   Inserted data: ${JSON.stringify(insertData)}`);
        setDebugInfo(prev => ({ ...prev, registeredInDb: true }));
        toast.success("Token enregistré!");
      }
    } catch (e) {
      addLog(`💥 Exception: ${e}`);
      toast.error(`Exception: ${String(e)}`);
    }
  };

  const checkDbRegistration = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_devices")
        .select("fcm_token, device_type, last_used_at")
        .eq("user_id", user.id);

      if (error) {
        addLog(`❌ DB query error: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        addLog(`📱 Found ${data.length} registered device(s)`);
        data.forEach((device, i) => {
          addLog(`   Device ${i + 1}: ${device.device_type} - Token: ${device.fcm_token?.slice(0, 20)}...`);
        });
        setDebugInfo(prev => ({ 
          ...prev, 
          registeredInDb: true,
          fcmToken: prev.fcmToken || data[0].fcm_token 
        }));
      } else {
        addLog("⚠️ No devices registered for this user");
        setDebugInfo(prev => ({ ...prev, registeredInDb: false }));
      }
    } catch (e) {
      addLog(`💥 DB check error: ${e}`);
    }
  };

  const sendTestNotification = async () => {
    const tokenToUse = debugInfo.fcmToken;
    
    if (!tokenToUse) {
      toast.error("No FCM token available");
      return;
    }

    setTestLoading(true);
    addLog(`📤 Sending test notification to token: ${tokenToUse.slice(0, 20)}...`);

    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          token: tokenToUse,
          title: "🔔 Test Zembo Debug",
          body: `Test à ${new Date().toLocaleTimeString()} - Si tu vois ça, les notifications marchent!`,
          data: {
            type: "test",
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) {
        addLog(`❌ Edge function error: ${error.message}`);
        toast.error("Failed to send notification");
      } else {
        addLog(`✅ Notification sent! Response: ${JSON.stringify(data)}`);
        toast.success("Test notification sent!");
      }
    } catch (e) {
      addLog(`💥 Send error: ${e}`);
      toast.error("Failed to send notification");
    } finally {
      setTestLoading(false);
    }
  };

  const copyToken = async () => {
    if (debugInfo.fcmToken) {
      await navigator.clipboard.writeText(debugInfo.fcmToken);
      toast.success("Token copied!");
      addLog("📋 Token copied to clipboard");
    }
  };

  const runFullDiagnostic = async () => {
    setLoading(true);
    addLog("🔍 Starting full diagnostic...");

    // Check platform
    const deviceType = isIOS ? "ios" : isAndroid ? "android" : "web";
    setDebugInfo(prev => ({ ...prev, deviceType, isNative }));
    addLog(`📱 Platform: ${deviceType} (native: ${isNative})`);

    // Check permission
    const permission = await checkPermission();
    setDebugInfo(prev => ({ ...prev, permission }));

    // Check DB
    await checkDbRegistration();

    addLog("✅ Diagnostic complete");
    setLoading(false);
  };

  useEffect(() => {
    runFullDiagnostic();
  }, [user]);

  const StatusBadge = ({ status, label }: { status: boolean | string; label: string }) => {
    if (typeof status === "string") {
      const isGood = status === "granted" || status === "true";
      return (
        <div className="flex items-center justify-between py-2">
          <span className="text-muted-foreground">{label}</span>
          <Badge variant={isGood ? "default" : "destructive"} className="font-mono">
            {status}
          </Badge>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-muted-foreground">{label}</span>
        {status ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Debug Notifications</h1>
        </div>
      </div>

      {/* Status Card */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <StatusBadge status={debugInfo.isNative} label="Native App" />
          <StatusBadge status={debugInfo.deviceType} label="Device Type" />
          <StatusBadge status={debugInfo.permission} label="Permission" />
          <StatusBadge status={debugInfo.registeredInDb} label="Registered in DB" />
          <StatusBadge status={!!debugInfo.fcmToken} label="FCM Token" />
        </CardContent>
      </Card>

      {/* FCM Token Card */}
      {debugInfo.fcmToken && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm">FCM Token</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-2">
              <code className="text-xs bg-muted p-2 rounded flex-1 break-all max-h-24 overflow-auto">
                {debugInfo.fcmToken}
              </code>
              <Button variant="outline" size="icon" onClick={copyToken}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Card */}
      {debugInfo.lastError && (
        <Card className="mb-4 border-destructive">
          <CardHeader>
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Last Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-xs text-destructive break-all">
              {debugInfo.lastError}
            </code>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button 
          onClick={runFullDiagnostic} 
          disabled={loading}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button 
          onClick={requestPermission}
          variant="outline"
        >
          Request Permission
        </Button>
        <Button 
          onClick={registerForPush} 
          disabled={loading}
        >
          Register Push
        </Button>
        <Button 
          onClick={sendTestNotification} 
          disabled={testLoading || !debugInfo.fcmToken}
          className="flex items-center gap-2"
        >
          <Send className={`w-4 h-4 ${testLoading ? 'animate-pulse' : ''}`} />
          Send Test
        </Button>
      </div>

      {/* Manual Token Input */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">Manual Token Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full bg-muted p-2 rounded text-xs font-mono h-20"
            placeholder="Paste FCM token here for manual testing..."
            onChange={(e) => {
              if (e.target.value.length > 50) {
                setDebugInfo(prev => ({ ...prev, fcmToken: e.target.value.trim() }));
              }
            }}
            defaultValue={debugInfo.fcmToken || ""}
          />
          <Button 
            onClick={() => {
              if (debugInfo.fcmToken) {
                saveTokenToDb(debugInfo.fcmToken);
              } else {
                toast.error("Aucun token à enregistrer");
              }
            }}
            disabled={!debugInfo.fcmToken || !user}
            className="w-full"
            variant="secondary"
          >
            💾 Forcer l'enregistrement en base
          </Button>
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            Logs
            <Button variant="ghost" size="sm" onClick={() => setLogs([])}>
              Clear
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-black/80 rounded p-3 h-64 overflow-auto font-mono text-xs">
            {logs.length === 0 ? (
              <span className="text-muted-foreground">No logs yet...</span>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-green-400 mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Info */}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        User ID: {user?.id?.slice(0, 8) || "Not logged in"}...
      </div>
    </div>
  );
}
