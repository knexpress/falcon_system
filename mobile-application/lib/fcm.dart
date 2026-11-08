import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'api.dart';
import 'auth.dart';
import 'notifications.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  final title = message.notification?.title ??
      message.data['title']?.toString() ??
      'Falcon Revive';
  final body = message.notification?.body ??
      message.data['body']?.toString() ??
      'New workshop update';
  final id = int.tryParse(message.messageId?.hashCode.toString() ?? '') ??
      DateTime.now().millisecondsSinceEpoch.remainder(100000);
  await initLocalNotifications();
  await showFalconAlert(id: id, title: title, body: body);
}

Future<bool> initFirebaseMessaging() async {
  try {
    await Firebase.initializeApp();
    FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

    final messaging = FirebaseMessaging.instance;
    await messaging.requestPermission(alert: true, badge: true, sound: true);

    FirebaseMessaging.onMessage.listen((message) async {
      final title = message.notification?.title ??
          message.data['title']?.toString() ??
          'Falcon Revive';
      final body = message.notification?.body ??
          message.data['body']?.toString() ??
          'New workshop update';
      await showFalconAlert(
        id: DateTime.now().millisecondsSinceEpoch.remainder(100000),
        title: title,
        body: body,
      );
    });

    return true;
  } catch (e) {
    debugPrint('Firebase init skipped: $e');
    return false;
  }
}

Future<String?> registerFcmToken(AuthStore auth) async {
  if (auth.user == null) return null;
  try {
    final token = await FirebaseMessaging.instance.getToken();
    if (token == null || token.isEmpty) return null;
    await Api(auth).registerDevice(token: token, platform: 'android-fcm');
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
      Api(auth).registerDevice(token: newToken, platform: 'android-fcm');
    });
    return token;
  } catch (e) {
    debugPrint('FCM token register failed: $e');
    return null;
  }
}
