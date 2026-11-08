import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class FalconColors {
  static const ink = Color(0xFF1D1B24);
  static const muted = Color(0xFF6F6A7C);
  static const violet = Color(0xFF8B7CF6);
  static const blue = Color(0xFF6AA8F8);
  static const mint = Color(0xFF6ED3B2);
  static const peach = Color(0xFFF2B58A);
  static const danger = Color(0xFF9B2C2C);
  static const ok = Color(0xFF2F6B4F);
  static const bg1 = Color(0xFFE4DFF5);
  static const bg2 = Color(0xFFDCEAFB);
  static const bg3 = Color(0xFFDFF5EA);
  static const line = Color(0x9EFFFFFF);
  static const card = Color(0x6BFFFFFF);
  static const cardStrong = Color(0xB8FFFFFF);
}

String money(num? value) {
  final n = (value ?? 0).toDouble();
  return NumberFormat.currency(
    locale: 'en_AE',
    symbol: 'AED ',
    decimalDigits: 2,
  ).format(n);
}

String formatDate(dynamic value) {
  if (value == null) return '—';
  final d = DateTime.tryParse(value.toString());
  if (d == null) return value.toString();
  return DateFormat('dd MMM yyyy').format(d);
}

ThemeData buildFalconTheme(TextTheme textTheme) {
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: FalconColors.violet,
      brightness: Brightness.light,
    ),
    textTheme: textTheme.apply(
      bodyColor: FalconColors.ink,
      displayColor: FalconColors.ink,
    ),
    scaffoldBackgroundColor: Colors.transparent,
  );
}
