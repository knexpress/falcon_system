import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';

const _alertChannelId = 'falcon_alerts';
const _bgChannelId = 'falcon_bg';

final FlutterLocalNotificationsPlugin localNotifications =
    FlutterLocalNotificationsPlugin();

Future<void> initLocalNotifications() async {
  const android = AndroidInitializationSettings('@mipmap/ic_launcher');
  const ios = DarwinInitializationSettings();
  await localNotifications.initialize(
    const InitializationSettings(android: android, iOS: ios),
  );

  final androidPlugin = localNotifications.resolvePlatformSpecificImplementation<
      AndroidFlutterLocalNotificationsPlugin>();
  await androidPlugin?.createNotificationChannel(
    const AndroidNotificationChannel(
      _alertChannelId,
      'Falcon alerts',
      description: 'Approvals and quotation updates',
      importance: Importance.high,
    ),
  );
  await androidPlugin?.createNotificationChannel(
    const AndroidNotificationChannel(
      _bgChannelId,
      'Falcon background',
      description: 'Quiet indicator while Falcon Revive watches for updates',
      importance: Importance.low,
      playSound: false,
      enableVibration: false,
      showBadge: false,
    ),
  );
}

Future<void> requestNotificationPermission() async {
  final status = await Permission.notification.status;
  if (!status.isGranted) {
    await Permission.notification.request();
  }
}

Future<void> showFalconAlert({
  required int id,
  required String title,
  required String body,
}) async {
  const details = NotificationDetails(
    android: AndroidNotificationDetails(
      _alertChannelId,
      'Falcon alerts',
      channelDescription: 'Approvals and quotation updates',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    ),
    iOS: DarwinNotificationDetails(),
  );
  await localNotifications.show(id, title, body, details);
}
