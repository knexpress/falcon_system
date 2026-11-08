import 'dart:async';
import 'dart:convert';
import 'dart:ui';
import 'package:flutter/widgets.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'api.dart';
import 'notifications.dart';

const _seenAlertsKey = 'falcon_seen_alert_ids';
const _pollSeconds = 90;

Future<void> initBackgroundService() async {
  final service = FlutterBackgroundService();
  await service.configure(
    androidConfiguration: AndroidConfiguration(
      onStart: onBackgroundStart,
      autoStart: false,
      autoStartOnBoot: true,
      isForegroundMode: true,
      notificationChannelId: 'falcon_bg',
      initialNotificationTitle: 'Falcon Revive',
      initialNotificationContent: 'Watching workshop updates quietly',
      foregroundServiceNotificationId: 1101,
      foregroundServiceTypes: [AndroidForegroundType.dataSync],
    ),
    iosConfiguration: IosConfiguration(
      autoStart: false,
      onForeground: onBackgroundStart,
      onBackground: onIosBackground,
    ),
  );
}

Future<void> startSilentBackground() async {
  final service = FlutterBackgroundService();
  final running = await service.isRunning();
  if (!running) {
    await service.startService();
  } else {
    service.invoke('refresh');
  }
}

Future<void> stopSilentBackground() async {
  final service = FlutterBackgroundService();
  final running = await service.isRunning();
  if (running) {
    service.invoke('stop');
  }
}

@pragma('vm:entry-point')
Future<bool> onIosBackground(ServiceInstance service) async {
  WidgetsFlutterBinding.ensureInitialized();
  DartPluginRegistrant.ensureInitialized();
  await _pollAlertsOnce();
  return true;
}

@pragma('vm:entry-point')
void onBackgroundStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  WidgetsFlutterBinding.ensureInitialized();
  await initLocalNotifications();

  if (service is AndroidServiceInstance) {
    await service.setAsForegroundService();
    service.on('setAsForeground').listen((_) {
      service.setAsForegroundService();
    });
    service.on('setAsBackground').listen((_) {
      service.setAsBackgroundService();
    });
  }

  service.on('stop').listen((_) async {
    await service.stopSelf();
  });
  service.on('refresh').listen((_) async {
    await _pollAlertsOnce();
  });

  Timer.periodic(const Duration(seconds: _pollSeconds), (_) async {
    if (service is AndroidServiceInstance) {
      if (await service.isForegroundService()) {
        service.setForegroundNotificationInfo(
          title: 'Falcon Revive',
          content: 'Watching workshop updates quietly',
        );
      }
    }
    await _pollAlertsOnce();
  });

  await _pollAlertsOnce();
}

Future<void> _pollAlertsOnce() async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('falcon_auth');
    if (raw == null) return;
    final user = jsonDecode(raw) as Map<String, dynamic>;
    final username = (user['username'] ?? '').toString();
    final name = (user['name'] ?? '').toString();
    final role = (user['role'] ?? '').toString();
    if (username.isEmpty) return;

    final uri = Uri.parse(
      '${kApiBase.replaceAll(RegExp(r'/$'), '')}/api/devices/alerts?unread=1',
    );
    final res = await http.get(uri, headers: {
      'Content-Type': 'application/json',
      'X-Falcon-User': username,
      'X-Falcon-Name': name,
      'X-Falcon-Role': role,
    }).timeout(const Duration(seconds: 20));
    if (res.statusCode < 200 || res.statusCode >= 300) return;

    final list = jsonDecode(res.body);
    if (list is! List) return;

    final seen = prefs.getStringList(_seenAlertsKey)?.toSet() ?? <String>{};
    for (final rawAlert in list) {
      final alert = Map<String, dynamic>.from(rawAlert as Map);
      final id = alert['id']?.toString() ?? '';
      if (id.isEmpty || seen.contains(id)) continue;
      seen.add(id);
      await showFalconAlert(
        id: int.tryParse(id) ?? id.hashCode,
        title: (alert['title'] ?? 'Falcon Revive').toString(),
        body: (alert['body'] ?? '').toString(),
      );
      // Mark read so we don't keep re-notifying across devices of same user
      final markUri = Uri.parse(
        '${kApiBase.replaceAll(RegExp(r'/$'), '')}/api/devices/alerts/$id/read',
      );
      await http.post(markUri, headers: {
        'Content-Type': 'application/json',
        'X-Falcon-User': username,
        'X-Falcon-Name': name,
        'X-Falcon-Role': role,
      }).timeout(const Duration(seconds: 10));
    }
    await prefs.setStringList(_seenAlertsKey, seen.toList());
  } catch (_) {
    // Keep service alive even if one poll fails (API down, offline, etc.)
  }
}

/// Call from UI isolate after login so permission + service start together.
Future<void> enablePushAndBackground() async {
  await requestNotificationPermission();
  await initLocalNotifications();
  await startSilentBackground();
}
