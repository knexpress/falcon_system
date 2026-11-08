import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class FalconUser {
  FalconUser({
    required this.id,
    required this.name,
    required this.username,
    required this.role,
    this.avatarUrl,
  });

  final dynamic id;
  final String name;
  final String username;
  final String role;
  final String? avatarUrl;

  bool get isOwner => role.toLowerCase() == 'owner';
  bool get isStaff => role.toLowerCase() == 'staff';

  factory FalconUser.fromJson(Map<String, dynamic> json) => FalconUser(
        id: json['id'],
        name: (json['name'] ?? '').toString(),
        username: (json['username'] ?? json['email'] ?? '').toString(),
        role: (json['role'] ?? 'staff').toString(),
        avatarUrl: json['avatar_url']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'username': username,
        'role': role,
        'avatar_url': avatarUrl,
      };
}

class AuthStore extends ChangeNotifier {
  FalconUser? user;
  bool ready = false;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('falcon_auth');
    if (raw != null) {
      try {
        user = FalconUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
      } catch (_) {
        user = null;
      }
    }
    ready = true;
    notifyListeners();
  }

  Future<void> setUser(Map<String, dynamic> json) async {
    user = FalconUser.fromJson(json);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('falcon_auth', jsonEncode(user!.toJson()));
    notifyListeners();
  }

  Future<void> clear() async {
    user = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('falcon_auth');
    notifyListeners();
  }
}

class NavItem {
  const NavItem(this.key, this.label, this.roles);
  final String key;
  final String label;
  final List<String> roles;
}

const navItems = <NavItem>[
  NavItem('Dashboard', 'Home', ['owner', 'staff']),
  NavItem('Approvals', 'Approvals', ['owner']),
  NavItem('Quotations', 'Quotes', ['staff']),
  NavItem('Invoices', 'Invoices', ['staff']),
  NavItem('Vehicles', 'Vehicles', ['owner', 'staff']),
  NavItem('Inventory', 'Stock', ['owner', 'staff']),
  NavItem('Customers', 'Clients', ['owner', 'staff']),
  NavItem('Sales', 'Sales', ['staff']),
  NavItem('Expenses', 'Expenses', ['staff']),
  NavItem('Journal', 'Journal', ['staff']),
  NavItem('Profile', 'Profile', ['owner', 'staff']),
];

List<NavItem> visibleNav(String? role) {
  final r = (role ?? 'staff').toLowerCase();
  return navItems.where((n) => n.roles.contains(r)).toList();
}
