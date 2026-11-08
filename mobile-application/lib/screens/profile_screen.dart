import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../auth.dart';
import '../theme.dart';
import '../widgets/glass.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late final TextEditingController _name;
  late final TextEditingController _email;
  final _current = TextEditingController();
  final _password = TextEditingController();
  String? _avatarUrl;
  String? _error;
  String? _saved;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthStore>().user;
    _name = TextEditingController(text: user?.name ?? '');
    _email = TextEditingController(text: user?.username ?? '');
    _avatarUrl = user?.avatarUrl;
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _current.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _pickPhoto() async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 85,
    );
    if (file == null) return;
    final bytes = await file.readAsBytes();
    final b64 = base64Encode(bytes);
    setState(() {
      _avatarUrl = 'data:image/jpeg;base64,$b64';
      _error = null;
    });
  }

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _error = null;
      _saved = null;
    });
    try {
      final auth = context.read<AuthStore>();
      final body = <String, dynamic>{
        'name': _name.text.trim(),
        'username': _email.text.trim().toLowerCase(),
        'avatar_url': _avatarUrl,
      };
      if (_password.text.isNotEmpty) {
        body['password'] = _password.text;
        body['current_password'] = _current.text;
      }
      final updated = await Api(auth).updateProfile(body);
      await auth.setUser(updated);
      if (!mounted) return;
      setState(() {
        _saved = 'Profile updated.';
        _password.clear();
        _current.clear();
        _avatarUrl = updated['avatar_url']?.toString();
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  ImageProvider? _avatarImage(String? url) {
    if (url == null || url.isEmpty) return null;
    if (url.startsWith('data:')) {
      try {
        return MemoryImage(base64Decode(url.split(',').last));
      } catch (_) {
        return null;
      }
    }
    return NetworkImage(url);
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: [
        Text('Profile',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                )),
        const Text('Name, email, photo, and password',
            style: TextStyle(color: FalconColors.muted)),
        if (_error != null) ...[
          const SizedBox(height: 10),
          Text(_error!, style: const TextStyle(color: FalconColors.danger)),
        ],
        if (_saved != null) ...[
          const SizedBox(height: 10),
          Text(_saved!, style: const TextStyle(color: FalconColors.ok)),
        ],
        const SizedBox(height: 12),
        GlassCard(
          strong: true,
          child: Column(
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 36,
                    backgroundColor: FalconColors.violet,
                    backgroundImage: _avatarImage(_avatarUrl),
                    child: _avatarUrl == null || _avatarUrl!.isEmpty
                        ? Text(
                            (_name.text.isNotEmpty
                                    ? _name.text[0]
                                    : 'F')
                                .toUpperCase(),
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 24),
                          )
                        : null,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      children: [
                        FalconButton(
                          label: 'Change photo',
                          ghost: true,
                          onPressed: _pickPhoto,
                        ),
                        if (_avatarUrl != null) ...[
                          const SizedBox(height: 8),
                          FalconButton(
                            label: 'Remove',
                            ghost: true,
                            onPressed: () =>
                                setState(() => _avatarUrl = null),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _name,
                decoration: glassFieldDecoration('Display name'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: glassFieldDecoration('Email / username'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _current,
                obscureText: true,
                decoration: glassFieldDecoration('Current password'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                obscureText: true,
                decoration: glassFieldDecoration('New password'),
              ),
              const SizedBox(height: 16),
              FalconButton(
                label: _busy ? 'Saving…' : 'Save profile',
                onPressed: _busy ? null : _save,
              ),
              const SizedBox(height: 10),
              FalconButton(
                label: 'Log out',
                danger: true,
                onPressed: () => context.read<AuthStore>().clear(),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
