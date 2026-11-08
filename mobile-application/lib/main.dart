import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'api.dart';
import 'auth.dart';
import 'background.dart';
import 'fcm.dart';
import 'notifications.dart';
import 'shell.dart';
import 'theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initLocalNotifications();
  await initFirebaseMessaging();
  await initBackgroundService();

  final auth = AuthStore();
  await auth.load();

  auth.addListener(() {
    _syncBackgroundWithAuth(auth);
  });
  await _syncBackgroundWithAuth(auth);

  runApp(FalconReviveApp(auth: auth));
}

Future<void> _syncBackgroundWithAuth(AuthStore auth) async {
  final user = auth.user;
  if (user == null) {
    await stopSilentBackground();
    return;
  }
  try {
    await enablePushAndBackground();
    await Api(auth).registerDevice(
      token: 'local-bg-${user.username}',
      platform: 'android-background',
    );
    await registerFcmToken(auth);
  } catch (_) {
    // Background still starts even if device register fails (API down).
    await enablePushAndBackground();
  }
}

class FalconReviveApp extends StatelessWidget {
  const FalconReviveApp({super.key, required this.auth});
  final AuthStore auth;

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.outfitTextTheme();
    return ChangeNotifierProvider.value(
      value: auth,
      child: MaterialApp(
        title: 'Falcon Revive',
        debugShowCheckedModeBanner: false,
        theme: buildFalconTheme(textTheme),
        home: const FalconAppRoot(),
      ),
    );
  }
}
