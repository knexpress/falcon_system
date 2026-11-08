import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../auth.dart';
import '../theme.dart';
import '../widgets/glass.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _user = TextEditingController();
  final _pass = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _user.dispose();
    _pass.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthStore>();
      final api = Api(auth);
      final user = await api.login(_user.text.trim(), _pass.text);
      await auth.setUser(user);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GlassBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Column(
                  children: [
                    Image.asset('assets/falcon_revive_emblem.png', height: 96),
                    const SizedBox(height: 12),
                    Text(
                      'Falcon Revive',
                      style:
                          Theme.of(context).textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: FalconColors.ink,
                              ),
                    ),
                  const Text(
                    'Workshop ERP mobile desk',
                    style: TextStyle(color: FalconColors.muted),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'All active team users can sign in. Screens follow your role permissions (owner vs staff).',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: FalconColors.muted, fontSize: 13),
                  ),
                  const SizedBox(height: 24),
                  GlassCard(
                    strong: true,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (_error != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xD9F5D9D9),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                _error!,
                                style: const TextStyle(
                                  color: FalconColors.danger,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],
                          TextField(
                            controller: _user,
                            keyboardType: TextInputType.emailAddress,
                            decoration:
                                glassFieldDecoration('Email / username'),
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _pass,
                            obscureText: true,
                            decoration: glassFieldDecoration('Password'),
                          ),
                          const SizedBox(height: 16),
                          FalconButton(
                            label: _busy ? 'Signing in…' : 'Sign in',
                            onPressed: _busy ? null : _submit,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
